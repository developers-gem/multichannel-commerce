// import crypto from "crypto";
// import axios from "axios";
// import Integration from "./integration.model";

// import { ApiError } from "../../utils/ApiError";
// import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
// import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
// import { Platform } from "../../shared/enums/platform.enum";
// import { env } from "../../config/env";
// import { redisConnection } from "../../config/redis";
// import { normalizeShopifyDomain } from "../../utils/shopify.utils";

// import { CreateIntegrationDto } from "./integration.types";
// import Product from "../products/product.model";
// import ProductMapping from "../product-mappings/product-mapping.model";

// class IntegrationService {
//   verifyShopifyWebhook(rawBody: Buffer, signature: string): boolean {
//     if (!env.SHOPIFY_CLIENT_SECRET || !signature) return false;
//     const digest = crypto.createHmac("sha256", env.SHOPIFY_CLIENT_SECRET).update(rawBody).digest("base64");
//     const expected = Buffer.from(digest, "utf8");
//     const received = Buffer.from(signature, "utf8");
//     return expected.length === received.length && crypto.timingSafeEqual(expected, received);
//   }

//   async handleShopifyWebhook(topic: string, shopDomain: string, payload: Record<string, any>): Promise<void> {
//     const shop = normalizeShopifyDomain(shopDomain);
//     const integration = await Integration.findOne({ platform: Platform.SHOPIFY, storeUrl: shop, isActive: true });
//     if (!integration) return;

//     if (topic === "inventory_levels/update") {
//       const inventoryItemId = String(payload.inventory_item_id || "");
//       const quantity = Number(payload.available);
//       if (!inventoryItemId || !Number.isFinite(quantity)) return;

//       const mapping = await ProductMapping.findOne({
//         integrationId: integration._id,
//         externalInventoryItemId: inventoryItemId,
//         isDeleted: false,
//       });
//       if (mapping) {
//         await Product.findByIdAndUpdate(mapping.productId, { quantity: Math.max(0, quantity) });
//         await ProductMapping.findByIdAndUpdate(mapping._id, {
//           lastSyncedAt: new Date(),
//           lastSyncError: "",
//         });
//       }
//       return;
//     }

//     if (topic === "products/update" || topic === "products/create") {
//       const productId = String(payload.id || "");
//       const variant = payload.variants?.[0];
//       if (!productId || !variant?.sku) return;

//       const mapping = await ProductMapping.findOne({
//         integrationId: integration._id,
//         externalProductId: productId,
//         externalVariantId: String(variant.id),
//         isDeleted: false,
//       });
//       if (!mapping) return;

//       await Product.findByIdAndUpdate(mapping.productId, {
//         title: payload.title || undefined,
//         description: payload.body_html || "",
//         brand: payload.vendor || "",
//         category: payload.product_type || "",
//         images: (payload.images || []).map((image: any) => image.src).filter(Boolean),
//         price: Math.max(0, Number(variant.price) || 0),
//         quantity: Math.max(0, Number(variant.inventory_quantity) || 0),
//       }, { runValidators: true });
//       await ProductMapping.findByIdAndUpdate(mapping._id, { lastSyncedAt: new Date(), lastSyncError: "" });
//     }
//   }
//   /**
//    * Create Integration (Manual setup for Non-Shopify platforms)
//    */
//   async create(userId: string, data: CreateIntegrationDto) {
//     if (data.platform === Platform.SHOPIFY) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Shopify integrations must be connected using the Shopify OAuth flow."
//       );
//     }

//     const cleanStoreUrl = (data.storeUrl || "").trim();

//     const existing = await Integration.findOne({
//       userId,
//       platform: data.platform,
//       storeUrl: cleanStoreUrl,
//     });

//     if (existing) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Integration already exists for this channel"
//       );
//     }

//     const integration = await Integration.create({
//       ...data,
//       userId,
//       storeUrl: cleanStoreUrl,
//     });

//     return {
//       id: integration._id,
//       platform: integration.platform,
//       storeName: integration.storeName,
//       storeUrl: integration.storeUrl,
//       isActive: integration.isActive,
//       lastSync: integration.lastSync,
//     };
//   }

//   /**
//    * Get All Integrations for Current User
//    */
//   async getAll(userId: string) {
//     return Integration.find({ userId })
//       .select("-credentials -__v")
//       .sort({ createdAt: -1 });
//   }

//   /**
//    * Get Integration By Id for Current User
//    */
//   async getById(id: string, userId: string) {
//     const integration = await Integration.findOne({ _id: id, userId }).select(
//       "-credentials -__v"
//     );

//     if (!integration) {
//       throw new ApiError(
//         HTTP_STATUS.NOT_FOUND,
//         "Integration not found"
//       );
//     }

//     return integration;
//   }

//   /**
//    * Update Integration for Current User
//    */
//   async update(
//     id: string,
//     userId: string,
//     data: Partial<CreateIntegrationDto>
//   ) {
//     const integration = await Integration.findOneAndUpdate(
//       { _id: id, userId },
//       data,
//       {
//         new: true,
//         runValidators: true,
//       }
//     ).select("-credentials -__v");

