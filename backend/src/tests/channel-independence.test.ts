import assert from "assert";
import {
  channelListingFromImport,
  resolveChannelPrice,
  resolveChannelQuantity,
  seedChannelListing,
  syncTargetsForMappingUpdate,
} from "../modules/sync/channel-values";

function run() {
  const seeded = seedChannelListing({
    masterPrice: 10,
    masterQuantity: 100,
    masterCurrency: "GBP",
  });
  assert.strictEqual(seeded.channelPrice, 10);
  assert.strictEqual(seeded.channelQuantity, 100);
  assert.strictEqual(seeded.channelCurrency, "GBP");

  const explicit = seedChannelListing({
    channelPrice: 0,
    channelQuantity: 15,
    channelCurrency: "usd",
    masterPrice: 10,
    masterQuantity: 100,
    masterCurrency: "GBP",
  });
  assert.strictEqual(explicit.channelPrice, 0, "An explicit channel price of 0 is kept");
  assert.strictEqual(explicit.channelQuantity, 15);
  assert.strictEqual(explicit.channelCurrency, "USD");

  let masterPrice = 10;
  const shopifyPrice = 45;
  const ebayPrice = 20;
  masterPrice = 99;
  assert.strictEqual(resolveChannelPrice(shopifyPrice, masterPrice), 45);
  assert.strictEqual(resolveChannelPrice(ebayPrice, masterPrice), 20);
  assert.strictEqual(resolveChannelQuantity(20, 100), 20);
  assert.strictEqual(resolveChannelQuantity(15, 100), 15);
  assert.strictEqual(resolveChannelPrice(undefined, masterPrice), 99);

  const imported = channelListingFromImport({ price: 20, quantity: 15, currency: "gbp" });
  const existingMaster = { price: 40, quantity: 20 };
  assert.strictEqual(imported.channelPrice, 20);
  assert.strictEqual(imported.channelQuantity, 15);
  assert.strictEqual(imported.channelCurrency, "GBP");
  assert.strictEqual(existingMaster.price, 40);
  assert.strictEqual(existingMaster.quantity, 20);

  assert.deepStrictEqual(syncTargetsForMappingUpdate("shopify-mapping", { channelPrice: 45 }), ["shopify-mapping"]);
  assert.deepStrictEqual(syncTargetsForMappingUpdate("ebay-mapping", { channelQuantity: 10 }), ["ebay-mapping"]);
  assert.deepStrictEqual(syncTargetsForMappingUpdate("ebay-mapping", {}), []);

  console.log("Channel independence tests passed");
}

run();
