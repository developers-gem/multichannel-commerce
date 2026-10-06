import assert from "assert";
import axios from "axios";
import { clearEbayApplicationTokenCache, EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalPost = axios.post;
  const originalGet = axios.get;
  const originalPut = axios.put;
  clearEbayApplicationTokenCache();
  let inventoryPuts = 0;

  (axios as any).post = async (url: string, body: unknown) => {
    if (String(url).includes("/identity/v1/oauth2/token")) {
      assert.ok(String(body).includes("grant_type=client_credentials"));
      assert.strictEqual(String(body).includes("refresh_token"), false);
      return { data: { access_token: "app-token", expires_in: 7200 } };
    }
    throw new Error(`Unexpected POST ${url}`);
  };
  (axios as any).get = async (url: string, config: any) => {
    if (String(url).includes("/fulfillment_policy")) {
      assert.ok(String(config.headers.Authorization).startsWith("Bearer "));
      assert.notStrictEqual(config.headers.Authorization, "Bearer app-token");
      return { data: { fulfillmentPolicies: [] } };
    }
    assert.strictEqual(config.headers.Authorization, "Bearer app-token");
    if (String(url).includes("/get_default_category_tree_id")) {
      assert.strictEqual(config.params.marketplace_id, "EBAY_US");
      return { data: { categoryTreeId: "0" } };
    }
    if (String(url).includes("/get_category_suggestions")) {
      return {
        data: {
          categorySuggestions: [
            { category: { categoryId: "11483", categoryName: "Shirts" }, categoryTreeNodeAncestors: [] },
          ],
        },
      };
    }
    if (String(url).includes("/get_item_aspects_for_category")) {
      assert.strictEqual(config.params.category_id, "11483");
      return {
        data: {
          aspects: [
            { localizedAspectName: "Brand", aspectConstraint: { aspectRequired: true } },
            {
              localizedAspectName: "Color",
              aspectConstraint: { aspectRequired: true },
              aspectValues: [{ localizedValue: "Blue" }, { localizedValue: "Red" }],
            },
            { localizedAspectName: "Size", aspectConstraint: { aspectRequired: false, aspectUsage: "RECOMMENDED" } },
          ],
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  };
  (axios as any).put = async () => {
    inventoryPuts += 1;
    return { status: 204 };
  };

  const credentials: Record<string, unknown> = {
    environment: "sandbox",
    accessToken: "seller-token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    marketplaceId: "EBAY_US",
    currency: "USD",
    fulfillmentPolicyId: "fulfillment-1",
    paymentPolicyId: "payment-1",
    returnPolicyId: "return-1",
    merchantLocationKey: "sandbox-warehouse-1",
  };

  try {
    const missing = await connector.createProduct({
      sku: "ABC123",
      title: "Cotton Shirt",
      brand: "Acme",
      images: ["https://example.com/shirt.jpg"],
      price: 1650,
      currency: "USD",
      quantity: 15,
      status: "ACTIVE",
      credentials,
    });
    assert.strictEqual(missing.success, false);
    assert.strictEqual(missing.categoryId, "11483");
    assert.ok(missing.error?.includes("Color"), missing.error || "");
    assert.deepStrictEqual(missing.missingAspects, ["Color"]);
    assert.strictEqual(inventoryPuts, 0, "Missing required aspects must not create an inventory item");

    const located = await connector.createProduct({
      sku: "ABC123",
      title: "Cotton Shirt",
      images: ["https://example.com/shirt.jpg"],
      price: 1650,
      currency: "USD",
      quantity: 15,
      status: "ACTIVE",
      credentials: { ...credentials, merchantLocationKey: "" },
    });
    assert.strictEqual(located.success, false);
    assert.ok(located.error?.includes("inventory location"), located.error || "");

    const policy = await connector.createProduct({
      sku: "ABC123",
      title: "Cotton Shirt",
      images: ["https://example.com/shirt.jpg"],
      price: 1650,
      currency: "USD",
      quantity: 15,
      status: "ACTIVE",
      credentials: { ...credentials, fulfillmentPolicyId: "" },
    });
    assert.strictEqual(policy.success, false);
    assert.ok(policy.error?.includes("eBay fulfillment policy required"), policy.error || "");

    console.log("eBay aspect and publish guard tests passed");
  } finally {
    clearEbayApplicationTokenCache();
    axios.post = originalPost;
    axios.get = originalGet;
    axios.put = originalPut;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
