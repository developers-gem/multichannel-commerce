import assert from "assert";
import { toShopifyGid } from "../utils/shopify.utils";

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

  console.log("All Shopify Webhook GID normalization tests passed successfully!");
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
