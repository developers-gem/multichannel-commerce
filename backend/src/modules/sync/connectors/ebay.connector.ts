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

  private headersForToken(token: string, credentials?: Record<string, unknown>) {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
      ...(credentials?.marketplaceId ? { "X-EBAY-C-MARKETPLACE-ID": String(credentials.marketplaceId) } : {}),
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

    const credentials = payload.credentials;
    const token = await this.ensureValidAccessToken(credentials, payload.integrationId);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.headersForToken(token, credentials);

    const sku = payload.sku;
    const fulfillmentPolicyId = credentials?.fulfillmentPolicyId as string;
    const paymentPolicyId = credentials?.paymentPolicyId as string;
    const returnPolicyId = credentials?.returnPolicyId as string;
    const merchantLocationKey = credentials?.merchantLocationKey as string;

    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId || !merchantLocationKey) {
      return {
        success: false,
        error: "eBay listing policies or inventory location are not configured. Reconnect or select valid seller policies.",
      };
    }

    const inventoryItemBody = {
      product: {
        title: payload.title,
        description: payload.description || "",
        aspects: {
          Brand: [payload.brand || "Unbranded"],
        },
        imageUrls: payload.images || [],
      },
      availability: {
        shipToLocationAvailability: {
          quantity: payload.status === "ACTIVE" ? Math.max(0, payload.quantity) : 0,
        },
      },
    };

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
      marketplaceId: (credentials?.marketplaceId as string) || "EBAY_US",
      format: "FIXED_PRICE",
      pricingSummary: {
        price: {
          value: String(payload.price),
          currency: payload.currency || (credentials?.currency as string) || "USD",
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

    const inventoryItemBody = {
      product: {
        title: payload.title,
        description: payload.description || "",
        aspects: {
          Brand: [payload.brand || "Unbranded"],
        },
        imageUrls: payload.images || [],
      },
      availability: {
        shipToLocationAvailability: {
          quantity: payload.status === "ACTIVE" ? Math.max(0, payload.quantity) : 0,
        },
      },
    };

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
                currency: payload.currency || (credentials?.currency as string) || "USD",
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

        // Query offer associated with SKU
        try {
          const offerRes = await axios.get(`${baseUrl}/offer`, {
            params: { sku: rawSku, marketplace_id: credentials?.marketplaceId || "EBAY_US", limit: 100 },
            headers,
            timeout: 10000,
          });
          const offers = offerRes.data?.offers || [];
          if (offers.length > 0) {
            publishedOffer = offers.find((offer: any) => offer.status === "PUBLISHED") || offers[0];
          }
        } catch (err: any) {
          throw new Error(`eBay offer lookup failed for SKU ${skuUpper}: ${this.sanitizeError(err, token)}`);
        }

        // Inventory items without an offer are not published listings; don't fabricate an offer ID.
        if (!publishedOffer?.offerId) continue;
        const offerPrice = Number(publishedOffer.pricingSummary?.price?.value);
        const currency = String(publishedOffer.pricingSummary?.price?.currency || credentials?.currency || "USD");
        normalizedList.push({
          sku: skuUpper,
          title,
          description,
          brand,
          category: "",
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
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, token);
      throw new Error(`eBay Catalog Import Fetch Error: ${errorMsg}`);
    }
  }
}
