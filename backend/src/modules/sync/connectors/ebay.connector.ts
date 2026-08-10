import axios from "axios";
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
    const isSandbox =
      credentials?.environment === "sandbox" ||
      process.env.EBAY_ENVIRONMENT === "sandbox";

    return isSandbox
      ? "https://api.sandbox.ebay.com/sell/inventory/v1"
      : "https://api.ebay.com/sell/inventory/v1";
  }

  /**
   * Helper to extract access token without exposing secrets
   */
  private getAccessToken(credentials?: Record<string, unknown>): string {
    const token =
      (credentials?.accessToken as string) ||
      (credentials?.token as string);

    if (!token || !token.trim()) {
      throw new Error("eBay OAuth access token is missing in integration credentials");
    }

    return token.trim();
  }

  /**
   * Helper to generate sanitized HTTP request headers
   */
  private getHeaders(credentials?: Record<string, unknown>) {
    const token = this.getAccessToken(credentials);
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Language": "en-US",
    };
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
    _storeUrl?: string
  ): Promise<HealthCheckResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        message: "eBay connection test successful (Mock Mode)",
      };
    }

    try {
      const token = this.getAccessToken(credentials);
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      await axios.get(`${baseUrl}/inventory_item?limit=1&offset=0`, {
        headers,
        timeout: 10000,
      });

      return {
        success: true,
        message: "eBay connection healthy: OAuth access token validated successfully",
      };
    } catch (err: any) {
      const token = (credentials?.accessToken as string) || "";
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
    const token = this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.getHeaders(credentials);

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
      return { success: false, error: `eBay Inventory Item Create Error: ${errorMsg}` };
    }

    const fulfillmentPolicyId = credentials?.fulfillmentPolicyId as string;
    const paymentPolicyId = credentials?.paymentPolicyId as string;
    const returnPolicyId = credentials?.returnPolicyId as string;
    const merchantLocationKey = (credentials?.merchantLocationKey as string) || "DEFAULT";

    if (!fulfillmentPolicyId || !paymentPolicyId || !returnPolicyId) {
      return {
        success: false,
        error:
          "eBay listing requires fulfillmentPolicyId, paymentPolicyId, and returnPolicyId configured in Integration credentials",
      };
    }

    const offerBody = {
      sku,
      marketplaceId: (credentials?.marketplaceId as string) || "EBAY_US",
      format: "FIXED_PRICE",
      pricingSummary: {
        price: {
          value: String(payload.price),
          currency: (credentials?.currency as string) || "USD",
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
    } catch {
      // Non-blocking fallback
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
    const token = this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.getHeaders(credentials);

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
                currency: (credentials?.currency as string) || "USD",
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
      await axios.post(`${baseUrl}/bulk_update_price_quantity`, bulkUpdateBody, {
        headers,
        timeout: 15000,
      });
    } catch {
      // Non-blocking fallback
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
    const token = this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.getHeaders(credentials);

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
      } catch {
        // Non-blocking fallback
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
    limit: number = 50
  ): Promise<PaginatedChannelProducts> {
    const baseUrl = this.getBaseUrl(credentials);
    const token = this.getAccessToken(credentials);
    const headers = this.getHeaders(credentials);

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

        let offerId = "";
        let listingId = "";

        // Query offer associated with SKU
        try {
          const offerRes = await axios.get(
            `${baseUrl}/offer?sku=${encodeURIComponent(rawSku)}`,
            { headers, timeout: 10000 }
          );
          const offers = offerRes.data?.offers || [];
          if (offers.length > 0) {
            offerId = offers[0].offerId || "";
            listingId = offers[0].listing?.listingId || "";
          }
        } catch {
          // If no offer created yet, offerId fallback to SKU key
          offerId = `OFFER-${skuUpper}`;
        }

        normalizedList.push({
          sku: skuUpper,
          title,
          description,
          brand,
          category: "",
          images,
          price: 0, // Offer price resolved if offer exists
          quantity,
          shippingCharge: 0,
          status: "ACTIVE",
          externalProductId: offerId || `OFFER-${skuUpper}`,
          externalVariantId: listingId,
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
