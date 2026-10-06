import assert from "assert";
import axios from "axios";
import { clearEbayApplicationTokenCache, EbayConnector } from "../modules/sync/connectors/ebay.connector";

async function run() {
  const connector = new EbayConnector();
  const originalPost = axios.post;
  const originalGet = axios.get;
  const gets: Array<{ url: string; params: any; authorization: string }> = [];
  const tokenPosts: Array<{ url: string; body: string; authorization: string; contentType: string }> = [];

  clearEbayApplicationTokenCache();

  (axios as any).post = async (url: string, body: unknown, config: any) => {
    const posted = String(body || "");
    tokenPosts.push({
      url: String(url),
      body: posted,
      authorization: String(config?.headers?.Authorization || ""),
      contentType: String(config?.headers?.["Content-Type"] || ""),
    });
    if (posted.includes("grant_type=refresh_token")) {
      throw new Error("Taxonomy must not refresh the seller token");
    }
    if (!String(url).includes("/identity/v1/oauth2/token") || !posted.includes("grant_type=client_credentials")) {
      throw new Error(`Unexpected POST ${url}`);
    }
    const expiresIn = tokenPosts.length === 1 ? 7200 : 1;
    return { data: { access_token: `app-token-${tokenPosts.length}`, expires_in: expiresIn, token_type: "Application Access Token" } };
  };
  (axios as any).get = async (url: string, config: any) => {
    gets.push({
      url: String(url),
      params: config?.params,
      authorization: config?.headers?.Authorization,
    });
    if (String(url).includes("/get_default_category_tree_id")) {
      return { data: { categoryTreeId: "0", categoryTreeVersion: "119" } };
    }
    if (String(url).includes("/category_tree/0/get_category_suggestions")) {
      return {
        data: {
          categorySuggestions: [
            {
              category: { categoryId: "11483", categoryName: "Shirts" },
              categoryTreeNodeAncestors: [
                { categoryId: "1059", categoryName: "Men's Clothing" },
                { categoryId: "11450", categoryName: "Clothing, Shoes & Accessories" },
              ],
            },
          ],
        },
      };
    }
    throw new Error(`Unexpected GET ${url}`);
  };

  const credentials: Record<string, unknown> = {
    environment: "sandbox",
    accessToken: "seller-user-token",
    refreshToken: "seller-refresh",
    expiresAt: new Date(Date.now() - 60 * 1000),
    marketplaceId: "EBAY_US",
  };

  try {
    const tree = await connector.getDefaultCategoryTreeId(credentials);
    assert.strictEqual(tree.categoryTreeId, "0");
    assert.strictEqual(tree.marketplaceId, "EBAY_US");
    assert.strictEqual(gets[0].params.marketplace_id, "EBAY_US");
    assert.ok(gets[0].url.includes("api.sandbox.ebay.com/commerce/taxonomy/v1/get_default_category_tree_id"));
    assert.strictEqual(tokenPosts.length, 1);
    assert.strictEqual(tokenPosts[0].url, "https://api.sandbox.ebay.com/identity/v1/oauth2/token");
    assert.ok(tokenPosts[0].body.includes("grant_type=client_credentials"));
    assert.ok(tokenPosts[0].body.includes("scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope"));
    assert.strictEqual(tokenPosts[0].body.includes("refresh_token"), false);
    assert.strictEqual(tokenPosts[0].body.includes("seller-refresh"), false);
    assert.ok(tokenPosts[0].authorization.startsWith("Basic "));
    assert.strictEqual(tokenPosts[0].contentType, "application/x-www-form-urlencoded");
    assert.strictEqual(gets[0].authorization, "Bearer app-token-1");

    const result = await connector.getCategorySuggestions(credentials, undefined, "shirt");
    assert.strictEqual(tokenPosts.length, 1, "Application token is cached and reused");
    assert.ok(gets.every((call) => call.authorization === "Bearer app-token-1"));
    assert.ok(gets.every((call) => call.authorization !== "Bearer seller-user-token"));
    assert.strictEqual(result.suggestions.length, 1);
    assert.strictEqual(result.suggestions[0].categoryId, "11483");
    assert.strictEqual(result.suggestions[0].categoryName, "Shirts");
    assert.strictEqual(result.suggestions[0].leafCategory, true);
    assert.strictEqual(
      result.suggestions[0].categoryPath,
      "Clothing, Shoes & Accessories > Men's Clothing > Shirts"
    );
    assert.deepStrictEqual(
      result.suggestions[0].ancestors.map((ancestor) => ancestor.categoryId),
      ["11450", "1059"]
    );
    assert.strictEqual(JSON.stringify(result).includes("app-token-1"), false);
    assert.strictEqual(JSON.stringify(result).includes("seller-user-token"), false);

    await connector.getCategorySuggestions(credentials, undefined, "shirt");
    assert.strictEqual(tokenPosts.length, 1, "A later search reuses the unexpired application token");

    clearEbayApplicationTokenCache();
    await connector.getDefaultCategoryTreeId(credentials);
    assert.strictEqual(tokenPosts.length, 2, "A cleared cache requests a new application token");
    assert.strictEqual(gets[gets.length - 1].authorization, "Bearer app-token-2");

    await connector.getDefaultCategoryTreeId(credentials);
    assert.strictEqual(
      tokenPosts.length,
      3,
      "A token inside the expiry buffer is not reused"
    );
    assert.strictEqual(gets[gets.length - 1].authorization, "Bearer app-token-3");

    console.log("eBay category discovery tests passed");
  } finally {
    clearEbayApplicationTokenCache();
    axios.post = originalPost;
    axios.get = originalGet;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