//     if (!integration) {
//       throw new ApiError(
//         HTTP_STATUS.NOT_FOUND,
//         "Integration not found"
//       );
//     }

//     return integration;
//   }

//   /**
//    * Delete Integration for Current User
//    */
//   async delete(id: string, userId: string) {
//     const integration = await Integration.findOneAndDelete({ _id: id, userId });

//     if (!integration) {
//       throw new ApiError(
//         HTTP_STATUS.NOT_FOUND,
//         "Integration not found"
//       );
//     }

//     return;
//   }

//   /**
//    * Test Integration Connection Health for Current User
//    */
//   async testConnection(id: string, userId: string) {
//     const integration = await Integration.findOne({ _id: id, userId });

//     if (!integration) {
//       throw new ApiError(
//         HTTP_STATUS.NOT_FOUND,
//         "Integration not found"
//       );
//     }

//     if (!integration.isActive) {
//       return {
//         success: false,
//         message: "Integration is disabled/inactive",
//       };
//     }

//     const connector = MarketplaceConnectorFactory.getConnector(integration.platform);
//     if (!connector || typeof connector.testConnection !== "function") {
//       return {
//         success: false,
//         message: `Health check is not supported for platform '${integration.platform}'`,
//       };
//     }

//     const result = await connector.testConnection(
//       integration.credentials,
//       integration.storeUrl,
//       String(integration._id)
//     );

//     return result;
//   }

//   private static inMemoryStateStore = new Map<string, string>();

//   private async saveOAuthState(state: string, data: { userId: string; shop: string }): Promise<void> {
//     const key = `shopify_oauth_state:${state}`;
//     const value = JSON.stringify(data);

//     try {
//       if (redisConnection.status === "ready") {
//         await redisConnection.set(key, value, "EX", 600);
//         return;
//       }
//     } catch (_) {}

//     IntegrationService.inMemoryStateStore.set(key, value);
//     setTimeout(() => {
//       IntegrationService.inMemoryStateStore.delete(key);
//     }, 600000);
//   }

//   private async getAndDeleteOAuthState(state: string): Promise<{ userId: string; shop: string } | null> {
//     const key = `shopify_oauth_state:${state}`;
//     let val: string | null = null;

//     try {
//       if (redisConnection.status === "ready") {
//         val = await redisConnection.get(key);
//         if (val) {
//           await redisConnection.del(key);
//         }
//       }
//     } catch (_) {}

//     if (!val && IntegrationService.inMemoryStateStore.has(key)) {
//       val = IntegrationService.inMemoryStateStore.get(key) || null;
//       IntegrationService.inMemoryStateStore.delete(key);
//     }

//     if (!val) return null;

//     try {
//       return JSON.parse(val);
//     } catch (_) {
//       return null;
//     }
//   }

//   /**
//    * Shopify OAuth: Generate Authorization URL & Bind State to SaaS User
//    */
//   async getShopifyAuthorizeUrl(shopInput: string, userId: string): Promise<string> {
//     if (!env.SHOPIFY_CLIENT_ID) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Shopify App Client ID is missing. Please set SHOPIFY_CLIENT_ID in backend environment."
//       );
//     }

//     const cleanShop = normalizeShopifyDomain(shopInput);
//     if (!cleanShop) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify store URL is required");
//     }

//     const scopes = "read_products,write_products,read_inventory,write_inventory";
//     const state = crypto.randomBytes(16).toString("hex");

//     await this.saveOAuthState(state, { userId, shop: cleanShop });

//     return `https://${cleanShop}/admin/oauth/authorize?client_id=${env.SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(env.SHOPIFY_REDIRECT_URI)}&state=${state}`;
//   }

//   /**
//    * Shopify OAuth: Handle Callback, Verify HMAC & State, Exchange Access Token, Upsert User Integration
//    */
//   async handleShopifyCallback(query: Record<string, any>): Promise<string> {
//     const { shop, code, hmac, state } = query;

//     if (!shop || !code || !state) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing shop, code, or state in Shopify OAuth callback");
//     }

//     const cleanShop = normalizeShopifyDomain(String(shop));

//     if (env.SHOPIFY_CLIENT_SECRET && !hmac) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing Shopify HMAC signature");
//     }

//     // Verify HMAC if client secret configured
//     if (env.SHOPIFY_CLIENT_SECRET && hmac) {
//       const map = { ...query };
//       delete map.hmac;
//       delete map.signature;

//       const message = Object.keys(map)
//         .sort()
//         .map((k) => `${k}=${map[k]}`)
//         .join("&");

//       const generatedHmac = crypto
//         .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
//         .update(message)
//         .digest("hex");

//       if (generatedHmac !== hmac) {
//         throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid Shopify HMAC signature");
//       }
//     }

//     // Verify State in Redis or in-memory fallback
//     const stateData = await this.getAndDeleteOAuthState(state);

//     if (!stateData) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Invalid or expired OAuth state session. Please initiate Shopify connection again."
//       );
//     }

//     if (stateData.shop !== cleanShop) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shop domain mismatch with OAuth state session");
//     }

