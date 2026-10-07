import axios from "axios";
import { env } from "../../../config/env";
import { redisConnection } from "../../../config/redis";
import Integration from "../../integrations/integration.model";
import { normalizeShopifyDomain } from "../../../utils/shopify.utils";
import {
  HealthCheckResult,
  IChannelImportConnector,
  IMarketplaceConnector,
  NormalizedChannelProduct,
  PaginatedChannelProducts,
  SyncPayload,
  SyncResult,
} from "./connector.interface";

export class ShopifyConnector implements IMarketplaceConnector, IChannelImportConnector {
  /**
   * Helper to format Shopify GraphQL API endpoint URL dynamically from env config
   */
  private getEndpoint(storeUrl: string): string {
    if (!storeUrl) {
      throw new Error("Shopify store URL is missing");
    }

    const cleanUrl = normalizeShopifyDomain(storeUrl);
    const apiVersion = env.SHOPIFY_API_VERSION || "2026-01";
    return `https://${cleanUrl}/admin/api/${apiVersion}/graphql.json`;
  }

  private static inMemoryLocks = new Map<string, string>();

  private async acquireLock(lockKey: string, lockValue: string, ttlMs: number): Promise<boolean> {
    try {
      if (redisConnection.status === "ready") {
        const res = await redisConnection.set(lockKey, lockValue, "PX", ttlMs, "NX");
        if (res === "OK") return true;
        if (res === null) return false;
      }
    } catch (_) {}

    // In-memory fallback if Redis connection is not ready/available
    if (ShopifyConnector.inMemoryLocks.has(lockKey)) {
      return false;
    }
    ShopifyConnector.inMemoryLocks.set(lockKey, lockValue);
    setTimeout(() => {
      if (ShopifyConnector.inMemoryLocks.get(lockKey) === lockValue) {
        ShopifyConnector.inMemoryLocks.delete(lockKey);
      }
    }, ttlMs);
    return true;
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    try {
      if (redisConnection.status === "ready") {
        const currVal = await redisConnection.get(lockKey);
        if (currVal === lockValue) {
          await redisConnection.del(lockKey);
        }
      }
    } catch (_) {}

    if (ShopifyConnector.inMemoryLocks.get(lockKey) === lockValue) {
      ShopifyConnector.inMemoryLocks.delete(lockKey);
    }
  }

