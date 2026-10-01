import assert from "assert";
import axios from "axios";
import { ShopifyConnector } from "../modules/sync/connectors/shopify.connector";

async function run() {
  const connector = new ShopifyConnector();
  const originalPost = axios.post;
  const calls: Array<{ query: string; variables: Record<string, any> }> = [];
  const operations: string[] = [];

  (axios as any).post = async (_url: string, body: { query: string; variables?: Record<string, any> }) => {
    calls.push({ query: body.query, variables: body.variables || {} });
    operations.push(body.query);
    if (body.query.includes("mutation productUpdate")) {
      return { data: { data: { productUpdate: { product: { id: "gid://shopify/Product/1", variants: { nodes: [{ id: "gid://shopify/ProductVariant/2", inventoryItem: { id: "gid://shopify/InventoryItem/3" } }] } }, userErrors: [] } } } };
    }
    if (body.query.includes("mutation productVariantsBulkUpdate")) {
      return { data: { data: { productVariantsBulkUpdate: { productVariants: [{ id: "gid://shopify/ProductVariant/2", inventoryItem: { id: "gid://shopify/InventoryItem/3" } }], userErrors: [] } } } };
    }
    if (body.query.includes("query getLocations")) {
      return { data: { data: { locations: { nodes: [{ id: "gid://shopify/Location/4", isPrimary: true, isActive: true }] } } } };
    }
    if (body.query.includes("query inventoryTrackingAndLevels")) {
      return { data: { data: { inventoryItem: { id: "gid://shopify/InventoryItem/3", tracked: false, inventoryLevels: { nodes: [] } } } } };
    }
    if (body.query.includes("mutation enableInventoryTracking")) {
      return { data: { data: { inventoryItemUpdate: { inventoryItem: { id: "gid://shopify/InventoryItem/3", tracked: true }, userErrors: [] } } } };
    }
    if (body.query.includes("mutation activateInventory")) {
      return { data: { data: { inventoryActivate: { inventoryLevel: { id: "gid://shopify/InventoryLevel/5" }, userErrors: [] } } } };
    }
    if (body.query.includes("mutation inventorySetQuantities")) {
      return { data: { data: { inventorySetQuantities: { inventoryAdjustmentGroup: { createdAt: new Date().toISOString() }, userErrors: [] } } } };
    }
    throw new Error(`Unexpected GraphQL operation: ${body.query}`);
  };

  try {
    const result = await connector.updateProduct({
      sku: "SKU-1",
      title: "Sample item",
      price: 27.5,
      quantity: 42,
      externalProductId: "gid://shopify/Product/1",
      externalVariantId: "gid://shopify/ProductVariant/2",
      storeUrl: "sample-store.myshopify.com",
      credentials: { accessToken: "test-token" },
    });
    assert.strictEqual(result.success, true);
    const inventoryCall = calls.find((call) => call.query.includes("mutation inventorySetQuantities"));
    assert.ok(inventoryCall, "inventorySetQuantities must be sent to Shopify");
    assert.strictEqual(inventoryCall.variables.input.quantities[0].quantity, 42);
    const trackingIndex = operations.findIndex((query) => query.includes("mutation enableInventoryTracking"));
    const activateIndex = operations.findIndex((query) => query.includes("mutation activateInventory"));
    const setIndex = operations.findIndex((query) => query.includes("mutation inventorySetQuantities"));
    assert.ok(trackingIndex >= 0 && activateIndex > trackingIndex && setIndex > activateIndex,
      "Shopify inventory must be tracked, activated at a location, then set");
    console.log("Shopify inventory synchronization test passed");
  } finally {
    axios.post = originalPost;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