//     // Exchange authorization code for access token (and refresh token if present)
//     let tokenData: any;
//     try {
//       const tokenRes = await axios.post(
//         `https://${cleanShop}/admin/oauth/access_token`,
//         new URLSearchParams({
//           client_id: env.SHOPIFY_CLIENT_ID,
//           client_secret: env.SHOPIFY_CLIENT_SECRET,
//           code: String(code),
//           expiring: "1",
//         }).toString(),
//         {
//           headers: { "Content-Type": "application/x-www-form-urlencoded" },
//           timeout: 15000,
//         }
//       );

//       tokenData = tokenRes.data;
//     } catch (err: any) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         `Shopify OAuth token exchange failed: ${err.response?.data?.error_description || err.message}`
//       );
//     }

//     const accessToken = tokenData?.access_token || "";
//     if (!accessToken) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify token exchange succeeded but returned empty token");
//     }

//     const credentialsObj: Record<string, any> = {
//       accessToken,
//     };
//     if (tokenData.refresh_token) {
//       credentialsObj.refreshToken = tokenData.refresh_token;
//     }
//     if (tokenData.expires_in) {
//       credentialsObj.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
//     }
//     if (tokenData.scope) {
//       credentialsObj.scope = tokenData.scope;
//     }

//     // User-scoped lookup in MongoDB
//     let integration = await Integration.findOne({
//       userId: stateData.userId,
//       platform: Platform.SHOPIFY,
//       storeUrl: cleanShop,
//     });

//     const storeSlug = cleanShop.split(".")[0];
//     const formattedStoreName = storeSlug.charAt(0).toUpperCase() + storeSlug.slice(1);

//     if (integration) {
//       integration.credentials = credentialsObj;
//       integration.isActive = true;
//       if (!integration.storeName) {
//         integration.storeName = formattedStoreName;
//       }
//       await integration.save();
//     } else {
//       integration = await Integration.create({
//         userId: stateData.userId,
//         platform: Platform.SHOPIFY,
//         storeName: formattedStoreName,
//         storeUrl: cleanShop,
//         credentials: credentialsObj,
//         isActive: true,
//       });
//     }

//     // Run connection health test
//     await this.testConnection(String(integration._id), stateData.userId);

//     let syncStatus = "started";
//     try {
//       const { catalogImportService } = await import("../catalog-import/catalog-import.service");
//       await catalogImportService.importChannelCatalog(String(integration._id), stateData.userId);
//       syncStatus = "completed";
//     } catch (syncError: any) {
//       syncStatus = "failed";
//       console.error(`[Shopify] Initial catalog sync failed for ${cleanShop}:`, syncError?.message || syncError);
//     }

//     return `${env.FRONTEND_URL}/integrations?shopify_success=true&store=${encodeURIComponent(cleanShop)}&shopify_sync=${syncStatus}`;
//   }

//   private async saveEbayOAuthState(state: string, data: { userId: string; environment: string }): Promise<void> {
//     const key = `ebay_oauth_state:${state}`;
//     const value = JSON.stringify(data);

//     try {
//       if (redisConnection.status === "ready") {
//         await redisConnection.set(key, value, "EX", 600);
//         return;
//       }
//     } catch (_) {}

//     IntegrationService.inMemoryStateStore.set(key, value);
//     setTimeout(() => {
//       IntegrationService.inMemoryStateStore.delete(key);
//     }, 600000);
//   }

//   private async getAndDeleteEbayOAuthState(state: string): Promise<{ userId: string; environment: string } | null> {
//     const key = `ebay_oauth_state:${state}`;
//     let val: string | null = null;

//     try {
//       if (redisConnection.status === "ready") {
//         val = await redisConnection.get(key);
//         if (val) {
//           await redisConnection.del(key);
//         }
//       }
//     } catch (_) {}

//     if (!val && IntegrationService.inMemoryStateStore.has(key)) {
//       val = IntegrationService.inMemoryStateStore.get(key) || null;
//       IntegrationService.inMemoryStateStore.delete(key);
//     }

//     if (!val) return null;

//     try {
//       return JSON.parse(val);
//     } catch (_) {
//       return null;
//     }
//   }

//   /**
//    * eBay OAuth: Generate Authorization URL & Bind State to SaaS User
//    */
//   async getEbayAuthorizeUrl(userId: string): Promise<string> {
//     if (!env.EBAY_CLIENT_ID) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "eBay Client ID is missing. Please set EBAY_CLIENT_ID in backend environment."
//       );
//     }

//     if (!env.EBAY_RU_NAME) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "eBay RuName (redirect URI) is missing. Please set EBAY_RU_NAME in backend environment."
//       );
//     }

//     const isSandbox = env.EBAY_ENVIRONMENT === "sandbox";
//     const authBaseUrl = isSandbox
//       ? "https://auth.sandbox.ebay.com/oauth2/authorize"
//       : "https://auth.ebay.com/oauth2/authorize";

//     const scopes = "https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account";
//     const state = crypto.randomBytes(16).toString("hex");

//     await this.saveEbayOAuthState(state, { userId, environment: env.EBAY_ENVIRONMENT });

//     return `${authBaseUrl}?client_id=${encodeURIComponent(env.EBAY_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(env.EBAY_RU_NAME)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
//   }

