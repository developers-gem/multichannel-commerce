import axios from "axios";
import Integration from "../../integrations/integration.model";
import { env } from "../../../config/env";
import {
  HealthCheckResult,
  IChannelImportConnector,
  IMarketplaceConnector,
  NormalizedChannelProduct,
  PaginatedChannelProducts,
  SyncPayload,
  SyncResult,
} from "./connector.interface";

/** Application scope for client-credentials tokens. Not a seller consent scope. */
const EBAY_APPLICATION_TOKEN_SCOPE = "https://api.ebay.com/oauth/api_scope";
const APPLICATION_TOKEN_SKEW_MS = 30_000;

type EbayApplicationTokenCache = {
  sandbox: boolean;
  token: string;
  expiresAt: number;
};

let ebayApplicationTokenCache: EbayApplicationTokenCache | null = null;

export function clearEbayApplicationTokenCache(): void {
  ebayApplicationTokenCache = null;
}

export class EbayConnector implements IMarketplaceConnector, IChannelImportConnector {
  /**
   * Helper to resolve base eBay Inventory API endpoint
   */
  private getBaseUrl(credentials?: Record<string, unknown>): string {
    const isSandbox = credentials?.environment
      ? credentials.environment === "sandbox"
      : env.EBAY_ENVIRONMENT === "sandbox";

    return isSandbox
      ? "https://api.sandbox.ebay.com/sell/inventory/v1"
      : "https://api.ebay.com/sell/inventory/v1";
  }

  /**
   * Helper to extract access token without exposing secrets
   */
  private async ensureValidAccessToken(
    credentials?: Record<string, unknown>,
    integrationId?: string
  ): Promise<string> {
    const accessToken = String(credentials?.accessToken || credentials?.token || "");
    const refreshToken = String(credentials?.refreshToken || "");
    const expiresAt = credentials?.expiresAt
      ? new Date(credentials.expiresAt as string | Date).getTime()
      : 0;

    if (accessToken && (!expiresAt || expiresAt > Date.now() + 30_000)) return accessToken;
    if (!refreshToken) throw new Error("eBay authorization expired. Reconnect the eBay account.");
    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
      throw new Error("eBay OAuth client credentials are not configured");
    }

