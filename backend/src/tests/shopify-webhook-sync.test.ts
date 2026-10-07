import assert from "assert";
import { toShopifyGid } from "../utils/shopify.utils";
import { planShopifyInventoryWebhook, planShopifyProductWebhook } from "../modules/integrations/shopify-webhook.sync";

async function run() {
  console.log("Running Shopify Webhook GID normalization tests...");

  // Test 1: Plain numeric product ID to Shopify GID
  const productGid = toShopifyGid("Product", "7891234560");
  assert.strictEqual(productGid, "gid://shopify/Product/7891234560");

  // Test 2: Plain numeric variant ID to Shopify GID
  const variantGid = toShopifyGid("ProductVariant", "1234567890");
  assert.strictEqual(variantGid, "gid://shopify/ProductVariant/1234567890");

  // Test 3: Plain numeric inventory item ID to Shopify GID
  const inventoryGid = toShopifyGid("InventoryItem", "9876543210");
  assert.strictEqual(inventoryGid, "gid://shopify/InventoryItem/9876543210");

  // Test 4: Idempotent - Already formatted GID remains unchanged
  const existingProductGid = toShopifyGid("Product", "gid://shopify/Product/7891234560");
  assert.strictEqual(existingProductGid, "gid://shopify/Product/7891234560");

  // Test 5: Empty/null/undefined handling
  assert.strictEqual(toShopifyGid("Product", ""), "");
  assert.strictEqual(toShopifyGid("Product", null), "");
  assert.strictEqual(toShopifyGid("Product", undefined), "");

  const productPlan = planShopifyProductWebhook({
    id: 7891234560,
    title: "Premium Shirt",
    body_html: "<p>Cotton</p>",
    images: [{ src: "https://cdn.example/shirt.jpg" }],
    variants: [{ id: 1234567890, sku: "abc-001", price: "45.00", inventory_quantity: 20, inventory_item_id: 9876543210 }],
  });
  assert.ok(productPlan);
  assert.strictEqual(productPlan.mapping.channelPrice, 45);
  assert.strictEqual(productPlan.mapping.channelQuantity, 20);
  assert.strictEqual(productPlan.masterCatalog.title, "Premium Shirt");
  assert.strictEqual((productPlan.masterCatalog as { price?: number }).price, undefined);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(productPlan.masterCatalog, "quantity"), false);

  const inventoryPlan = planShopifyInventoryWebhook({ inventory_item_id: 9876543210, available: 10 });
  assert.ok(inventoryPlan);
  assert.strictEqual(inventoryPlan.channelQuantity, 10);
  assert.strictEqual(inventoryPlan.inventoryItemGid, "gid://shopify/InventoryItem/9876543210");
  assert.strictEqual((inventoryPlan as { productQuantity?: number }).productQuantity, undefined);

  console.log("All Shopify Webhook GID normalization tests passed successfully!");
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