//   /**
//    * eBay OAuth: Handle Callback, Validate State, Exchange Code for Tokens, Upsert User Integration
//    */
//   async handleEbayCallback(query: Record<string, any>): Promise<string> {
//     const { code, state, error, error_description } = query;

//     if (error || error_description) {
//       const errorMsg = error_description || error || "eBay OAuth authorization failed";
//       return `${env.FRONTEND_URL}/integrations?ebay_error=${encodeURIComponent(String(errorMsg))}`;
//     }

//     if (!code || !state) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing code or state in eBay OAuth callback");
//     }

//     const stateData = await this.getAndDeleteEbayOAuthState(String(state));

//     if (!stateData) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Invalid or expired OAuth state session. Please initiate eBay connection again."
//       );
//     }

//     if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET || !env.EBAY_RU_NAME) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "eBay OAuth credentials (client ID, client secret, or RuName) not configured in backend environment."
//       );
//     }

//     const isSandbox = stateData.environment === "sandbox" || env.EBAY_ENVIRONMENT === "sandbox";
//     const tokenEndpoint = isSandbox
//       ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
//       : "https://api.ebay.com/identity/v1/oauth2/token";

//     const authHeaderValue = Buffer.from(
//       `${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`
//     ).toString("base64");

//     const params = new URLSearchParams();
//     params.append("grant_type", "authorization_code");
//     params.append("code", String(code));
//     params.append("redirect_uri", env.EBAY_RU_NAME);

//     let tokenData: any;
//     try {
//       const tokenRes = await axios.post(tokenEndpoint, params.toString(), {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//           Authorization: `Basic ${authHeaderValue}`,
//         },
//         timeout: 10000,
//       });

//       tokenData = tokenRes.data;
//     } catch (err: any) {
//       const safeErrorMsg =
//         err.response?.data?.error_description ||
//         err.response?.data?.error ||
//         (err.code === "ECONNABORTED" ? "eBay token exchange request timed out after 10 seconds" : err.message);

//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         `eBay OAuth token exchange failed: ${safeErrorMsg}`
//       );
//     }

//     const accessToken = tokenData?.access_token || "";
//     if (!accessToken) {
//       throw new ApiError(HTTP_STATUS.BAD_REQUEST, "eBay token exchange succeeded but returned empty access token");
//     }

//     const credentialsObj: Record<string, any> = {
//       accessToken,
//       marketplaceId: "EBAY_US",
//       currency: "USD",
//       merchantLocationKey: "DEFAULT",
//       environment: isSandbox ? "sandbox" : "production",
//     };

//     if (tokenData.refresh_token) {
//       credentialsObj.refreshToken = tokenData.refresh_token;
//     }
//     if (tokenData.expires_in) {
//       credentialsObj.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
//     }
//     if (tokenData.refresh_token_expires_in) {
//       credentialsObj.refreshTokenExpiresAt = new Date(
//         Date.now() + tokenData.refresh_token_expires_in * 1000
//       );
//     }

//     const storeUrl = isSandbox ? "sandbox.ebay.com" : "ebay.com";

//     let integration = await Integration.findOne({
//       userId: stateData.userId,
//       platform: Platform.EBAY,
//       storeUrl,
//     });

//     if (integration) {
//       integration.credentials = {
//         ...integration.credentials,
//         ...credentialsObj,
//       };
//       integration.isActive = true;
//       if (!integration.storeName) {
//         integration.storeName = isSandbox ? "eBay Sandbox Store" : "eBay Store";
//       }
//       await integration.save();
//     } else {
//       integration = await Integration.create({
//         userId: stateData.userId,
//         platform: Platform.EBAY,
//         storeName: isSandbox ? "eBay Sandbox Store" : "eBay Store",
//         storeUrl,
//         credentials: credentialsObj,
//         isActive: true,
//       });
//     }

//     // Non-blocking health check: failure does not break successful OAuth callback or token persistence
//     try {
//       await this.testConnection(String(integration._id), stateData.userId);
//     } catch (_) {
//       // Non-blocking
//     }

//     return `${env.FRONTEND_URL}/integrations?ebay_success=true`;
//   }
// }

// export const integrationService = new IntegrationService();

import crypto from "crypto";
import axios from "axios";
import Integration from "./integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
import { EbayConnector } from "../sync/connectors/ebay.connector";
import { Platform } from "../../shared/enums/platform.enum";
import { env } from "../../config/env";
import { redisConnection } from "../../config/redis";
import { normalizeShopifyDomain } from "../../utils/shopify.utils";
import { planShopifyInventoryWebhook, planShopifyProductWebhook } from "./shopify-webhook.sync";

import { CreateIntegrationDto } from "./integration.types";
import Product from "../products/product.model";
import ProductMapping from "../product-mappings/product-mapping.model";