    const sandbox = credentials?.environment
      ? credentials.environment === "sandbox"
      : env.EBAY_ENVIRONMENT === "sandbox";
    const tokenUrl = sandbox
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";
    const basic = Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString("base64");
    let response;
    try {
      response = await axios.post(tokenUrl, new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(), {
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      });
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 400 || status === 401) {
        throw new Error("eBay authorization expired or was revoked. Reconnect the eBay account.");
      }
      throw new Error(`eBay token refresh failed${status ? ` (HTTP ${status})` : ""}`);
    }

    const refreshedToken = String(response.data?.access_token || "");
    if (!refreshedToken) throw new Error("eBay token refresh returned no access token");
    const refreshedExpiry = response.data?.expires_in
      ? new Date(Date.now() + Number(response.data.expires_in) * 1000)
      : undefined;
    const rotatedRefreshToken = String(response.data?.refresh_token || refreshToken);

    if (credentials) {
      credentials.accessToken = refreshedToken;
      credentials.refreshToken = rotatedRefreshToken;
      if (refreshedExpiry) credentials.expiresAt = refreshedExpiry;
    }
    if (integrationId) {
      const set: Record<string, unknown> = {
        "credentials.accessToken": refreshedToken,
        "credentials.refreshToken": rotatedRefreshToken,
      };
      if (refreshedExpiry) set["credentials.expiresAt"] = refreshedExpiry;
      await Integration.findByIdAndUpdate(integrationId, { $set: set });
    }
    return refreshedToken;
  }

  /**
   * Application token for Taxonomy/metadata. Seller inventory calls keep using
   * ensureValidAccessToken. The token value is never logged.
   */
  private async getApplicationAccessToken(credentials?: Record<string, unknown>): Promise<string> {
    const sandbox = credentials?.environment
      ? credentials.environment === "sandbox"
      : env.EBAY_ENVIRONMENT === "sandbox";
    const cached = ebayApplicationTokenCache;
    if (
      cached &&
      cached.sandbox === sandbox &&
      cached.token &&
      cached.expiresAt > Date.now() + APPLICATION_TOKEN_SKEW_MS
    ) {
      return cached.token;
    }

    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
      throw new Error("eBay OAuth client credentials are not configured");
    }

    const tokenUrl = sandbox
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";
    const basic = Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString("base64");
    let response;
    try {
      response = await axios.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: "client_credentials",
          scope: EBAY_APPLICATION_TOKEN_SCOPE,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 15000,
        }
      );
    } catch (error: any) {
      const status = error.response?.status;
      throw new Error(`eBay application token request failed${status ? ` (HTTP ${status})` : ""}`);
    }

    const token = String(response.data?.access_token || "");
    if (!token) throw new Error("eBay application token request returned no access token");
    const expiresInSeconds = Number(response.data?.expires_in);
    const expiresAt = Date.now() + (Number.isFinite(expiresInSeconds) ? expiresInSeconds : 0) * 1000;
    ebayApplicationTokenCache = { sandbox, token, expiresAt };
    return token;
  }

  private headersForToken(token: string, credentials?: Record<string, unknown>) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": this.contentLanguage(credentials),
      ...(credentials?.marketplaceId ? { "X-EBAY-C-MARKETPLACE-ID": String(credentials.marketplaceId) } : {}),
    };
  }

  private contentLanguage(credentials?: Record<string, unknown>): string {
    const marketplace = String(credentials?.marketplaceId || env.EBAY_MARKETPLACE_ID || "EBAY_US");
    if (marketplace === "EBAY_GB") return "en-GB";
    if (marketplace === "EBAY_DE") return "de-DE";
    if (marketplace === "EBAY_FR") return "fr-FR";
    if (marketplace === "EBAY_IT") return "it-IT";
    if (marketplace === "EBAY_ES") return "es-ES";
    return "en-US";
  }

  private marketplaceCurrency(marketplaceId: string): string | undefined {
    const currencies: Record<string, string> = {
      EBAY_US: "USD",
      EBAY_CA: "CAD",
      EBAY_GB: "GBP",
      EBAY_AU: "AUD",
      EBAY_DE: "EUR",
      EBAY_FR: "EUR",
      EBAY_IT: "EUR",
      EBAY_ES: "EUR",
      EBAY_IE: "EUR",
      EBAY_AT: "EUR",
      EBAY_NL: "EUR",
      EBAY_BE: "EUR",
      EBAY_IN: "INR",
    };
    return currencies[marketplaceId];
  }

  private listingSetupError(credentials?: Record<string, unknown>): string | null {
    if (!credentials?.merchantLocationKey) {
      return "eBay inventory location is required. Create a warehouse location before publishing.";
    }
    if (!credentials?.fulfillmentPolicyId) return "eBay fulfillment policy required";
    if (!credentials?.paymentPolicyId) return "eBay payment policy required";
    if (!credentials?.returnPolicyId) return "eBay return policy required";
    return null;
  }

  private resolveListingCurrency(payload: SyncPayload): { currency: string; error?: string } {
    const marketplaceId = String(payload.credentials?.marketplaceId || env.EBAY_MARKETPLACE_ID || "EBAY_US");
    const expected = this.marketplaceCurrency(marketplaceId);
    const currency = String(
      payload.currency || payload.credentials?.currency || expected || env.EBAY_CURRENCY || "USD"
    ).toUpperCase();
    if (expected && currency !== expected) {
      return {
        currency,
        error: `eBay price currency ${currency} does not match marketplace ${marketplaceId}, which requires ${expected}.`,
      };
    }
    return { currency };
  }

  private inventoryItemBody(payload: SyncPayload) {
    const aspects = payload.aspects && Object.keys(payload.aspects).length > 0
      ? payload.aspects
      : payload.brand
        ? { Brand: [payload.brand] }
        : undefined;
    return {
      condition: "NEW",
      product: {
        title: payload.title,
        description: payload.description || "",
        ...(aspects ? { aspects } : {}),
        imageUrls: payload.images || [],
      },
      availability: {
        shipToLocationAvailability: {
          quantity: payload.status === "ACTIVE" ? Math.max(0, payload.quantity) : 0,
        },
      },
    };
  }

  public async discoverSellerConfiguration(
    credentials: Record<string, unknown>,
    integrationId: string
  ): Promise<{ storeName?: string }> {
    const token = await this.ensureValidAccessToken(credentials, integrationId);
    const sandbox = credentials.environment === "sandbox";
    const apiHost = sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
    const identityHost = sandbox ? "https://apiz.sandbox.ebay.com" : "https://apiz.ebay.com";
    const marketplaceId = String(credentials.marketplaceId || "EBAY_US");
    const headers = this.headersForToken(token, credentials);
    const getPolicy = async (path: string, field: string): Promise<any[]> => {
      const response = await axios.get(`${apiHost}/sell/account/v1/${path}`, {
        params: { marketplace_id: marketplaceId }, headers, timeout: 15000,
      });
      return response.data?.[field] || [];
    };

    const results = await Promise.allSettled([
      getPolicy("fulfillment_policy", "fulfillmentPolicies"),
      getPolicy("payment_policy", "paymentPolicies"),
      getPolicy("return_policy", "returnPolicies"),
      axios.get(`${apiHost}/sell/inventory/v1/location`, { params: { limit: 100 }, headers, timeout: 15000 }),
      axios.get(`${identityHost}/commerce/identity/v1/user/`, { headers, timeout: 15000 }),
    ]);
    const fulfillment = results[0].status === "fulfilled" ? results[0].value : [];
    const payment = results[1].status === "fulfilled" ? results[1].value : [];
    const returns = results[2].status === "fulfilled" ? results[2].value : [];
    const locations = results[3].status === "fulfilled" ? results[3].value.data?.locations || [] : [];
    const seller = results[4].status === "fulfilled" ? results[4].value.data : undefined;
    const firstFulfillment = fulfillment[0];
    const firstPayment = payment[0];
    const firstReturn = returns[0];
    const firstLocation = locations[0];
    const discovered: Record<string, unknown> = {
      fulfillmentPolicies: fulfillment,
      paymentPolicies: payment,
      returnPolicies: returns,
      locations,
      ...(firstFulfillment?.fulfillmentPolicyId ? { fulfillmentPolicyId: firstFulfillment.fulfillmentPolicyId } : {}),
      ...(firstPayment?.paymentPolicyId ? { paymentPolicyId: firstPayment.paymentPolicyId } : {}),
      ...(firstReturn?.returnPolicyId ? { returnPolicyId: firstReturn.returnPolicyId } : {}),
      ...(firstLocation?.merchantLocationKey ? { merchantLocationKey: firstLocation.merchantLocationKey } : {}),
      ...(seller?.username ? { sellerUsername: seller.username } : {}),
      ...(seller?.userId ? { sellerUserId: seller.userId } : {}),
    };
    await Integration.findByIdAndUpdate(integrationId, {
      $set: Object.fromEntries(Object.entries(discovered).map(([key, value]) => [`credentials.${key}`, value])),
    });
    Object.assign(credentials, discovered);
    return seller?.username ? { storeName: String(seller.username) } : {};
  }

  /**
   * GET /sell/inventory/v1/location for the connected seller.
   */
  public async listInventoryLocations(
    credentials: Record<string, unknown>,
    integrationId?: string
  ): Promise<Array<Record<string, unknown>>> {
    const token = await this.ensureValidAccessToken(credentials, integrationId);
    const response = await axios.get(`${this.getBaseUrl(credentials)}/location`, {
      params: { limit: 100 },
      headers: this.headersForToken(token, credentials),
      timeout: 15000,
    });
    return response.data?.locations || [];
  }

  /**
   * POST /sell/inventory/v1/location/{merchantLocationKey}
   * A 409 means this key already exists and is reused.
   */
  public async createInventoryLocation(
    credentials: Record<string, unknown>,
    integrationId: string | undefined,
    input: {
      merchantLocationKey: string;
      name: string;
      country: string;
      postalCode: string;
      locationTypes?: string[];
      merchantLocationStatus?: string;
    }
  ): Promise<{ success: boolean; merchantLocationKey?: string; created?: boolean; error?: string }> {
    const merchantLocationKey = input.merchantLocationKey.trim();
    if (!merchantLocationKey) return { success: false, error: "merchantLocationKey is required" };

    const token = await this.ensureValidAccessToken(credentials, integrationId);
    const body = {
      name: input.name,
      merchantLocationStatus: input.merchantLocationStatus || "ENABLED",
      locationTypes: input.locationTypes || ["WAREHOUSE"],
      location: {
        address: {
          country: input.country,
          postalCode: input.postalCode,
        },
      },
    };

    let created = true;
    try {
      await axios.post(
        `${this.getBaseUrl(credentials)}/location/${encodeURIComponent(merchantLocationKey)}`,
        body,
        { headers: this.headersForToken(token, credentials), timeout: 15000 }
      );
    } catch (error: any) {
      if (error.response?.status === 409) {
        created = false;
      } else {
        return { success: false, error: `eBay inventory location create failed: ${this.sanitizeError(error, token)}` };
      }
    }

    if (integrationId) {
      await Integration.findByIdAndUpdate(integrationId, {
        $set: { "credentials.merchantLocationKey": merchantLocationKey },
      });
    }
    if (credentials) credentials.merchantLocationKey = merchantLocationKey;

    return { success: true, merchantLocationKey, created };
  }

  private getCommerceHost(credentials?: Record<string, unknown>): string {
    const sandbox = credentials?.environment
      ? credentials.environment === "sandbox"
      : env.EBAY_ENVIRONMENT === "sandbox";
    return sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
  }

  private marketplaceIdFor(credentials?: Record<string, unknown>): string {
    return String(credentials?.marketplaceId || env.EBAY_MARKETPLACE_ID || "EBAY_US");
  }

  /**
   * Taxonomy API: default category tree for the integration marketplace.
   * The tree id comes from eBay. It is not a listing category id.
   */
  public async getDefaultCategoryTreeId(
    credentials: Record<string, unknown>,
    _integrationId?: string
  ): Promise<{ categoryTreeId: string; marketplaceId: string }> {
    const token = await this.getApplicationAccessToken(credentials);
    const marketplaceId = this.marketplaceIdFor(credentials);
    try {
      const response = await axios.get(
        `${this.getCommerceHost(credentials)}/commerce/taxonomy/v1/get_default_category_tree_id`,
        {
          params: { marketplace_id: marketplaceId },
          headers: this.headersForToken(token, credentials),
          timeout: 15000,
        }
      );
      const categoryTreeId = String(response.data?.categoryTreeId || "").trim();
      if (!categoryTreeId) throw new Error("eBay did not return a category tree id");
      return { categoryTreeId, marketplaceId };
    } catch (error: any) {
      if (error?.message === "eBay did not return a category tree id") throw error;
      throw new Error(`eBay category tree lookup failed: ${this.sanitizeError(error, token)}`);
    }
  }

  /**
   * Taxonomy API: leaf category suggestions for a search query.
   */
  public async getCategorySuggestions(
    credentials: Record<string, unknown>,
    integrationId: string | undefined,
    query: string
  ): Promise<{
    categoryTreeId: string;
    marketplaceId: string;
    suggestions: Array<{
      categoryId: string;
      categoryName: string;
      categoryPath: string;
      leafCategory: boolean;
      ancestors: Array<{ categoryId: string; categoryName: string }>;
    }>;
  }> {
    const q = query.trim();
    if (!q) throw new Error("Category search query is required");
    const tree = await this.getDefaultCategoryTreeId(credentials, integrationId);
    const token = await this.getApplicationAccessToken(credentials);
    try {
      const response = await axios.get(
        `${this.getCommerceHost(credentials)}/commerce/taxonomy/v1/category_tree/${encodeURIComponent(tree.categoryTreeId)}/get_category_suggestions`,
        {
          params: { q },
          headers: this.headersForToken(token, credentials),
          timeout: 15000,
        }
      );
      const suggestions = (response.data?.categorySuggestions || []).map((item: any) => {
        const category = item?.category || {};
        const ancestors = (Array.isArray(item?.categoryTreeNodeAncestors) ? item.categoryTreeNodeAncestors : [])
          .map((ancestor: any) => ({
            categoryId: String(ancestor?.categoryId || ""),
            categoryName: String(ancestor?.categoryName || ""),
          }))
          .filter((ancestor: { categoryId: string }) => ancestor.categoryId);
        const rootToParent = [...ancestors].reverse();
        const categoryName = String(category.categoryName || "");
        const categoryPath = [...rootToParent.map((ancestor) => ancestor.categoryName), categoryName]
          .filter(Boolean)
          .join(" > ");
        return {
          categoryId: String(category.categoryId || ""),
          categoryName,
          categoryPath,
          leafCategory: true,
          ancestors: rootToParent,
        };
      }).filter((item: { categoryId: string }) => item.categoryId);
      return { categoryTreeId: tree.categoryTreeId, marketplaceId: tree.marketplaceId, suggestions };
    } catch (error: any) {
      throw new Error(`eBay category suggestion failed: ${this.sanitizeError(error, token)}`);
    }
  }

  /**
   * Taxonomy API: required and recommended aspects for a leaf category.
   * Uses the application token, not the seller token.
   */
  public async getItemAspectsForCategory(
    credentials: Record<string, unknown>,
    categoryId: string
  ): Promise<Array<{
    name: string;
    required: boolean;
    recommended: boolean;
    values: string[];
  }>> {
    const tree = await this.getDefaultCategoryTreeId(credentials);
    const token = await this.getApplicationAccessToken(credentials);
    try {
      const response = await axios.get(
        `${this.getCommerceHost(credentials)}/commerce/taxonomy/v1/category_tree/${encodeURIComponent(tree.categoryTreeId)}/get_item_aspects_for_category`,
        {
          params: { category_id: categoryId },
          headers: this.headersForToken(token, credentials),
          timeout: 15000,
        }
      );
      return (response.data?.aspects || []).map((aspect: any) => ({
        name: String(aspect?.localizedAspectName || ""),
        required: aspect?.aspectConstraint?.aspectRequired === true,
        recommended: aspect?.aspectConstraint?.aspectUsage === "RECOMMENDED",
        values: (aspect?.aspectValues || [])
          .map((value: any) => String(value?.localizedValue || ""))
          .filter(Boolean),
      })).filter((aspect: { name: string }) => aspect.name);
    } catch (error: any) {
      throw new Error(`eBay item aspect lookup failed: ${this.sanitizeError(error, token)}`);
    }
  }

  private aspectValueFor(name: string, payload: SyncPayload): string | undefined {
    const stored = payload.channelAspects || {};
    const direct = stored[name];
    if (Array.isArray(direct) && direct[0]) return String(direct[0]);
    const match = Object.entries(stored).find(([key]) => key.toLowerCase() === name.toLowerCase());
    if (match && Array.isArray(match[1]) && match[1][0]) return String(match[1][0]);
    if (name.toLowerCase() === "brand" && payload.brand?.trim()) return payload.brand.trim();
    return undefined;
  }

  private async resolveLeafCategory(payload: SyncPayload): Promise<{ categoryId?: string; categoryName?: string; error?: string }> {
    const existing = String(payload.channelCategoryId || payload.credentials?.categoryId || "").trim();
    if (existing) {
      return { categoryId: existing, categoryName: payload.channelCategoryName };
    }
    const query = String(payload.title || payload.category || "").trim();
    if (!query) {
      return { error: "eBay categoryId is required. Choose a leaf category before publishing." };
    }
    try {
      const suggestions = await this.getCategorySuggestions(payload.credentials || {}, payload.integrationId, query);
      const leaf = suggestions.suggestions.find((item) => item.leafCategory && item.categoryId);
      if (!leaf) {
        return { error: "eBay categoryId is required. No leaf category matched this product. Choose a category before publishing." };
      }
      return { categoryId: leaf.categoryId, categoryName: leaf.categoryName };
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("category")) return { error: message };
      return { error: `eBay categoryId is required. ${message}` };
    }
  }

  private async loadFulfillmentPolicy(
    credentials: Record<string, unknown>,
    integrationId?: string,
    token?: string
  ): Promise<string | null> {
    if (credentials.fulfillmentPolicyId) return null;
    const accessToken = token || await this.ensureValidAccessToken(credentials, integrationId);
    const sandbox = credentials.environment === "sandbox" || (!credentials.environment && env.EBAY_ENVIRONMENT === "sandbox");
    const apiHost = sandbox ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
    const marketplaceId = this.marketplaceIdFor(credentials);
    try {
      const response = await axios.get(`${apiHost}/sell/account/v1/fulfillment_policy`, {
        params: { marketplace_id: marketplaceId },
        headers: this.headersForToken(accessToken, credentials),
        timeout: 15000,
      });
      const policyId = String(response.data?.fulfillmentPolicies?.[0]?.fulfillmentPolicyId || "");
      if (!policyId) return "eBay fulfillment policy required";
      credentials.fulfillmentPolicyId = policyId;
      if (integrationId) {
        await Integration.findByIdAndUpdate(integrationId, {
          $set: { "credentials.fulfillmentPolicyId": policyId },
        });
      }
      return null;
    } catch (error: any) {
      return `eBay fulfillment policy required: ${this.sanitizeError(error, accessToken)}`;
    }
  }

  /**
   * Sanitize error messages to prevent token leaks
   */
  private sanitizeError(error: any, token: string): string {
    if (error.response?.status === 401) {
      return "eBay authentication error (HTTP 401). Check OAuth access token validity.";
    }

    if (error.response?.status === 403) {
      return "eBay authorization error (HTTP 403). Insufficient API scope permissions.";
    }

    if (error.response?.status === 404) {
      return "eBay resource not found (HTTP 404). Listing or offer does not exist.";
    }

    if (error.response?.status === 409) {
      return "eBay conflict error (HTTP 409). Duplicate SKU or offer conflict.";
    }

    if (error.response?.status === 429) {
      return "eBay API rate limit exceeded (HTTP 429).";
    }

    const rawMsg =
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      "eBay API operation failed";

    return rawMsg.replace(new RegExp(token, "g"), "***MASKED***");
  }

  /**
   * Health Check: Lightweight test connection to eBay Inventory API
   */
  async testConnection(
    credentials?: Record<string, unknown>,
    _storeUrl?: string,
    integrationId?: string
  ): Promise<HealthCheckResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        message: "eBay connection test successful (Mock Mode)",
      };
    }

    try {
      const token = await this.ensureValidAccessToken(credentials, integrationId);
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.headersForToken(token, credentials);

      await axios.get(`${baseUrl}/inventory_item?limit=1&offset=0`, {
        headers,
        timeout: 10000,
      });

      return {
        success: true,
        message: "eBay connection healthy: OAuth access token validated successfully",
      };
    } catch (err: any) {
      const token = String(credentials?.accessToken || "");
      const sanitizedMsg = this.sanitizeError(err, token);

      return {
        success: false,
        message: `eBay connection test failed: ${sanitizedMsg}`,
      };
    }
  }

  /**
   * CREATE Product listing on eBay via Sell Inventory API
   * Canonical Mapping: externalProductId = offerId, externalVariantId = listingId (if published)
   */
  async createProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `OFFER-MOCK-${Date.now()}`,
        externalVariantId: payload.externalVariantId || `LISTING-MOCK-${Date.now()}`,
        externalSku: payload.sku,
      };
    }

    const credentials = payload.credentials || {};
    payload.credentials = credentials;
    const token = await this.ensureValidAccessToken(credentials, payload.integrationId);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.headersForToken(token, credentials);

    const sku = payload.sku;
    const listingCurrency = this.resolveListingCurrency(payload);
    if (listingCurrency.error) return { success: false, error: listingCurrency.error };

    const policyError = await this.loadFulfillmentPolicy(credentials, payload.integrationId, token);
    if (policyError) return { success: false, error: policyError };
    const setupError = this.listingSetupError(credentials);
    if (setupError) return { success: false, error: setupError };

    const category = await this.resolveLeafCategory(payload);
    if (!category.categoryId) {
      return { success: false, error: category.error || "eBay categoryId is required. Choose a leaf category before publishing." };
    }
    if (!payload.images?.some((image) => /^https?:\/\//i.test(String(image)))) {
      return {
        success: false,
        error: "eBay listing requires at least one image URL before publishing.",
        categoryId: category.categoryId,
        categoryName: category.categoryName,
      };
    }

    let aspectMetadata: Array<{ name: string; required: boolean; recommended: boolean; values: string[] }> = [];
    try {
      aspectMetadata = await this.getItemAspectsForCategory(credentials, category.categoryId);
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "eBay item aspect lookup failed",
        categoryId: category.categoryId,
        categoryName: category.categoryName,
      };
    }
    const aspects: Record<string, string[]> = {};
    const missingAspects: string[] = [];
    for (const aspect of aspectMetadata) {
      const value = this.aspectValueFor(aspect.name, payload);
      if (!value || (aspect.values.length > 0 && !aspect.values.includes(value))) {
        if (aspect.required) missingAspects.push(aspect.name);
        continue;
      }
      aspects[aspect.name] = [value];
    }
    if (missingAspects.length > 0) {
      return {
        success: false,
        error: `eBay listing is missing required item aspects: ${missingAspects.join(", ")}.`,
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        missingAspects,
      };
    }
    payload.aspects = aspects;

    const fulfillmentPolicyId = credentials?.fulfillmentPolicyId as string;
    const paymentPolicyId = credentials?.paymentPolicyId as string;
    const returnPolicyId = credentials?.returnPolicyId as string;
    const merchantLocationKey = credentials?.merchantLocationKey as string;
    const categoryId = category.categoryId;
    const inventoryItemBody = this.inventoryItemBody(payload);

    try {
      await axios.put(`${baseUrl}/inventory_item/${encodeURIComponent(sku)}`, inventoryItemBody, {
        headers,
        timeout: 15000,
      });
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Inventory Item Create Error: ${errorMsg}` };
    }

    const offerBody = {
      sku,
      marketplaceId: this.marketplaceIdFor(credentials),
      format: "FIXED_PRICE",
      listingDuration: "GTC",
      categoryId,
      availableQuantity: payload.status === "ACTIVE" ? Math.max(0, payload.quantity) : 0,
      pricingSummary: {
        price: {
          value: String(payload.price),
          currency: listingCurrency.currency,
        },
      },
      listingPolicies: {
        fulfillmentPolicyId,
        paymentPolicyId,
        returnPolicyId,
      },
      merchantLocationKey,
    };

    let offerId = "";

    try {
      const offerRes = await axios.post(`${baseUrl}/offer`, offerBody, {
        headers,
        timeout: 15000,
      });

      offerId = offerRes.data?.offerId || "";
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Offer Create Error: ${errorMsg}` };
    }

    if (!offerId) {
      return {
        success: false,
        error: "eBay offer creation succeeded but returned no offerId",
      };
    }

    let listingId = "";

    try {
      const publishRes = await axios.post(`${baseUrl}/offer/${offerId}/publish`, {}, {
        headers,
        timeout: 15000,
      });

      listingId = publishRes.data?.listingId || "";
      if (!listingId) {
        return { success: false, error: "eBay published the offer without returning a listing ID" };
      }
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Offer Publish Error: ${errorMsg}` };
    }

    return {
      success: true,
      externalProductId: offerId,
      externalVariantId: listingId,
      externalSku: sku,
      categoryId,
      categoryName: category.categoryName,
      aspects,
      missingAspects: [],
    };
  }

  /**
   * UPDATE Product listing on eBay
   */
  async updateProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `OFFER-MOCK-${Date.now()}`,
        externalVariantId: payload.externalVariantId || `LISTING-MOCK-${Date.now()}`,
        externalSku: payload.sku,
      };
    }

    if (!payload.externalProductId) {
      return {
        success: false,
        error: "External product ID (eBay offerId) is required for UPDATE operation",
      };
    }

    const credentials = payload.credentials;
    const token = await this.ensureValidAccessToken(credentials, payload.integrationId);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.headersForToken(token, credentials);

    const offerId = payload.externalProductId;
    const sku = payload.sku;
    const listingCurrency = this.resolveListingCurrency(payload);
    if (listingCurrency.error) return { success: false, error: listingCurrency.error };
    const inventoryItemBody = this.inventoryItemBody(payload);

    try {
      await axios.put(`${baseUrl}/inventory_item/${encodeURIComponent(sku)}`, inventoryItemBody, {
        headers,
        timeout: 15000,
      });
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Inventory Item Update Error: ${errorMsg}` };
    }

    const bulkUpdateBody = {
      requests: [
        {
          sku,
          offers: [
            {
              offerId,
              price: {
                value: String(payload.price),
                currency: listingCurrency.currency,
              },
            },
          ],
          shipToLocationAvailability: {
            quantity: payload.status === "ACTIVE" ? Math.max(0, payload.quantity) : 0,
          },
        },
      ],
    };

    try {
      const response = await axios.post(`${baseUrl}/bulk_update_price_quantity`, bulkUpdateBody, {
        headers,
        timeout: 15000,
      });
      const failed = (response.data?.responses || []).find((entry: any) => entry.statusCode >= 400 || entry.errors?.length);
      if (failed) {
        return { success: false, error: `eBay rejected price/quantity update: ${failed.errors?.map((item: any) => item.message).join("; ") || `HTTP ${failed.statusCode}`}` };
      }
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Price/Quantity Update Error: ${errorMsg}` };
    }

    return {
      success: true,
      externalProductId: offerId,
      externalVariantId: payload.externalVariantId,
      externalSku: sku,
    };
  }

  /**
   * DELETE / End Product listing on eBay
   */
  async deleteProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId,
      };
    }

    if (!payload.externalProductId) {
      return {
        success: false,
        error: "External product ID (eBay offerId) is required for DELETE operation",
      };
    }

    const credentials = payload.credentials;
    const token = await this.ensureValidAccessToken(credentials, payload.integrationId);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.headersForToken(token, credentials);

    const offerId = payload.externalProductId;

    try {
      await axios.post(`${baseUrl}/offer/${offerId}/withdraw`, {}, { headers, timeout: 15000 });
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      return { success: false, error: `eBay Listing Withdraw Error: ${errorMsg}` };
    }

    if (payload.sku) {
      try {
        await axios.put(
          `${baseUrl}/inventory_item/${encodeURIComponent(payload.sku)}`,
          {
            availability: {
              shipToLocationAvailability: {
                quantity: 0,
              },
            },
          },
          { headers, timeout: 15000 }
        );
      } catch (err: any) {
        const errorMsg = this.sanitizeError(err, token);
        return { success: false, error: `eBay inventory withdrawal failed: ${errorMsg}` };
      }
    }

    return {
      success: true,
      externalProductId: offerId,
    };
  }

  /**
   * Inbound Catalog Import: Fetch eBay Inventory Items with offset pagination
   */
  async fetchChannelProducts(
    credentials?: Record<string, unknown>,
    cursor?: string | null,
    limit: number = 50,
    _storeUrl?: string,
    integrationId?: string
  ): Promise<PaginatedChannelProducts> {
    const baseUrl = this.getBaseUrl(credentials);
    const token = await this.ensureValidAccessToken(credentials, integrationId);
    const headers = this.headersForToken(token, credentials);

    const fetchLimit = Math.min(100, Math.max(1, limit));
    const offset = cursor ? Number(cursor) || 0 : 0;

    try {
      const response = await axios.get(
        `${baseUrl}/inventory_item?limit=${fetchLimit}&offset=${offset}`,
        { headers, timeout: 15000 }
      );

      const items = response.data?.inventoryItems || [];
      const total = Number(response.data?.total) || 0;
      const nextOffset = offset + items.length;
      const hasNextPage = nextOffset < total && items.length > 0;

      const normalizedList: NormalizedChannelProduct[] = [];
      const importErrors: Array<{ sku: string; message: string }> = [];

      for (const item of items) {
        const rawSku = (item.sku || "").trim();
        if (!rawSku) continue;

        const skuUpper = rawSku.toUpperCase();
        const prod = item.product || {};
        const title = prod.title || "Untitled Product";
        const description = prod.description || "";
        const brand = prod.aspects?.Brand?.[0] || "";
        const images = prod.imageUrls || [];
        const quantity = Number(item.availability?.shipToLocationAvailability?.quantity) || 0;

        let publishedOffer: any;

        // Query offer associated with SKU. One SKU failure must not abort the page.
        try {
          const offerRes = await axios.get(`${baseUrl}/offer`, {
            params: { sku: rawSku, marketplace_id: credentials?.marketplaceId || env.EBAY_MARKETPLACE_ID || "EBAY_US", limit: 100 },
            headers,
            timeout: 10000,
          });
          const offers = offerRes.data?.offers || [];
          if (offers.length > 0) {
            publishedOffer = offers.find((offer: any) => offer.status === "PUBLISHED") || offers[0];
          }
        } catch (err: any) {
          importErrors.push({
            sku: skuUpper,
            message: `eBay offer lookup failed for SKU ${skuUpper}: ${this.sanitizeError(err, token)}`,
          });
          continue;
        }

        // Inventory items without an offer are not published listings; don't fabricate an offer ID.
        if (!publishedOffer?.offerId) {
          importErrors.push({
            sku: skuUpper,
            message: `eBay inventory item ${skuUpper} has no offer to import`,
          });
          continue;
        }
        const offerPrice = Number(publishedOffer.pricingSummary?.price?.value);
        const currency = String(publishedOffer.pricingSummary?.price?.currency || credentials?.currency || "USD");
        normalizedList.push({
          sku: skuUpper,
          title,
          description,
          brand,
          category: String(publishedOffer.categoryId || ""),
          categoryId: String(publishedOffer.categoryId || ""),
          images,
          price: Number.isFinite(offerPrice) ? offerPrice : 0,
          currency,
          quantity,
          shippingCharge: 0,
          status: publishedOffer.status === "PUBLISHED" ? "ACTIVE" : "DRAFT",
          externalProductId: publishedOffer.offerId,
          externalVariantId: publishedOffer.listing?.listingId || "",
          externalSku: skuUpper,
        });
      }

      return {
        products: normalizedList,
        nextCursor: hasNextPage ? String(nextOffset) : null,
        hasNextPage,
        errors: importErrors,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      throw new Error(`eBay Catalog Import Fetch Error: ${errorMsg}`);
    }
  }
}