  /**
   * Concurrency-Safe Token Refresh Handler per Integration using Redis distributed locks with in-memory fallback
   */
  public async ensureValidAccessToken(
    storeUrl: string,
    credentials?: Record<string, unknown>,
    integrationId?: string,
    forceRefresh = false
  ): Promise<string> {
    const rawToken =
      (credentials?.accessToken as string) ||
      (credentials?.token as string) ||
      (credentials?.apiKey as string) ||
      "";

    const refreshToken = credentials?.refreshToken as string | undefined;
    const rawExpiresAt = credentials?.expiresAt;
    const expiresAt = rawExpiresAt ? new Date(rawExpiresAt as string | number | Date).getTime() : 0;

    const cleanShop = normalizeShopifyDomain(storeUrl);
    const isExpiredOrNear = expiresAt > 0 && expiresAt <= Date.now() + 5 * 60 * 1000;

    if (!forceRefresh && !isExpiredOrNear) {
      if (rawToken && rawToken.trim()) {
        return rawToken.trim();
      }
      throw new Error("Shopify access token is missing in integration credentials");
    }

    if (!refreshToken) {
      if (rawToken && rawToken.trim()) {
        return rawToken.trim();
      }
      throw new Error("Shopify access token is expired and no refresh_token is available");
    }

    if (!integrationId) {
      const res = await this.performShopifyTokenRefresh(cleanShop, refreshToken);
      return res.accessToken;
    }

    const lockKey = `lock:token-refresh:${integrationId}`;
    const lockValue = `${Date.now()}:${Math.random().toString(36).substring(2)}`;
    const LOCK_TTL_MS = 15000;

    const acquired = await this.acquireLock(lockKey, lockValue, LOCK_TTL_MS);

    if (acquired) {
      try {
        const existingDoc = await Integration.findById(integrationId);
        if (existingDoc && existingDoc.credentials) {
          const dbExpiresAt = existingDoc.credentials.expiresAt
            ? new Date(existingDoc.credentials.expiresAt).getTime()
            : 0;
          const dbToken = existingDoc.credentials.accessToken as string;

          if (!forceRefresh && dbExpiresAt > Date.now() + 5 * 60 * 1000 && dbToken) {
            return dbToken;
          }
        }

        const refreshRes = await this.performShopifyTokenRefresh(cleanShop, refreshToken);

        const updatePayload: Record<string, any> = {
          "credentials.accessToken": refreshRes.accessToken,
        };
        if (refreshRes.expiresAt) updatePayload["credentials.expiresAt"] = refreshRes.expiresAt;
        if (refreshRes.refreshToken) updatePayload["credentials.refreshToken"] = refreshRes.refreshToken;
        if (refreshRes.scope) updatePayload["credentials.scope"] = refreshRes.scope;

        await Integration.findOneAndUpdate(
          { _id: integrationId },
          { $set: updatePayload },
          { new: true }
        );

        if (credentials) {
          credentials.accessToken = refreshRes.accessToken;
          if (refreshRes.expiresAt) credentials.expiresAt = refreshRes.expiresAt;
          if (refreshRes.refreshToken) credentials.refreshToken = refreshRes.refreshToken;
        }

        return refreshRes.accessToken;
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    } else {
      const pollIntervalMs = 500;
      const maxAttempts = 20;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const freshDoc = await Integration.findById(integrationId);
        if (freshDoc && freshDoc.credentials) {
          const freshExpiresAt = freshDoc.credentials.expiresAt
            ? new Date(freshDoc.credentials.expiresAt).getTime()
            : 0;
          const freshToken = freshDoc.credentials.accessToken as string;

          if (freshExpiresAt > Date.now() + 5 * 60 * 1000 && freshToken) {
            if (credentials) {
              credentials.accessToken = freshToken;
              credentials.expiresAt = freshDoc.credentials.expiresAt;
              if (freshDoc.credentials.refreshToken) {
                credentials.refreshToken = freshDoc.credentials.refreshToken;
              }
            }
            return freshToken;
          }
        }
      }

      throw new Error(`Shopify token refresh in progress for store ${cleanShop}, please retry`);
    }
  }

