import assert from "assert";
import axios from "axios";
import { EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalPost = axios.post;
  const originalGet = axios.get;
  let createdUrl = "";
  let createdBody: any;
  let createdHeaders: any;

  (axios as any).get = async (url: string) => {
    if (String(url).includes("/location")) {
      return {
        data: {
          locations: [
            { merchantLocationKey: "sandbox-warehouse-1", name: "Sandbox Warehouse", merchantLocationStatus: "ENABLED" },
          ],
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  };
  (axios as any).post = async (url: string, body: any, config: any) => {
    createdUrl = String(url);
    createdBody = body;
    createdHeaders = config.headers;
    return { status: 204, data: {} };
  };

  const credentials: Record<string, unknown> = {
    environment: "sandbox",
    accessToken: "token",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    marketplaceId: "EBAY_US",
  };

  try {
    const listed = await connector.listInventoryLocations(credentials);
    assert.strictEqual(listed.length, 1);
    assert.strictEqual(listed[0].merchantLocationKey, "sandbox-warehouse-1");

    const created = await connector.createInventoryLocation(credentials, undefined, {
      merchantLocationKey: "sandbox-warehouse-1",
      name: "Sandbox Warehouse",
      country: "US",
      postalCode: "95008",
      locationTypes: ["WAREHOUSE"],
      merchantLocationStatus: "ENABLED",
    });
    assert.strictEqual(created.success, true, created.error || "");
    assert.strictEqual(created.merchantLocationKey, "sandbox-warehouse-1");
    assert.strictEqual(created.created, true);
    assert.ok(createdUrl.endsWith("/location/sandbox-warehouse-1"));
    assert.strictEqual(createdBody.name, "Sandbox Warehouse");
    assert.strictEqual(createdBody.merchantLocationStatus, "ENABLED");
    assert.deepStrictEqual(createdBody.locationTypes, ["WAREHOUSE"]);
    assert.strictEqual(createdBody.location.address.country, "US");
    assert.strictEqual(createdBody.location.address.postalCode, "95008");
    assert.strictEqual(createdHeaders.Authorization, "Bearer token");
    assert.strictEqual(credentials.merchantLocationKey, "sandbox-warehouse-1");
    console.log("eBay inventory location tests passed");
  } finally {
    axios.post = originalPost;
    axios.get = originalGet;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