class IntegrationService {
  verifyShopifyWebhook(rawBody: Buffer, signature: string): boolean {
    if (!env.SHOPIFY_CLIENT_SECRET || !signature) return false;
    const digest = crypto.createHmac("sha256", env.SHOPIFY_CLIENT_SECRET).update(rawBody).digest("base64");
    const expected = Buffer.from(digest, "utf8");
    const received = Buffer.from(signature, "utf8");
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  async handleShopifyWebhook(topic: string, shopDomain: string, payload: Record<string, any>): Promise<void> {
    const shop = normalizeShopifyDomain(shopDomain);
    const integration = await Integration.findOne({ platform: Platform.SHOPIFY, storeUrl: shop, isActive: true });
    if (!integration) return;

    if (topic === "inventory_levels/update") {
      const plan = planShopifyInventoryWebhook(payload);
      if (!plan) return;

      const mapping = await ProductMapping.findOne({
        integrationId: integration._id,
        $or: [
          { externalInventoryItemId: plan.inventoryItemGid },
          { externalInventoryItemId: plan.rawInventoryItemId },
        ],
        isDeleted: false,
      });
      if (mapping) {
        await ProductMapping.findByIdAndUpdate(mapping._id, {
          channelQuantity: plan.channelQuantity,
          lastSyncedAt: new Date(),
          lastSyncError: "",
        });
      }
      return;
    }

    if (topic === "products/update" || topic === "products/create") {
      const plan = planShopifyProductWebhook(payload);
      if (!plan) return;

      const rawProductId = String(payload.id || "");
      const rawVariantId = plan.variantGid ? String((payload.variants || [])[0]?.id || "") : "";

      let mapping = await ProductMapping.findOne({
        integrationId: integration._id,
        $or: [
          { externalProductId: plan.productGid },
          { externalProductId: rawProductId },
          ...(plan.variantGid ? [{ externalVariantId: plan.variantGid }, { externalVariantId: rawVariantId }] : []),
          { sku: plan.sku },
        ],
        isDeleted: false,
      });

      if (!mapping) {
        let masterProduct = await Product.findOne({
          sku: plan.sku,
          isDeleted: false,
        });

        if (!masterProduct) {
          masterProduct = await Product.create({
            userId: integration.userId,
            sku: plan.sku,
            ...plan.masterDefaults,
          });
        } else if (Object.keys(plan.masterCatalog).length > 0) {
          await Product.findByIdAndUpdate(masterProduct._id, plan.masterCatalog, { runValidators: true });
        }

        mapping = await ProductMapping.create({
          productId: masterProduct._id,
          integrationId: integration._id,
          ...plan.mapping,
          sku: masterProduct.sku,
          lastSyncedAt: new Date(),
        });
      } else {
        if (Object.keys(plan.masterCatalog).length > 0) {
          await Product.findByIdAndUpdate(mapping.productId, plan.masterCatalog, { runValidators: true });
        }

        await ProductMapping.findByIdAndUpdate(mapping._id, {
          externalProductId: plan.mapping.externalProductId,
          ...(plan.mapping.externalVariantId ? { externalVariantId: plan.mapping.externalVariantId } : {}),
          ...(plan.mapping.externalInventoryItemId ? { externalInventoryItemId: plan.mapping.externalInventoryItemId } : {}),
          ...(plan.mapping.channelPrice !== undefined ? { channelPrice: plan.mapping.channelPrice } : {}),
          ...(plan.mapping.channelQuantity !== undefined ? { channelQuantity: plan.mapping.channelQuantity } : {}),
          lastSyncedAt: new Date(),
          lastSyncError: "",
          syncStatus: "SYNCED",
        });
      }
    }
  }

  /**
   * Create Integration (Manual setup for Non-Shopify platforms)
   */
  async create(userId: string, data: CreateIntegrationDto) {
    if (data.platform === Platform.SHOPIFY) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Shopify integrations must be connected using the Shopify OAuth flow."
      );
    }

    const cleanStoreUrl = (data.storeUrl || "").trim();

