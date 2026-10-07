import assert from "assert";
import axios from "axios";
import { clearEbayApplicationTokenCache, EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalPost = axios.post;
  const originalPut = axios.put;
  const originalGet = axios.get;
  clearEbayApplicationTokenCache();
  let inventoryBody: any;
  let offerBody: any;

  (axios as any).put = async (url: string, body: any) => {
    if (String(url).includes("/inventory_item/")) {
      inventoryBody = body;
      return { status: 204, data: {} };
    }
    throw new Error(`Unexpected PUT ${url}`);
  };
  (axios as any).get = async (url: string) => {
    if (String(url).includes("/get_default_category_tree_id")) {
      return { data: { categoryTreeId: "0", categoryTreeVersion: "1" } };
    }
    if (String(url).includes("/get_category_suggestions")) {
      return { data: { categorySuggestions: [] } };
    }
    if (String(url).includes("/get_item_aspects_for_category")) {
      return {
        data: {
          aspects: [
            {
              localizedAspectName: "Brand",
              aspectConstraint: { aspectRequired: true, aspectUsage: "RECOMMENDED" },
            },
          ],
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  };
  (axios as any).post = async (url: string, body: any) => {
    if (String(url).includes("/identity/v1/oauth2/token")) {
      assert.ok(String(body).includes("grant_type=client_credentials"));
      return { data: { access_token: "app-token", expires_in: 7200 } };
    }
    if (String(url).endsWith("/offer")) {
      offerBody = body;
      return { data: { offerId: "offer-1" } };
    }
    if (String(url).endsWith("/publish")) {
      return { data: { listingId: "listing-1" } };
    }
    throw new Error(`Unexpected POST ${url}`);
  };

  const credentials = {
    environment: "sandbox",
    accessToken: "token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    marketplaceId: "EBAY_GB",
    currency: "GBP",
    fulfillmentPolicyId: "fulfillment-1",
    paymentPolicyId: "payment-1",
    returnPolicyId: "return-1",
    merchantLocationKey: "warehouse-1",
    categoryId: "111422",
  };

  try {
    const missing = await connector.createProduct({
      sku: "ABC-001",
      title: "Premium Shirt",
      brand: "Acme",
      images: ["https://example.com/shirt.jpg"],
      price: 20,
      currency: "GBP",
      quantity: 15,
      status: "ACTIVE",
      credentials: { ...credentials, categoryId: "" },
    });
    assert.strictEqual(missing.success, false);
    assert.ok(missing.error?.includes("categoryId"), missing.error || "");

    const created = await connector.createProduct({
      sku: "ABC-001",
      title: "Premium Shirt",
      description: "Cotton",
      brand: "Acme",
      images: ["https://example.com/shirt.jpg"],
      price: 20,
      currency: "GBP",
      quantity: 15,
      status: "ACTIVE",
      credentials,
    });
    assert.strictEqual(created.success, true, created.error || "");
    assert.strictEqual(inventoryBody.condition, "NEW");
    assert.strictEqual(inventoryBody.availability.shipToLocationAvailability.quantity, 15);
    assert.strictEqual(offerBody.categoryId, "111422");
    assert.strictEqual(offerBody.marketplaceId, "EBAY_GB");
    assert.strictEqual(offerBody.pricingSummary.price.currency, "GBP");
    assert.strictEqual(offerBody.pricingSummary.price.value, "20");
    assert.strictEqual(offerBody.listingPolicies.fulfillmentPolicyId, "fulfillment-1");
    assert.strictEqual(offerBody.merchantLocationKey, "warehouse-1");
    assert.strictEqual(offerBody.listingDuration, "GTC");
    assert.deepStrictEqual(inventoryBody.product.aspects, { Brand: ["Acme"] });
    assert.strictEqual(created.categoryId, "111422");

    const wrongCurrency = await connector.createProduct({
      sku: "ABC-001",
      title: "Premium Shirt",
      brand: "Acme",
      images: ["https://example.com/shirt.jpg"],
      price: 20,
      currency: "USD",
      quantity: 15,
      status: "ACTIVE",
      credentials,
    });
    assert.strictEqual(wrongCurrency.success, false);
    assert.ok(wrongCurrency.error?.includes("GBP"), wrongCurrency.error || "");
    console.log("eBay create payload tests passed");
  } finally {
    axios.post = originalPost;
    axios.put = originalPut;
    axios.get = originalGet;
    clearEbayApplicationTokenCache();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
