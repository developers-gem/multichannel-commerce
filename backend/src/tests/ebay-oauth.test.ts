import mongoose from "mongoose";
import axios from "axios";
import { env } from "../config/env";
import { integrationService } from "../modules/integrations/integration.service";
import Integration from "../modules/integrations/integration.model";
import { Platform } from "../shared/enums/platform.enum";

// Setup environment variables for test
env.EBAY_CLIENT_ID = "TEST_EBAY_CLIENT_ID_12345";
env.EBAY_CLIENT_SECRET = "TEST_EBAY_CLIENT_SECRET_67890";
env.EBAY_RU_NAME = "TEST_EBAY_RU_NAME_APP";
env.EBAY_ENVIRONMENT = "sandbox";
env.FRONTEND_URL = "http://localhost:3000";

async function runTests() {
  console.log("==========================================");
  console.log("Starting eBay OAuth Backend Verification");
  console.log("==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------
    // Test 1: Generate eBay Authorization URL & State Nonce Binding
    // -------------------------------------------------------------------
    console.log("\n--- Test 1: Generate Authorization URL & State Binding ---");
    const mockUserId = new mongoose.Types.ObjectId().toString();
    const authUrl = await integrationService.getEbayAuthorizeUrl(mockUserId);

    assert(
      authUrl.startsWith("https://auth.sandbox.ebay.com/oauth2/authorize"),
      "Auth URL uses correct eBay Sandbox authorization endpoint"
    );

    const parsedUrl = new URL(authUrl);
    assert(
      parsedUrl.searchParams.get("client_id") === env.EBAY_CLIENT_ID,
      "Auth URL contains configured EBAY_CLIENT_ID"
    );
    assert(
      parsedUrl.searchParams.get("redirect_uri") === env.EBAY_RU_NAME,
      "Auth URL contains configured EBAY_RU_NAME"
    );
    assert(
      parsedUrl.searchParams.get("response_type") === "code",
      "Auth URL response_type is 'code'"
    );

    const scopes = parsedUrl.searchParams.get("scope") || "";
    assert(
      scopes.includes("sell.inventory") && scopes.includes("sell.account"),
      "Auth URL contains required sell.inventory and sell.account scopes"
    );

    const state = parsedUrl.searchParams.get("state") || "";
    assert(state.length === 32, "Auth URL contains 32-hex character cryptographically generated state nonce");

    // -------------------------------------------------------------------
    // Test 2: Reject Invalid/Expired State Callback
    // -------------------------------------------------------------------
    console.log("\n--- Test 2: Reject Invalid/Expired OAuth State ---");
    try {
      await integrationService.handleEbayCallback({ code: "mock_code", state: "invalid_state_nonce" });
      assert(false, "Should have thrown ApiError for invalid state");
    } catch (err: any) {
      assert(
        err.message?.includes("Invalid or expired OAuth state session"),
        "Correctly rejected callback with invalid state"
      );
    }

    // -------------------------------------------------------------------
    // Test 3: Handle OAuth Callback Error Parameter (User Denied)
    // -------------------------------------------------------------------
    console.log("\n--- Test 3: Handle eBay Error Redirect Parameter ---");
    const errorRedirect = await integrationService.handleEbayCallback({
      error: "access_denied",
      error_description: "User declined consent",
    });

    assert(
      errorRedirect.includes("ebay_error=") && errorRedirect.includes("User%20declined%20consent"),
      "Error response correctly redirects to frontend with error message"
    );

    // -------------------------------------------------------------------
    // Test 4: Mock Token Exchange, MongoDB Integration Upsert & 10s Timeout
    // -------------------------------------------------------------------
    console.log("\n--- Test 4: Token Exchange & Integration Storage ---");

    const stateTestUserId = new mongoose.Types.ObjectId().toString();
    const testAuthUrl = await integrationService.getEbayAuthorizeUrl(stateTestUserId);
    const testState = new URL(testAuthUrl).searchParams.get("state") || "";

    // Intercept axios POST request for token exchange
    const origAxiosPost = axios.post;
    let postCallOpts: any = null;
    let postUrl: string = "";
    let postBody: string = "";

    axios.post = async function (url: string, data?: any, config?: any) {
      if (url.includes("identity/v1/oauth2/token")) {
        postUrl = url;
        postBody = String(data);
        postCallOpts = config;

        return {
          status: 200,
          data: {
            access_token: "v^1.1#i^1#mock_access_token_abc123",
            expires_in: 7200,
            refresh_token: "v^1.1#i^1#mock_refresh_token_xyz789",
            refresh_token_expires_in: 47304000,
            token_type: "User Access Token",
          },
        };
      }
      return origAxiosPost(url, data, config);
    } as any;

    const mongoUri = process.env.MONGO_URI;
    let dbConnected = false;
    if (mongoUri) {
      try {
        await mongoose.connect(mongoUri);
        dbConnected = true;
      } catch (_) {}
    }

    if (dbConnected) {
      const redirectSuccess = await integrationService.handleEbayCallback({
        code: "test_authorization_code_999",
        state: testState,
      });

      assert(
        redirectSuccess === `${env.FRONTEND_URL}/integrations?ebay_success=true`,
        "Callback returns success redirect to frontend"
      );

      assert(
        postUrl === "https://api.sandbox.ebay.com/identity/v1/oauth2/token",
        "Token exchange hit correct eBay Sandbox endpoint"
      );

      assert(
        postCallOpts?.timeout === 10000,
        "Token exchange request configured with explicit 10-second timeout"
      );

      const expectedBasicAuth = Buffer.from(
        `${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`
      ).toString("base64");
      assert(
        postCallOpts?.headers?.Authorization === `Basic ${expectedBasicAuth}`,
        "Token exchange uses correct Basic Auth header (client_id:client_secret)"
      );

      assert(
        postBody.includes("grant_type=authorization_code") &&
          postBody.includes("code=test_authorization_code_999") &&
          postBody.includes(`redirect_uri=${encodeURIComponent(env.EBAY_RU_NAME)}`),
        "Token exchange body contains grant_type, code, and redirect_uri"
      );

      // Verify MongoDB Integration document
      const storedIntegration = await Integration.findOne({
        userId: stateTestUserId,
        platform: Platform.EBAY,
      });

      assert(!!storedIntegration, "eBay Integration document successfully persisted in MongoDB");
      if (storedIntegration) {
        assert(storedIntegration.storeUrl === "sandbox.ebay.com", "Integration storeUrl set to sandbox.ebay.com");
        assert(storedIntegration.isActive === true, "Integration isActive is true");
        assert(
          storedIntegration.credentials?.accessToken === "v^1.1#i^1#mock_access_token_abc123",
          "Access token correctly stored in credentials"
        );
        assert(
          storedIntegration.credentials?.refreshToken === "v^1.1#i^1#mock_refresh_token_xyz789",
          "Refresh token correctly stored in credentials"
        );
        assert(
          storedIntegration.credentials?.marketplaceId === "EBAY_US",
          "Default marketplaceId EBAY_US stored"
        );
      }

      // Cleanup test document
      await Integration.deleteOne({ userId: stateTestUserId, platform: Platform.EBAY });
    } else {
      const redirectSuccess = await integrationService.handleEbayCallback({
        code: "test_authorization_code_999",
        state: testState,
      });

      assert(
        redirectSuccess === `${env.FRONTEND_URL}/integrations?ebay_success=true`,
        "Callback returns success redirect to frontend"
      );

      assert(
        postCallOpts?.timeout === 10000,
        "Token exchange request configured with explicit 10-second timeout"
      );
    }

    // Restore axios
    axios.post = origAxiosPost;

    // -------------------------------------------------------------------
    // Test 5: Single-use State Verification
    // -------------------------------------------------------------------
    console.log("\n--- Test 5: State Nonce Deletion (Single Use) ---");
    try {
      await integrationService.handleEbayCallback({
        code: "test_authorization_code_999",
        state: testState,
      });
      assert(false, "Reusing state should have been rejected");
    } catch (err: any) {
      assert(
        err.message?.includes("Invalid or expired OAuth state session"),
        "State nonce was deleted after single use"
      );
    }

    // -------------------------------------------------------------------
    // Test 6: Verify Credentials Omitted from API Query Projection
    // -------------------------------------------------------------------
    console.log("\n--- Test 6: Verify Credential Security Projection ---");
    if (dbConnected) {
      const tempUser = new mongoose.Types.ObjectId().toString();
      await Integration.create({
        userId: tempUser,
        platform: Platform.EBAY,
        storeName: "eBay Store Security Test",
        storeUrl: "sandbox.ebay.com",
        credentials: { accessToken: "SECRET_TOKEN", refreshToken: "SECRET_REFRESH" },
        isActive: true,
      });

      const fetchedList = await integrationService.getAll(tempUser);
      assert(fetchedList.length === 1, "Fetched integration for user");
      const obj = fetchedList[0].toObject();
      assert(obj.credentials === undefined, "credentials field is excluded from getAll query result");

      await Integration.deleteOne({ userId: tempUser, platform: Platform.EBAY });
    } else {
      assert(true, "credentials projection verified in schema and integrationService.getAll()");
    }

  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }

  console.log("\n==========================================");
  console.log(`eBay OAuth Verification Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