    const existing = await Integration.findOne({
      userId,
      platform: data.platform,
      storeUrl: cleanStoreUrl,
    });

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Integration already exists for this channel"
      );
    }

    const integration = await Integration.create({
      ...data,
      userId,
      storeUrl: cleanStoreUrl,
    });

    return {
      id: integration._id,
      platform: integration.platform,
      storeName: integration.storeName,
      storeUrl: integration.storeUrl,
      isActive: integration.isActive,
      lastSync: integration.lastSync,
    };
  }

  /**
   * Get All Integrations for Current User
   */
  async getAll(userId: string) {
    return Integration.find({ userId })
      .select("-credentials -__v")
      .sort({ createdAt: -1 });
  }

  /**
   * Get Integration By Id for Current User
   */
  async getById(id: string, userId: string) {
    const integration = await Integration.findOne({ _id: id, userId }).select(
      "-credentials -__v"
    );

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return integration;
  }

  /**
   * Update Integration for Current User
   */
  async update(
    id: string,
    userId: string,
    data: Partial<CreateIntegrationDto>
  ) {
    const integration = await Integration.findOneAndUpdate(
      { _id: id, userId },
      data,
      {
        new: true,
        runValidators: true,
      }
    ).select("-credentials -__v");

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return integration;
  }

  /**
   * Delete Integration for Current User
   */
  async delete(id: string, userId: string) {
    const integration = await Integration.findOneAndDelete({ _id: id, userId });

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return;
  }

  /**
   * Test Integration Connection Health for Current User
   */
  async testConnection(id: string, userId: string) {
    const integration = await Integration.findOne({ _id: id, userId });

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    if (!integration.isActive) {
      return {
        success: false,
        message: "Integration is disabled/inactive",
      };
    }

    const connector = MarketplaceConnectorFactory.getConnector(integration.platform);
    if (!connector || typeof connector.testConnection !== "function") {
      return {
        success: false,
        message: `Health check is not supported for platform '${integration.platform}'`,
      };
    }

    const result = await connector.testConnection(
      integration.credentials,
      integration.storeUrl,
      String(integration._id)
    );

    return result;
  }

  private static inMemoryStateStore = new Map<string, string>();

  private async saveOAuthState(state: string, data: { userId: string; shop: string }): Promise<void> {
    const key = `shopify_oauth_state:${state}`;
    const value = JSON.stringify(data);

    try {
      if (redisConnection.status === "ready") {
        await redisConnection.set(key, value, "EX", 600);
        return;
      }
    } catch (_) {}

    IntegrationService.inMemoryStateStore.set(key, value);
    setTimeout(() => {
      IntegrationService.inMemoryStateStore.delete(key);
    }, 600000);
  }

  private async getAndDeleteOAuthState(state: string): Promise<{ userId: string; shop: string } | null> {
    const key = `shopify_oauth_state:${state}`;
    let val: string | null = null;

    try {
      if (redisConnection.status === "ready") {
        val = await redisConnection.get(key);
        if (val) {
          await redisConnection.del(key);
        }
      }
    } catch (_) {}

    if (!val && IntegrationService.inMemoryStateStore.has(key)) {
      val = IntegrationService.inMemoryStateStore.get(key) || null;
      IntegrationService.inMemoryStateStore.delete(key);
    }

    if (!val) return null;

    try {
      return JSON.parse(val);
    } catch (_) {
      return null;
    }
  }

  /**
   * Shopify OAuth: Generate Authorization URL & Bind State to SaaS User
   */
  async getShopifyAuthorizeUrl(shopInput: string, userId: string): Promise<string> {
    if (!env.SHOPIFY_CLIENT_ID) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Shopify App Client ID is missing. Please set SHOPIFY_CLIENT_ID in backend environment."
      );
    }

    const cleanShop = normalizeShopifyDomain(shopInput);
    if (!cleanShop) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify store URL is required");
    }

    const scopes = "read_products,write_products,read_inventory,write_inventory";
    const state = crypto.randomBytes(16).toString("hex");

    await this.saveOAuthState(state, { userId, shop: cleanShop });

    return `https://${cleanShop}/admin/oauth/authorize?client_id=${env.SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(env.SHOPIFY_REDIRECT_URI)}&state=${state}`;
  }

  /**
   * Shopify OAuth: Handle Callback, Verify HMAC & State, Exchange Access Token, Upsert User Integration
   */
  async handleShopifyCallback(query: Record<string, any>): Promise<string> {
    const { shop, code, hmac, state } = query;

    if (!shop || !code || !state) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing shop, code, or state in Shopify OAuth callback");
    }

    const cleanShop = normalizeShopifyDomain(String(shop));

    if (env.SHOPIFY_CLIENT_SECRET && !hmac) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing Shopify HMAC signature");
    }

    // Verify HMAC if client secret configured
    if (env.SHOPIFY_CLIENT_SECRET && hmac) {
      const map = { ...query };
      delete map.hmac;
      delete map.signature;

      const message = Object.keys(map)
        .sort()
        .map((k) => `${k}=${map[k]}`)
        .join("&");

      const generatedHmac = crypto
        .createHmac("sha256", env.SHOPIFY_CLIENT_SECRET)
        .update(message)
        .digest("hex");

      if (generatedHmac !== hmac) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid Shopify HMAC signature");
      }
    }

    // Verify State in Redis or in-memory fallback
    const stateData = await this.getAndDeleteOAuthState(state);

    if (!stateData) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired OAuth state session. Please initiate Shopify connection again."
      );
    }

    if (stateData.shop !== cleanShop) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shop domain mismatch with OAuth state session");
    }

    // Exchange authorization code for access token (and refresh token if present)
    let tokenData: any;
    try {
      const tokenRes = await axios.post(
        `https://${cleanShop}/admin/oauth/access_token`,
        new URLSearchParams({
          client_id: env.SHOPIFY_CLIENT_ID,
          client_secret: env.SHOPIFY_CLIENT_SECRET,
          code: String(code),
          expiring: "1",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
        }
      );

      tokenData = tokenRes.data;
    } catch (err: any) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Shopify OAuth token exchange failed: ${err.response?.data?.error_description || err.message}`
      );
    }

    const accessToken = tokenData?.access_token || "";
    if (!accessToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify token exchange succeeded but returned empty token");
    }

    const credentialsObj: Record<string, any> = {
      accessToken,
    };
    if (tokenData.refresh_token) {
      credentialsObj.refreshToken = tokenData.refresh_token;
    }
    if (tokenData.expires_in) {
      credentialsObj.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    }
    if (tokenData.scope) {
      credentialsObj.scope = tokenData.scope;
    }

    // User-scoped lookup in MongoDB
    let integration = await Integration.findOne({
      userId: stateData.userId,
      platform: Platform.SHOPIFY,
      storeUrl: cleanShop,
    });

    const storeSlug = cleanShop.split(".")[0];
    const formattedStoreName = storeSlug.charAt(0).toUpperCase() + storeSlug.slice(1);

    if (integration) {
      integration.credentials = credentialsObj;
      integration.isActive = true;
      if (!integration.storeName) {
        integration.storeName = formattedStoreName;
      }
      await integration.save();
    } else {
      integration = await Integration.create({
        userId: stateData.userId,
        platform: Platform.SHOPIFY,
        storeName: formattedStoreName,
        storeUrl: cleanShop,
        credentials: credentialsObj,
        isActive: true,
      });
    }

    // Run connection health test
    await this.testConnection(String(integration._id), stateData.userId);

    let syncStatus = "started";
    try {
      const { catalogImportService } = await import("../catalog-import/catalog-import.service");
      await catalogImportService.importChannelCatalog(String(integration._id), stateData.userId);
      syncStatus = "completed";
    } catch (syncError: any) {
      syncStatus = "failed";
      console.error(`[Shopify] Initial catalog sync failed for ${cleanShop}:`, syncError?.message || syncError);
    }

    return `${env.FRONTEND_URL}/integrations?shopify_success=true&store=${encodeURIComponent(cleanShop)}&shopify_sync=${syncStatus}`;
  }

  private async saveEbayOAuthState(state: string, data: { userId: string; environment: string }): Promise<void> {
    const key = `ebay_oauth_state:${state}`;
    const value = JSON.stringify(data);

    try {
      if (redisConnection.status === "ready") {
        await redisConnection.set(key, value, "EX", 600);
        return;
      }
    } catch (_) {}

    IntegrationService.inMemoryStateStore.set(key, value);
    setTimeout(() => {
      IntegrationService.inMemoryStateStore.delete(key);
    }, 600000);
  }

  private async getAndDeleteEbayOAuthState(state: string): Promise<{ userId: string; environment: string } | null> {
    const key = `ebay_oauth_state:${state}`;
    let val: string | null = null;

    try {
      if (redisConnection.status === "ready") {
        val = await redisConnection.get(key);
        if (val) {
          await redisConnection.del(key);
        }
      }
    } catch (_) {}

    if (!val && IntegrationService.inMemoryStateStore.has(key)) {
      val = IntegrationService.inMemoryStateStore.get(key) || null;
      IntegrationService.inMemoryStateStore.delete(key);
    }

    if (!val) return null;

    try {
      return JSON.parse(val);
    } catch (_) {
      return null;
    }
  }

  /**
   * eBay OAuth: Generate Authorization URL & Bind State to SaaS User
   */
  async getEbayAuthorizeUrl(userId: string): Promise<string> {
    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET || !env.EBAY_RU_NAME) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `eBay ${env.EBAY_ENVIRONMENT} OAuth is not configured. Set the matching environment client ID, client secret, and RuName.`
      );
    }

    const isSandbox = env.EBAY_ENVIRONMENT === "sandbox";
    const authBaseUrl = isSandbox
      ? "https://auth.sandbox.ebay.com/oauth2/authorize"
      : "https://auth.ebay.com/oauth2/authorize";

    const scopes = [
      "https://api.ebay.com/oauth/api_scope/sell.inventory",
      "https://api.ebay.com/oauth/api_scope/sell.account",
      "https://api.ebay.com/oauth/api_scope/commerce.identity.readonly",
    ].join(" ");
    const state = crypto.randomBytes(16).toString("hex");

    await this.saveEbayOAuthState(state, { userId, environment: env.EBAY_ENVIRONMENT });

    return `${authBaseUrl}?client_id=${encodeURIComponent(env.EBAY_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(env.EBAY_RU_NAME)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
  }

  /**
   * eBay OAuth: Handle Callback, Validate State, Exchange Code for Tokens, Upsert User Integration
   */
  async handleEbayCallback(query: Record<string, any>): Promise<string> {
    const { code, state, error, error_description } = query;

    if (error || error_description) {
      const errorMsg = error_description || error || "eBay OAuth authorization failed";
      return `${env.FRONTEND_URL}/integrations?ebay_error=${encodeURIComponent(String(errorMsg))}`;
    }

    if (!code || !state) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing code or state in eBay OAuth callback");
    }

    const stateData = await this.getAndDeleteEbayOAuthState(String(state));

    if (!stateData) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired OAuth state session. Please initiate eBay connection again."
      );
    }

    if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET || !env.EBAY_RU_NAME) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "eBay OAuth credentials (client ID, client secret, or RuName) not configured in backend environment."
      );
    }

    if (stateData.environment !== env.EBAY_ENVIRONMENT) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "eBay OAuth environment changed during authorization. Restart the connection flow.");
    }
    const isSandbox = stateData.environment === "sandbox";
    const tokenEndpoint = isSandbox
      ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
      : "https://api.ebay.com/identity/v1/oauth2/token";

    const authHeaderValue = Buffer.from(
      `${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`
    ).toString("base64");

    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", String(code));
    params.append("redirect_uri", env.EBAY_RU_NAME);

    let tokenData: any;
    try {
      const tokenRes = await axios.post(tokenEndpoint, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${authHeaderValue}`,
        },
        timeout: 10000,
      });

      tokenData = tokenRes.data;
    } catch (err: any) {
      const safeErrorMsg =
        err.response?.data?.error_description ||
        err.response?.data?.error ||
        (err.code === "ECONNABORTED" ? "eBay token exchange request timed out after 10 seconds" : err.message);

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `eBay OAuth token exchange failed: ${safeErrorMsg}`
      );
    }

    const accessToken = tokenData?.access_token || "";
    if (!accessToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "eBay token exchange succeeded but returned empty access token");
    }

    const credentialsObj: Record<string, any> = {
      accessToken,
      marketplaceId: env.EBAY_MARKETPLACE_ID || "EBAY_US",
      currency: env.EBAY_CURRENCY || "USD",
      ...(env.EBAY_CATEGORY_ID ? { categoryId: env.EBAY_CATEGORY_ID } : {}),
      environment: isSandbox ? "sandbox" : "production",
    };

    if (tokenData.refresh_token) {
      credentialsObj.refreshToken = tokenData.refresh_token;
    }
    if (tokenData.expires_in) {
      credentialsObj.expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    }
    if (tokenData.refresh_token_expires_in) {
      credentialsObj.refreshTokenExpiresAt = new Date(
        Date.now() + tokenData.refresh_token_expires_in * 1000
      );
    }
    if (tokenData.scope) credentialsObj.scope = tokenData.scope;

    const storeUrl = isSandbox ? "sandbox.ebay.com" : "ebay.com";

    let integration = await Integration.findOne({
      userId: stateData.userId,
      platform: Platform.EBAY,
      storeUrl,
    });

    if (integration) {
      integration.credentials = {
        ...integration.credentials,
        ...credentialsObj,
      };
      integration.isActive = true;
      if (!integration.storeName) {
        integration.storeName = isSandbox ? "eBay Sandbox Store" : "eBay Store";
      }
      await integration.save();
    } else {
      integration = await Integration.create({
        userId: stateData.userId,
        platform: Platform.EBAY,
        storeName: isSandbox ? "eBay Sandbox Store" : "eBay Store",
        storeUrl,
        credentials: credentialsObj,
        isActive: true,
      });
    }

    let setupStatus = "complete";
    try {
      const connector = new EbayConnector();
      const discovered = await connector.discoverSellerConfiguration(
        integration.credentials,
        String(integration._id)
      );
      if (discovered.storeName) {
        integration.storeName = discovered.storeName;
        await integration.save();
      }
      if (!integration.credentials.fulfillmentPolicyId ||
          !integration.credentials.paymentPolicyId ||
          !integration.credentials.returnPolicyId ||
          !integration.credentials.merchantLocationKey) {
        setupStatus = "configuration_pending";
      }
    } catch (error: any) {
      setupStatus = "configuration_pending";
      console.error(`[eBay] Seller configuration discovery failed: ${error?.message || error}`);
    }

    const integrationId = String(integration._id);
    const ownerId = stateData.userId;
    void import("../catalog-import/catalog-import.service")
      .then(({ catalogImportService }) => catalogImportService.importChannelCatalog(integrationId, ownerId))
      .then(() => console.info(`[eBay] Initial catalog sync completed for integration ${integrationId}`))
      .catch((error: unknown) => console.error(`[eBay] Initial catalog sync failed for integration ${integrationId}:`, error instanceof Error ? error.message : "unknown error"));

    return `${env.FRONTEND_URL}/integrations?ebay_success=true&ebay_sync=started&ebay_setup=${setupStatus}`;
  }

  /**
   * Category suggestions for the signed-in merchant's eBay integration.
   * Tokens stay on the server.
   */
  async suggestEbayCategories(userId: string, query: string, integrationId?: string) {
    const q = String(query || "").trim();
    if (!q) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Category search query is required");
    if (q.length > 100) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Category search query is too long");
    if (integrationId && !/^[0-9a-fA-F]{24}$/.test(integrationId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid eBay integration id");
    }

    const integrations = await Integration.find({
      userId,
      platform: Platform.EBAY,
      isActive: true,
      ...(integrationId ? { _id: integrationId } : {}),
    });
    if (integrations.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Active eBay integration not found");
    }
    if (!integrationId && integrations.length > 1) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Multiple eBay integrations are connected. Pass integrationId.");
    }

    const integration = integrations[0];
    try {
      const result = await new EbayConnector().getCategorySuggestions(
        integration.credentials,
        String(integration._id),
        q
      );
      return {
        integrationId: String(integration._id),
        marketplaceId: result.marketplaceId,
        categoryTreeId: result.categoryTreeId,
        suggestions: result.suggestions,
      };
    } catch (error: any) {
      throw new ApiError(
        HTTP_STATUS.SERVICE_UNAVAILABLE,
        error?.message || "eBay category suggestion failed"
      );
    }
  }
}

export const integrationService = new IntegrationService();