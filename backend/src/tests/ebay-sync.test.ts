import assert from "assert";
import axios from "axios";
import { EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalPost = axios.post;
  const originalGet = axios.get;
  const originalPut = axios.put;
  let refreshed = false;
  let inventoryUpdateSent = false;
  let bulkUpdateSent = false;

  (axios as any).post = async (url: string, body: any, config: any) => {
    if (url.includes("identity/v1/oauth2/token")) {
      refreshed = true;
      assert.strictEqual(String(body).includes("grant_type=refresh_token"), true);
      return { data: { access_token: "fresh-token", expires_in: 7200, refresh_token: "rotated-refresh" } };
    }
    if (url.endsWith("/bulk_update_price_quantity")) {
      bulkUpdateSent = true;
      assert.strictEqual(body.requests[0].offers[0].price.value, "19.95");
      assert.strictEqual(body.requests[0].offers[0].price.currency, "GBP");
      assert.strictEqual(body.requests[0].shipToLocationAvailability.quantity, 31);
      return { data: { responses: [{ statusCode: 200 }] } };
    }
    throw new Error(`Unexpected eBay POST URL: ${url}`);
  };
  (axios as any).put = async (url: string, _body: any, config: any) => {
    if (url.endsWith("/inventory_item/ABC-1")) {
      inventoryUpdateSent = true;
      assert.strictEqual(config.headers.Authorization, "Bearer fresh-token");
      return { status: 204, data: {} };
    }
    throw new Error(`Unexpected eBay PUT URL: ${url}`);
  };
  (axios as any).get = async (url: string, config: any) => {
    if (url.includes("/inventory_item?")) {
      assert.strictEqual(config.headers.Authorization, "Bearer fresh-token");
      return { data: { inventoryItems: [], total: 0 } };
    }
    throw new Error(`Unexpected eBay GET URL: ${url}`);
  };

  try {
    const credentials: Record<string, unknown> = {
      environment: "sandbox",
      accessToken: "expired-token",
      refreshToken: "old-refresh",
      expiresAt: new Date(Date.now() - 1000),
      marketplaceId: "EBAY_GB",
      currency: "GBP",
    };
    const health = await connector.testConnection(credentials);
    assert.strictEqual(health.success, true);
    assert.strictEqual(refreshed, true);
    assert.strictEqual(credentials.accessToken, "fresh-token");
    assert.strictEqual(credentials.refreshToken, "rotated-refresh");

    const update = await connector.updateProduct({
      sku: "ABC-1",
      title: "Item",
      price: 19.95,
      currency: "GBP",
      quantity: 31,
      status: "ACTIVE",
      externalProductId: "offer-1",
      credentials,
    });
    assert.strictEqual(update.success, true, update.error || "Expected eBay update success");
    assert.strictEqual(inventoryUpdateSent, true);
    assert.strictEqual(bulkUpdateSent, true);
    console.log("eBay token refresh and price/inventory sync tests passed");
  } finally {
    axios.post = originalPost;
    axios.get = originalGet;
    axios.put = originalPut;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
