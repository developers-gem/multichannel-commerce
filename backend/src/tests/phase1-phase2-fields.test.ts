import assert from "assert";
import { platformConfigService, ResolvedFeeConfig } from "../modules/integrations/platform-config.service";
import { Platform } from "../shared/enums/platform.enum";

async function run() {
  console.log("Running Phase 1 & Phase 2 schema, fee resolution, and profitability tests...");

  // Test 1: Platform defaults fallback
  const shopifyDefault = await platformConfigService.getPlatformConfig(Platform.SHOPIFY);
  assert.strictEqual(shopifyDefault.feePercentage, 2.9);
  assert.strictEqual(shopifyDefault.fixedFee, 0.30);

  const ebayDefault = await platformConfigService.getPlatformConfig(Platform.EBAY);
  assert.strictEqual(ebayDefault.feePercentage, 13.25);
  assert.strictEqual(ebayDefault.fixedFee, 0.30);

  // Test 2: Profitability calculation formula
  // Example 1: Selling = 1500, Cost = 1000, Shipping = 100, Fee = 2.9% + $0.30
  // Platform Fee = (1500 * 0.029) + 0.30 = 43.5 + 0.3 = 43.80
  // Net Profit = 1500 - 1000 - 100 - 43.80 = 356.20
  const feeConfig: ResolvedFeeConfig = {
    feePercentage: 2.9,
    fixedFee: 0.30,
    paymentFeePercentage: 0,
    source: "PLATFORM_DEFAULT",
  };

  const profitRes = platformConfigService.calculateProfitability(1500, 1000, 100, feeConfig);
  assert.strictEqual(profitRes.sellingPrice, 1500);
  assert.strictEqual(profitRes.costPrice, 1000);
  assert.strictEqual(profitRes.shippingCost, 100);
  assert.strictEqual(profitRes.platformFee, 43.8);
  assert.strictEqual(profitRes.netProfit, 356.2);
  assert.strictEqual(profitRes.isProfitable, true);

  // Example 2: Loss making item
  // Selling = 500, Cost = 600, Shipping = 50, Fee = 10% + $0
  // Platform Fee = 50, Net Profit = 500 - 600 - 50 - 50 = -200 (LOSS)
  const lossFeeConfig: ResolvedFeeConfig = {
    feePercentage: 10,
    fixedFee: 0,
    paymentFeePercentage: 0,
    source: "LISTING_OVERRIDE",
  };
  const lossRes = platformConfigService.calculateProfitability(500, 600, 50, lossFeeConfig);
  assert.strictEqual(lossRes.netProfit, -200);
  assert.strictEqual(lossRes.isProfitable, false);

  console.log("All Phase 1 & Phase 2 tests passed successfully!");
}

run().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
