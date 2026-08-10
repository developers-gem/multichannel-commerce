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

export class CustomWebsiteConnector implements IMarketplaceConnector, IChannelImportConnector {
  /**
   * Helper to format base URL from credentials or storeUrl
   */
  private getBaseUrl(credentials?: Record<string, unknown>): string {
    const rawUrl =
      (credentials?.baseUrl as string) ||
      (credentials?.storeUrl as string) ||
      "";

    if (!rawUrl || !rawUrl.trim()) {
      throw new Error("Custom Website baseUrl is missing in integration credentials");
    }

    let cleanUrl = rawUrl.trim();
    cleanUrl = cleanUrl.replace(/\/+$/, "");
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    return cleanUrl;
  }

  /**
   * Helper to generate sanitized authentication headers
   */
  private getHeaders(credentials?: Record<string, unknown>) {
    const apiKey =
      (credentials?.apiKey as string) ||
      (credentials?.accessToken as string) ||
      (credentials?.token as string);

    if (!apiKey || !apiKey.trim()) {
      throw new Error("Custom Website API key or access token is missing in integration credentials");
    }

    const cleanKey = apiKey.trim();

    return {
      "X-API-Key": cleanKey,
      Authorization: `Bearer ${cleanKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Sanitize error messages to prevent token/API key exposure
   */
  private sanitizeError(error: any, credentials?: Record<string, unknown>): string {
    const apiKey =
      (credentials?.apiKey as string) ||
      (credentials?.accessToken as string) ||
      (credentials?.token as string) ||
      "";

    if (error.response?.status === 401) {
      return "Custom Website authentication error (HTTP 401). Invalid API key or access token.";
    }

    if (error.response?.status === 403) {
      return "Custom Website authorization error (HTTP 403). Insufficient permissions.";
    }

    if (error.response?.status === 404) {
      return "Custom Website endpoint or product resource not found (HTTP 404).";
    }

    if (error.response?.status === 409) {
      return "Custom Website conflict error (HTTP 409). Duplicate SKU or product already exists.";
    }

    if (error.response?.status === 429) {
      return "Custom Website API rate limit exceeded (HTTP 429).";
    }

    const rawMsg =
      error.response?.data?.message ||
      error.message ||
      "Custom Website API request failed";

    if (apiKey) {
      return rawMsg.replace(new RegExp(apiKey, "g"), "***MASKED***");
    }

    return rawMsg;
  }

  /**
   * Health Check: Lightweight test connection to Custom Website API
   */
  async testConnection(
    credentials?: Record<string, unknown>,
    _storeUrl?: string
  ): Promise<HealthCheckResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        message: "Custom Website connection test successful (Mock Mode)",
      };
    }

    try {
      const baseUrl = this.getBaseUrl(credentials);
      const headers = this.getHeaders(credentials);

      await axios.get(`${baseUrl}/api/products/sync?page=1&limit=1`, {
        headers,
        timeout: 10000,
      });

      return {
        success: true,
        message: `Custom Website connection healthy: Connected to endpoint ${baseUrl}`,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, credentials);
      return {
        success: false,
        message: `Custom Website connection test failed: ${errorMsg}`,
      };
    }
  }

  /**
   * CREATE Product on Custom Website
   */
  async createProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `CUSTOM-MOCK-${Date.now()}`,
        externalVariantId: payload.externalVariantId || ``,
        externalSku: payload.sku,
      };
    }

    const baseUrl = this.getBaseUrl(payload.credentials);
    const credentials = payload.credentials;
    const headers = this.getHeaders(credentials);

    const body = {
      sku: payload.sku,
      title: payload.title,
      description: payload.description || "",
      brand: payload.brand || "",
      category: payload.category || "",
      images: payload.images || [],
      price: payload.price,
      quantity: payload.quantity,
      shippingCharge: payload.shippingCharge || 0,
      status: payload.status || "ACTIVE",
    };

    try {
      const response = await axios.post(`${baseUrl}/api/products/sync`, body, {
        headers,
        timeout: 15000,
      });

      const responseData = response.data;
      const externalProductId =
        responseData?.externalProductId ||
        responseData?.id ||
        responseData?.data?.externalProductId ||
        responseData?.data?.id;

      if (!externalProductId) {
        return {
          success: false,
          error: "Custom Website product creation succeeded but returned no externalProductId",
        };
      }

      return {
        success: true,
        externalProductId: String(externalProductId),
        externalSku: payload.sku,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, credentials);
      return { success: false, error: `Custom Website Product Create Error: ${errorMsg}` };
    }
  }

  /**
   * UPDATE Product on Custom Website
   */
  async updateProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `CUSTOM-MOCK-${Date.now()}`,
        externalVariantId: payload.externalVariantId || ``,
        externalSku: payload.sku,
      };
    }

    if (!payload.externalProductId) {
      return {
        success: false,
        error: "External product ID is required for UPDATE operation on Custom Website",
      };
    }

    const baseUrl = this.getBaseUrl(payload.credentials);
    const credentials = payload.credentials;
    const headers = this.getHeaders(credentials);

    const body = {
      sku: payload.sku,
      title: payload.title,
      description: payload.description || "",
      brand: payload.brand || "",
      category: payload.category || "",
      images: payload.images || [],
      price: payload.price,
      quantity: payload.quantity,
      shippingCharge: payload.shippingCharge || 0,
      status: payload.status || "ACTIVE",
    };

    try {
      await axios.put(
        `${baseUrl}/api/products/sync/${encodeURIComponent(payload.externalProductId)}`,
        body,
        { headers, timeout: 15000 }
      );

      return {
        success: true,
        externalProductId: payload.externalProductId,
        externalVariantId: payload.externalVariantId,
        externalSku: payload.sku,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, credentials);
      return { success: false, error: `Custom Website Product Update Error: ${errorMsg}` };
    }
  }

  /**
   * DELETE Product on Custom Website
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
        error: "External product ID is required for DELETE operation on Custom Website",
      };
    }

    const baseUrl = this.getBaseUrl(payload.credentials);
    const credentials = payload.credentials;
    const headers = this.getHeaders(credentials);

    try {
      await axios.delete(
        `${baseUrl}/api/products/sync/${encodeURIComponent(payload.externalProductId)}`,
        { headers, timeout: 15000 }
      );

      return {
        success: true,
        externalProductId: payload.externalProductId,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, credentials);
      return { success: false, error: `Custom Website Product Delete Error: ${errorMsg}` };
    }
  }

  /**
   * Inbound Catalog Import: Fetch Custom Website products page by page via GET API contract
   */
  async fetchChannelProducts(
    credentials?: Record<string, unknown>,
    cursor?: string | null,
    limit: number = 50
  ): Promise<PaginatedChannelProducts> {
    const baseUrl = this.getBaseUrl(credentials);
    const headers = this.getHeaders(credentials);

    const page = cursor ? Number(cursor) || 1 : 1;

    try {
      const response = await axios.get(
        `${baseUrl}/api/products/sync?page=${page}&limit=${limit}`,
        { headers, timeout: 15000 }
      );

      const responseData = response.data?.data || response.data || {};
      const rawProducts = responseData.products || [];
      const pagination = responseData.pagination || {};

      const totalPages = Number(pagination.totalPages) || 1;
      const hasNextPage = page < totalPages;
      const nextCursor = hasNextPage ? String(page + 1) : null;

      const normalizedList: NormalizedChannelProduct[] = [];

      for (const item of rawProducts) {
        const rawSku = (item.sku || "").trim();
        if (!rawSku) continue;

        const skuUpper = rawSku.toUpperCase();
        const extId = String(item.externalProductId || item.id || `CUSTOM-${skuUpper}`);

        normalizedList.push({
          sku: skuUpper,
          title: item.title || "Untitled Product",
          description: item.description || "",
          brand: item.brand || "",
          category: item.category || "",
          images: item.images || [],
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
          shippingCharge: Number(item.shippingCharge) || 0,
          status: item.status || "ACTIVE",
          externalProductId: extId,
          externalVariantId: item.externalVariantId || "",
          externalSku: skuUpper,
        });
      }

      return {
        products: normalizedList,
        nextCursor,
        hasNextPage,
      };
    } catch (err: any) {
      const errorMsg = this.sanitizeError(err, credentials);
      throw new Error(`Custom Website Catalog Import Fetch Error: ${errorMsg}`);
    }
  }
}
