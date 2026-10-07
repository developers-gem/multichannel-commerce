import assert from "assert";
import axios from "axios";
import { ShopifyConnector } from "../modules/sync/connectors/shopify.connector";

function graphqlData(query: string, variables?: Record<string, any>) {
  if (query.includes("mutation productCreate")) {
    assert.strictEqual(variables?.input?.variants, undefined, "ProductInput must not include variants");
    return {
      productCreate: {
        product: {
          id: "gid://shopify/Product/9",
          variants: {
            nodes: [
              {
                id: "gid://shopify/ProductVariant/8",
                inventoryItem: { id: "gid://shopify/InventoryItem/7" },
              },
            ],
          },
        },
        userErrors: [],
      },
    };
  }
  if (query.includes("mutation productVariantsBulkUpdate")) {
    return {
      productVariantsBulkUpdate: {
        productVariants: [
          {
            id: "gid://shopify/ProductVariant/8",
            inventoryItem: { id: "gid://shopify/InventoryItem/7" },
          },
        ],
        userErrors: [],
      },
    };
  }
  if (query.includes("query getLocations")) {
    return {
      locations: {
        nodes: [{ id: "gid://shopify/Location/4", isPrimary: true, isActive: true }],
      },
    };
  }
  if (query.includes("query inventoryTrackingAndLevels")) {
    return {
      inventoryItem: {
        id: "gid://shopify/InventoryItem/7",
        tracked: true,
        inventoryLevels: {
          nodes: [{ location: { id: "gid://shopify/Location/4" } }],
        },
      },
    };
  }
  if (query.includes("mutation inventorySetQuantities")) {
    return {
      inventorySetQuantities: {
        inventoryAdjustmentGroup: { createdAt: new Date().toISOString() },
        userErrors: [],
      },
    };
  }
  throw new Error(`Unexpected GraphQL operation: ${query}`);
}

async function run() {
  const connector = new ShopifyConnector();
  const originalPost = axios.post;
  const calls: Array<{ query: string; variables: Record<string, any> }> = [];

  (axios as any).post = async (_url: string, body: { query: string; variables?: Record<string, any> }) => {
    const variables = body.variables || {};
    calls.push({ query: body.query, variables });
    return { data: { data: graphqlData(body.query, variables) } };
  };

  try {
    const result = await connector.createProduct({
      sku: "ABC-001",
      title: "Premium Shirt",
      description: "Cotton",
      price: 40,
      quantity: 20,
      status: "ACTIVE",
      storeUrl: "sample-store.myshopify.com",
      credentials: { accessToken: "test-token" },
    });
    assert.strictEqual(result.success, true, result.error || "");
    assert.strictEqual(result.externalProductId, "gid://shopify/Product/9");
    assert.strictEqual(result.externalVariantId, "gid://shopify/ProductVariant/8");
    assert.strictEqual(result.externalInventoryItemId, "gid://shopify/InventoryItem/7");

    const createIndex = calls.findIndex((call) => call.query.includes("mutation productCreate"));
    const priceIndex = calls.findIndex((call) => call.query.includes("mutation productVariantsBulkUpdate"));
    const inventoryIndex = calls.findIndex((call) => call.query.includes("mutation inventorySetQuantities"));
    assert.ok(createIndex >= 0 && priceIndex > createIndex && inventoryIndex > priceIndex);
    assert.strictEqual(calls[priceIndex].variables.variants[0].price, "40");
    assert.strictEqual(calls[inventoryIndex].variables.input.quantities[0].quantity, 20);
    console.log("Shopify create tests passed");
  } finally {
    axios.post = originalPost;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
