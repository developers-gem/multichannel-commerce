import assert from "assert";
import axios from "axios";
import { EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalGet = axios.get;

  (axios as any).get = async (url: string, config: any) => {
    if (String(url).includes("/inventory_item?")) {
      return {
        data: {
          total: 2,
          inventoryItems: [
            {
              sku: "BAD-SKU",
              product: { title: "Broken" },
              availability: { shipToLocationAvailability: { quantity: 3 } },
            },
            {
              sku: "ABC-001",
              product: { title: "Premium Shirt", description: "Cotton" },
              availability: { shipToLocationAvailability: { quantity: 15 } },
            },
          ],
        },
      };
    }
    if (String(url).includes("/offer")) {
      if (config?.params?.sku === "BAD-SKU") {
        const error: any = new Error("offer lookup failed");
        error.response = { status: 500, data: { errors: [{ message: "temporary eBay error" }] } };
        throw error;
      }
      return {
        data: {
          offers: [
            {
              offerId: "offer-20",
              status: "PUBLISHED",
              listing: { listingId: "listing-20" },
              pricingSummary: { price: { value: "20.00", currency: "GBP" } },
            },
          ],
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  };

  try {
    const page = await connector.fetchChannelProducts(
      {
        environment: "sandbox",
        accessToken: "token",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        marketplaceId: "EBAY_GB",
      },
      null,
      50
    );
    assert.strictEqual(page.products.length, 1);
    assert.strictEqual(page.products[0].sku, "ABC-001");
    assert.strictEqual(page.products[0].price, 20);
    assert.strictEqual(page.products[0].quantity, 15);
    assert.strictEqual(page.products[0].currency, "GBP");
    assert.strictEqual(page.products[0].externalProductId, "offer-20");
    assert.ok((page.errors || []).some((error) => error.sku === "BAD-SKU"));
    console.log("eBay import tests passed");
  } finally {
    axios.get = originalGet;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