  private async performShopifyTokenRefresh(
    cleanShop: string,
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: Date; scope?: string }> {
    try {
      const res = await axios.post(
        `https://${cleanShop}/admin/oauth/access_token`,
        {
          client_id: env.SHOPIFY_CLIENT_ID,
          client_secret: env.SHOPIFY_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
        { timeout: 15000 }
      );

      const accessToken = res.data?.access_token || "";
      if (!accessToken) {
        throw new Error("Shopify token refresh returned empty access_token");
      }

      const expiresIn = res.data?.expires_in;
      const newRefreshToken = res.data?.refresh_token;
      const scope = res.data?.scope;

      return {
        accessToken,
        refreshToken: newRefreshToken || refreshToken,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
        scope,
      };
    } catch (err: any) {
      const errMsg = err.response?.data?.error_description || err.message || "Token refresh failed";
      const sanitizedMsg = String(errMsg).replace(new RegExp(refreshToken, "g"), "***MASKED***");
      throw new Error(`Shopify token refresh failed: ${sanitizedMsg}`);
    }
  }

  /**
   * Helper to extract access token without exposing it in logs/errors
   */
  private getAccessToken(credentials?: Record<string, unknown>): string {
    const token =
      (credentials?.accessToken as string) ||
      (credentials?.token as string) ||
      (credentials?.apiKey as string);

    if (!token || !token.trim()) {
      throw new Error("Shopify access token is missing in integration credentials");
    }

    return token.trim();
  }

  /**
   * Execute Shopify GraphQL request with rate limit & sanitized error handling
   */
  private async executeGraphQL(
    storeUrl: string,
    credentials: Record<string, unknown> | undefined,
    query: string,
    variables: Record<string, unknown> = {},
    integrationId?: string
  ): Promise<any> {
    const endpoint = this.getEndpoint(storeUrl);
    let token = await this.ensureValidAccessToken(storeUrl, credentials, integrationId);

    try {
      const response = await axios.post(
        endpoint,
        { query, variables },
        {
          headers: {
            "X-Shopify-Access-Token": token,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      if (response.data.errors) {
        const errMsgs = Array.isArray(response.data.errors)
          ? response.data.errors.map((e: any) => e.message).join("; ")
          : String(response.data.errors);

        if (errMsgs.toLowerCase().includes("throttled") || errMsgs.toLowerCase().includes("exceeded")) {
          throw new Error(`Shopify API Throttled: ${errMsgs}`);
        }

        throw new Error(`Shopify GraphQL Error: ${errMsgs}`);
      }

      return response.data.data;
    } catch (error: any) {
      if ((error.response?.status === 401 || error.response?.status === 403) && credentials?.refreshToken) {
        try {
          token = await this.ensureValidAccessToken(storeUrl, credentials, integrationId, true);
          const retryRes = await axios.post(
            endpoint,
            { query, variables },
            {
              headers: {
                "X-Shopify-Access-Token": token,
                "Content-Type": "application/json",
              },
              timeout: 15000,
            }
          );
          if (retryRes.data?.data) {
            return retryRes.data.data;
          }
        } catch (_) {}
      }

      if (error.response?.status === 429) {
        throw new Error("Shopify API rate limit exceeded (HTTP 429).");
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(`Shopify authentication error (HTTP ${error.response.status}). Check store URL and access token permissions.`);
      }

      if (error.response?.status === 404) {
        throw new Error("Shopify resource or endpoint not found (HTTP 404). Invalid store URL.");
      }

      const sanitizeMsg = (error.message || "Shopify API request failed")
        .replace(new RegExp(token, "g"), "***MASKED***");

      throw new Error(sanitizeMsg);
    }
  }

  /**
   * Health Check: Lightweight test connection to Shopify Admin API
   */
  async testConnection(
    credentials?: Record<string, unknown>,
    storeUrl?: string,
    integrationId?: string
  ): Promise<HealthCheckResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        message: "Shopify connection test successful (Mock Mode)",
      };
    }

    const url = (storeUrl || (credentials?.storeUrl as string) || "").trim();
    if (!url) {
      return {
        success: false,
        message: "Shopify store URL is missing in integration parameters",
      };
    }

    try {
      const query = `
        query {
          shop {
            name
            myshopifyDomain
          }
        }
      `;

      const data = await this.executeGraphQL(url, credentials, query, {}, integrationId);
      const shop = data?.shop;

      if (!shop?.myshopifyDomain) {
        return {
          success: false,
          message: "Shopify connection failed: Could not retrieve store metadata",
        };
      }

      return {
        success: true,
        message: `Shopify connection healthy: Connected to "${shop.name || shop.myshopifyDomain}" (${shop.myshopifyDomain})`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Shopify connection test failed",
      };
    }
  }

  /**
   * Resolve primary Shopify inventory location ID
   */
  private async resolveLocationId(
    storeUrl: string,
    credentials?: Record<string, unknown>,
    integrationId?: string
  ): Promise<string | null> {
    if (credentials?.locationId) {
      return String(credentials.locationId);
    }

    const query = `
      query getLocations {
        locations(first: 250, includeAppLocations: false) {
          nodes {
            id
            name
            isPrimary
            isActive
          }
        }
      }
    `;

    try {
      const data = await this.executeGraphQL(storeUrl, credentials, query, {}, integrationId);
      const locations = data?.locations?.nodes || [];

      const activeLocations = locations.filter((location: any) => location.isActive !== false);
      const primary = activeLocations.find((location: any) => location.isPrimary) || activeLocations[0];
      return primary ? primary.id : null;
    } catch (error: any) {
      throw new Error(`Unable to resolve Shopify inventory location: ${error?.message || "request failed"}`);
    }
  }

  /**
   * Map Master Product status to Shopify Product Status
   */
  private mapStatus(status?: string): string {
    const s = (status || "").toUpperCase();
    if (s === "ACTIVE") return "ACTIVE";
    return "DRAFT";
  }

  /**
   * CREATE Product on Shopify via Admin GraphQL API
   */
  async createProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `gid://shopify/Product/mock-${Date.now()}`,
        externalVariantId: payload.externalVariantId || `gid://shopify/ProductVariant/mock-${Date.now()}`,
        externalSku: payload.sku,
      };
    }

    const storeUrl = payload.storeUrl || (payload.credentials?.storeUrl as string) || "";
    const credentials = payload.credentials;

    const query = `
      mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
        productCreate(input: $input, media: $media) {
          product {
            id
            title
            variants(first: 5) {
              nodes {
                id
                sku
                price
                inventoryItem {
                  id
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title: payload.title,
        descriptionHtml: payload.description || "",
        vendor: payload.brand || "",
        productType: payload.category || "",
        status: this.mapStatus(payload.status as string),
      },
      media: (payload.images || []).map((url) => ({
        mediaContentType: "IMAGE",
        originalSource: url,
      })),
    };

    const data = await this.executeGraphQL(storeUrl, credentials, query, variables, payload.integrationId);
    const result = data?.productCreate;

    if (result?.userErrors && result.userErrors.length > 0) {
      const errMsg = result.userErrors.map((e: any) => e.message).join("; ");
      return { success: false, error: `Shopify Product Create Error: ${errMsg}` };
    }

    const createdProduct = result?.product;
    const variantNode = createdProduct?.variants?.nodes?.[0];

    if (!createdProduct?.id || !variantNode?.id) {
      return {
        success: false,
        error: "Shopify product creation succeeded but returned missing product/variant IDs",
      };
    }

    const bulkVariantQuery = `
      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          productVariants {
            id
            price
            sku
            inventoryItem {
              id
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    const variantData = await this.executeGraphQL(
      storeUrl,
      credentials,
      bulkVariantQuery,
      {
        productId: createdProduct.id,
        variants: [{ id: variantNode.id, price: String(payload.price), sku: payload.sku }],
      },
      payload.integrationId
    );
    const bulkResult = variantData?.productVariantsBulkUpdate;
    if (bulkResult?.userErrors && bulkResult.userErrors.length > 0) {
      const errMsg = bulkResult.userErrors.map((e: any) => e.message).join("; ");
      return { success: false, error: `Shopify Variant Price Error: ${errMsg}` };
    }

    const inventoryItemId =
      bulkResult?.productVariants?.[0]?.inventoryItem?.id || variantNode.inventoryItem?.id;
    const locationId = await this.resolveLocationId(storeUrl, credentials, payload.integrationId);
    if (!locationId || !inventoryItemId) {
      return { success: false, error: "Shopify inventory location or inventory item is unavailable" };
    }
    await this.setInventoryQuantity(
      storeUrl,
      credentials,
      inventoryItemId,
      locationId,
      payload.quantity,
      payload.integrationId
    );

    return {
      success: true,
      externalProductId: createdProduct.id,
      externalVariantId: variantNode.id,
      externalInventoryItemId: inventoryItemId,
      externalSku: payload.sku,
    };
  }

  /**
   * UPDATE Product & Variant on Shopify via Admin GraphQL API
   */
  async updateProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `gid://shopify/Product/mock-${Date.now()}`,
        externalVariantId: payload.externalVariantId || `gid://shopify/ProductVariant/mock-${Date.now()}`,
        externalSku: payload.sku,
      };
    }

    if (!payload.externalProductId) {
      return {
        success: false,
        error: "External product ID (Shopify Product GID) is required for UPDATE operation",
      };
    }

    const storeUrl = payload.storeUrl || (payload.credentials?.storeUrl as string) || "";
    const credentials = payload.credentials;

    const productQuery = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            variants(first: 5) {
              nodes {
                id
                sku
                price
                inventoryItem {
                  id
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

 const productVariables = {
  input: {
    id: payload.externalProductId,
    title: payload.title,
    descriptionHtml: payload.description || "",
    vendor: payload.brand || "",
    productType: payload.category || "",
    status: this.mapStatus(payload.status as string),
  },
};

    const data = await this.executeGraphQL(storeUrl, credentials, productQuery, productVariables, payload.integrationId);
    const productResult = data?.productUpdate;

    if (productResult?.userErrors && productResult.userErrors.length > 0) {
      const errMsg = productResult.userErrors.map((e: any) => e.message).join("; ");
      return { success: false, error: `Shopify Product Update Error: ${errMsg}` };
    }

    const product = productResult?.product;
    const variantNode = product?.variants?.nodes?.[0];
    const targetVariantId = payload.externalVariantId || variantNode?.id;
    let inventoryItemId = payload.externalInventoryItemId;

    if (targetVariantId) {
      const bulkVariantQuery = `
        mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants {
              id
              price
              sku
              inventoryItem {
                id
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variantVariables = {
        productId: payload.externalProductId,
        variants: [
          {
            id: targetVariantId,
            price: String(payload.price),
            sku: payload.sku,
          },
        ],
      };

      const variantData = await this.executeGraphQL(storeUrl, credentials, bulkVariantQuery, variantVariables, payload.integrationId);
      const bulkResult = variantData?.productVariantsBulkUpdate;

      if (bulkResult?.userErrors && bulkResult.userErrors.length > 0) {
        const errMsg = bulkResult.userErrors.map((e: any) => e.message).join("; ");
        return { success: false, error: `Shopify Variant Update Error: ${errMsg}` };
      }

      const updatedVariant = bulkResult?.productVariants?.[0];
      inventoryItemId = updatedVariant?.inventoryItem?.id || variantNode?.inventoryItem?.id || inventoryItemId;

      const locationId = await this.resolveLocationId(storeUrl, credentials, payload.integrationId);

      if (!locationId || !inventoryItemId) {
        return { success: false, error: "Shopify inventory location or inventory item is unavailable" };
      }
      if (locationId && inventoryItemId) {
        await this.setInventoryQuantity(
          storeUrl,
          credentials,
          inventoryItemId,
          locationId,
          payload.quantity,
          payload.integrationId
        );
      }
    }

    return {
      success: true,
      externalProductId: payload.externalProductId,
      externalVariantId: targetVariantId || payload.externalVariantId,
      externalInventoryItemId: inventoryItemId,
    };
  }

  /**
   * DELETE Product on Shopify via Admin GraphQL API
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
        error: "External product ID (Shopify Product GID) is required for DELETE operation",
      };
    }

    const storeUrl = payload.storeUrl || (payload.credentials?.storeUrl as string) || "";
    const credentials = payload.credentials;

    const query = `
      mutation productDelete($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: payload.externalProductId,
      },
    };

    const data = await this.executeGraphQL(storeUrl, credentials, query, variables, payload.integrationId);
    const result = data?.productDelete;

    if (result?.userErrors && result.userErrors.length > 0) {
      const errMsg = result.userErrors.map((e: any) => e.message).join("; ");
      return { success: false, error: `Shopify Product Delete Error: ${errMsg}` };
    }

    return {
      success: true,
      externalProductId: payload.externalProductId,
    };
  }

  /**
   * Set inventory quantity using current Shopify inventorySetQuantities mutation
   */
  private async setInventoryQuantity(
    storeUrl: string,
    credentials: Record<string, unknown> | undefined,
    inventoryItemId: string,
    locationId: string,
    quantity: number,
    integrationId?: string
  ): Promise<void> {
    const trackedQuery = `
      query inventoryTrackingAndLevels($inventoryItemId: ID!) {
        inventoryItem(id: $inventoryItemId) {
          id
          tracked
          inventoryLevels(first: 250) {
            nodes {
              location { id }
            }
          }
        }
      }
    `;
    const trackingData = await this.executeGraphQL(
      storeUrl,
      credentials,
      trackedQuery,
      { inventoryItemId },
      integrationId
    );
    const inventoryItem = trackingData?.inventoryItem;
    if (!inventoryItem?.id) throw new Error(`Shopify inventory item ${inventoryItemId} was not found`);

    if (!inventoryItem.tracked) {
      const trackMutation = `
        mutation enableInventoryTracking($id: ID!, $input: InventoryItemInput!) {
          inventoryItemUpdate(id: $id, input: $input) {
            inventoryItem { id tracked }
            userErrors { field message }
          }
        }
      `;
      const trackData = await this.executeGraphQL(
        storeUrl,
        credentials,
        trackMutation,
        { id: inventoryItemId, input: { tracked: true } },
        integrationId
      );
      const trackErrors = trackData?.inventoryItemUpdate?.userErrors || [];
      if (trackErrors.length) {
        throw new Error(`Shopify could not enable inventory tracking: ${trackErrors.map((error: any) => error.message).join("; ")}`);
      }
    }

    const activeAtLocation = (inventoryItem.inventoryLevels?.nodes || []).some(
      (level: any) => level.location?.id === locationId
    );
    if (!activeAtLocation) {
      const activateMutation = `
        mutation activateInventory($inventoryItemId: ID!, $locationId: ID!, $available: Int) {
          inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available) {
            inventoryLevel { id }
            userErrors { field message }
          }
        }
      `;
      const activateData = await this.executeGraphQL(
        storeUrl,
        credentials,
        activateMutation,
        { inventoryItemId, locationId, available: Math.max(0, Math.floor(quantity)) },
        integrationId
      );
      const activateErrors = activateData?.inventoryActivate?.userErrors || [];
      if (activateErrors.length) {
        throw new Error(`Shopify could not activate inventory at location: ${activateErrors.map((error: any) => error.message).join("; ")}`);
      }
    }

    const query = `
      mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
        inventorySetQuantities(input: $input) {
          inventoryAdjustmentGroup { createdAt }
          userErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        reason: "correction",
        name: "available",
        ignoreCompareQuantity: true,
        quantities: [
          {
            inventoryItemId,
            locationId,
            quantity: Math.max(0, Math.floor(quantity)),
          },
        ],
      },
    };

    try {
      const data = await this.executeGraphQL(storeUrl, credentials, query, variables, integrationId);
      const errors = data?.inventorySetQuantities?.userErrors || [];
      if (errors.length > 0) {
        throw new Error(`Shopify inventory update failed: ${errors.map((e: any) => `${e.code || "USER_ERROR"}: ${e.message}`).join("; ")}`);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inbound Catalog Import: Fetch Shopify products page by page via GraphQL
   */
  async fetchChannelProducts(
    credentials?: Record<string, unknown>,
    cursor?: string | null,
    limit: number = 50,
    storeUrl?: string,
    integrationId?: string
  ): Promise<PaginatedChannelProducts> {
    const resolvedStoreUrl = storeUrl || (credentials?.storeUrl as string) || "";
    const fetchLimit = Math.min(250, Math.max(1, limit));

    const query = `
      query fetchShopifyProducts($first: Int!, $after: String) {
        shop {
          currencyCode
        }
        products(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            descriptionHtml
            vendor
            productType
            status
            images(first: 10) {
              nodes {
                src
              }
            }
            variants(first: 50) {
              nodes {
                id
                sku
                price
                inventoryQuantity
                inventoryItem {
                  id
                }
              }
            }
          }
        }
      }
    `;

    const variables: Record<string, unknown> = { first: fetchLimit };
    if (cursor) {
      variables.after = cursor;
    }

    const data = await this.executeGraphQL(resolvedStoreUrl, credentials, query, variables, integrationId);
    const shopCurrency = String(data?.shop?.currencyCode || "").trim().toUpperCase();
    const productsConnection = data?.products;
    const pageInfo = productsConnection?.pageInfo;
    const productNodes = productsConnection?.nodes || [];

    const normalizedList: NormalizedChannelProduct[] = [];

    for (const prod of productNodes) {
      const variantNodes = prod.variants?.nodes || [];
      const images = (prod.images?.nodes || []).map((img: any) => img.src);

      for (const variant of variantNodes) {
        const rawSku = (variant.sku || "").trim();
        if (!rawSku) {
          continue; // Skip variants without SKU
        }

        const skuUpper = rawSku.toUpperCase();
        normalizedList.push({
          sku: skuUpper,
          title: prod.title || "Untitled Product",
          description: prod.descriptionHtml || "",
          brand: prod.vendor || "",
          category: prod.productType || "",
          images,
          price: Number(variant.price) || 0,
          currency: shopCurrency || undefined,
          quantity: Number(variant.inventoryQuantity) || 0,
          shippingCharge: 0,
          status: prod.status || "ACTIVE",
          externalProductId: prod.id,
          externalVariantId: variant.id,
          externalInventoryItemId: variant.inventoryItem?.id,
          externalSku: skuUpper,
        });
      }
    }

    return {
      products: normalizedList,
      nextCursor: pageInfo?.endCursor || null,
      hasNextPage: Boolean(pageInfo?.hasNextPage),
    };
  }
}
