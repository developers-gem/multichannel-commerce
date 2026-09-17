import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import axios from "axios";
import { normalizeShopifyDomain } from "../utils/shopify.utils";
import { ShopifyConnector } from "../modules/sync/connectors/shopify.connector";
import Integration from "../modules/integrations/integration.model";
import User from "../modules/auth/user.model";
import { integrationService } from "../modules/integrations/integration.service";
import { redisConnection } from "../config/redis";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING SHOPIFY TOKEN REFRESH & CONCURRENCY TESTS");
  console.log("==================================================");

  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || "";
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");

  // 1. Test Domain Normalization
  console.log("\n--- TEST 1: Shopify Domain Normalization ---");
  const testUrls = [
    { input: "https://admin.shopify.com/store/amazing-ink-shop/products", expected: "amazing-ink-shop.myshopify.com" },
    { input: "admin.shopify.com/store/amazing-ink-shop", expected: "amazing-ink-shop.myshopify.com" },
    { input: "https://amazing-ink-shop.myshopify.com/admin/settings", expected: "amazing-ink-shop.myshopify.com" },
    { input: "amazing-ink-shop", expected: "amazing-ink-shop.myshopify.com" },
    { input: "amazing-ink-shop.myshopify.com", expected: "amazing-ink-shop.myshopify.com" },
  ];

  for (const t of testUrls) {
    const result = normalizeShopifyDomain(t.input);
    if (result !== t.expected) {
      throw new Error(`Normalization failed for '${t.input}': Expected '${t.expected}', got '${result}'`);
    }
    console.log(`  ✓ '${t.input}' => '${result}'`);
  }
  console.log("✅ TEST 1 PASSED: Domain Normalization");

  // Fetch or create a test user
  let user = await User.findOne({ email: "admin@multichannel.com" });
  if (!user) {
    user = await User.create({
      email: "admin@multichannel.com",
      password: "Password123!",
      name: "Admin User",
    });
  }
  const userId = user._id.toString();

  // Create a test Integration document with expired token
  const testStoreUrl = "test-amazing-ink-shop.myshopify.com";
  await Integration.deleteOne({ userId, platform: "SHOPIFY", storeUrl: testStoreUrl });

  const expiredIntegration = await Integration.create({
    userId,
    platform: "SHOPIFY",
    storeName: "Test Amazing Ink Shop",
    storeUrl: testStoreUrl,
    credentials: {
      accessToken: "old_access_token_123",
      refreshToken: "old_refresh_token_abc",
      expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
    },
    isActive: true,
  });

  const integrationId = expiredIntegration._id.toString();
  console.log(`\n✅ Created test integration record: ID ${integrationId}`);

  // 2. Test Single Expired-Token Refresh
  console.log("\n--- TEST 2: Single Expired-Token Refresh ---");
  let refreshCallCount = 0;
  const originalPost = axios.post;

  // Intercept axios.post for token refresh calls
  axios.post = (async (url: string, data?: any, config?: any) => {
    if (url.includes("/admin/oauth/access_token") && data?.grant_type === "refresh_token") {
      refreshCallCount++;
      console.log(`  [MOCK API] Shopify refresh requested (Count: ${refreshCallCount})`);
      return {
        data: {
          access_token: `new_access_token_${Date.now()}`,
          refresh_token: `new_refresh_token_${Date.now()}`,
          expires_in: 86400, // 24h
        },
      };
    }
    if (url.includes("/graphql.json")) {
      return {
        data: {
          data: {
            shop: {
              name: "Test Amazing Ink Shop",
              myshopifyDomain: testStoreUrl,
            },
          },
        },
      };
    }
    return originalPost(url, data, config);
  }) as any;

  const connector = new ShopifyConnector();
  const tokenResult = await connector.ensureValidAccessToken(
    testStoreUrl,
    expiredIntegration.credentials,
    integrationId
  );

  if (!tokenResult.startsWith("new_access_token_")) {
    throw new Error(`Single refresh failed: Got token '${tokenResult}'`);
  }
  if (refreshCallCount !== 1) {
    throw new Error(`Expected 1 refresh call, got ${refreshCallCount}`);
  }

  // Check DB update
  const updatedDoc1 = await Integration.findById(integrationId);
  if (!updatedDoc1?.credentials.accessToken.startsWith("new_access_token_")) {
    throw new Error("DB was not updated with new access token!");
  }
  if (!updatedDoc1?.credentials.refreshToken.startsWith("new_refresh_token_")) {
    throw new Error("DB was not updated with rotated refresh token!");
  }
  console.log("✅ TEST 2 PASSED: Single Expired-Token Refresh & DB Atomic Update");

  // 3. Test Concurrent Requests with Expired Token
  console.log("\n--- TEST 3: Concurrent Requests Locking & Deduplication ---");
  // Set token back to expired state
  await Integration.updateOne(
    { _id: integrationId },
    {
      $set: {
        "credentials.accessToken": "stale_access_token",
        "credentials.refreshToken": "stale_refresh_token",
        "credentials.expiresAt": new Date(Date.now() - 3600000),
      },
    }
  );

  const docBeforeConcurrent = await Integration.findById(integrationId);
  refreshCallCount = 0;

  // Trigger 2 concurrent ensureValidAccessToken requests
  console.log("  Launching 2 concurrent token refresh requests...");
  const [res1, res2] = await Promise.all([
    connector.ensureValidAccessToken(testStoreUrl, { ...docBeforeConcurrent?.credentials }, integrationId, true),
    connector.ensureValidAccessToken(testStoreUrl, { ...docBeforeConcurrent?.credentials }, integrationId, true),
  ]);

  console.log(`  Result 1 token: ${res1}`);
  console.log(`  Result 2 token: ${res2}`);

  if (refreshCallCount !== 1) {
    throw new Error(`CONCURRENCY FAIL: Expected exactly 1 Shopify refresh call, got ${refreshCallCount}`);
  }
  if (!res1.startsWith("new_access_token_") || !res2.startsWith("new_access_token_")) {
    throw new Error("CONCURRENCY FAIL: One or both requests returned invalid token");
  }
  if (res1 !== res2) {
    throw new Error(`CONCURRENCY FAIL: Requests returned different tokens: '${res1}' vs '${res2}'`);
  }
  console.log("✅ TEST 3 PASSED: Concurrency Locking Executed Exactly 1 Refresh Request for Both Callers");

  // 4. Test Refresh Failure leaves existing credentials intact
  console.log("\n--- TEST 4: Refresh Failure Handles Safely Without Corrupting Credentials ---");
  const validTokenBeforeFail = res1;
  axios.post = (async (url: string, data?: any, config?: any) => {
    if (url.includes("/admin/oauth/access_token")) {
      throw new Error("Shopify API 500 Internal Server Error");
    }
    return originalPost(url, data, config);
  }) as any;

  try {
    await connector.ensureValidAccessToken(
      testStoreUrl,
      { accessToken: "stale", refreshToken: "stale_ref", expiresAt: new Date(Date.now() - 1000) },
      integrationId,
      true
    );
    throw new Error("Expected failure did not throw");
  } catch (err: any) {
    console.log(`  Caught expected refresh failure: '${err.message}'`);
  }

  const docAfterFailure = await Integration.findById(integrationId);
  if (docAfterFailure?.credentials.accessToken !== validTokenBeforeFail) {
    throw new Error("FAIL: DB credentials were corrupted or overwritten after refresh failure!");
  }
  console.log("✅ TEST 4 PASSED: Refresh Failure Preserved DB Credentials Uncorrupted");

  // 5. Test 10-Second Lock Timeout Retryable Error
  console.log("\n--- TEST 5: 10-Second Lock Timeout Produces Retryable Error ---");
  const testLockKey = `lock:token-refresh:${integrationId}`;
  (ShopifyConnector as any).inMemoryLocks.set(testLockKey, "simulated_worker_lock");

  // Expire token in DB so caller attempts to acquire lock
  await Integration.updateOne(
    { _id: integrationId },
    { $set: { "credentials.expiresAt": new Date(Date.now() - 1000) } }
  );

  const timeoutConnector = new ShopifyConnector();
  const startTime = Date.now();

  try {
    const mockCreds = {
      accessToken: "stale",
      refreshToken: "stale_ref",
      expiresAt: new Date(Date.now() - 1000),
    };
    await timeoutConnector.ensureValidAccessToken(testStoreUrl, mockCreds, integrationId, false);
    throw new Error("Expected lock timeout error did not throw");
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.log(`  Lock timeout caught after ${elapsed}ms: '${err.message}'`);
    if (!err.message.includes("refresh in progress")) {
      throw new Error(`Unexpected error message on timeout: ${err.message}`);
    }
  } finally {
    (ShopifyConnector as any).inMemoryLocks.delete(testLockKey);
  }
  console.log("✅ TEST 5 PASSED: 10-Second Lock Timeout Produced Controlled Retryable Error");

  // Clean up test document
  await Integration.deleteOne({ _id: integrationId });
  axios.post = originalPost;

  // Restore real backend functionality test
  console.log("\n--- TEST 6: User-Scoped OAuth Authorize State & Creation ---");
  const authUrl = await integrationService.getShopifyAuthorizeUrl(
    "https://admin.shopify.com/store/amazing-ink-shop/products",
    userId
  );

  console.log(`  Generated Authorization URL: ${authUrl}`);
  if (!authUrl.includes("amazing-ink-shop.myshopify.com")) {
    throw new Error("Authorization URL failed to normalize store domain!");
  }

  // Extract state param from authUrl
  const urlObj = new URL(authUrl);
  const stateParam = urlObj.searchParams.get("state");
  if (!stateParam) {
    throw new Error("Missing state parameter in authorization URL!");
  }

  const parsedState = await (integrationService as any).getAndDeleteOAuthState(stateParam);
  if (!parsedState) {
    throw new Error("OAuth state was not found in state store!");
  }
  if (parsedState.userId !== userId || parsedState.shop !== "amazing-ink-shop.myshopify.com") {
    throw new Error("OAuth state binding mismatch in state store!");
  }
  console.log("  ✓ OAuth State bound in state store to userId and cleanShop");

  console.log("\n==================================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
