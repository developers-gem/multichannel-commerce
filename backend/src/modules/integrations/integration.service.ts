import crypto from "crypto";
import axios from "axios";
import Integration from "./integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
import { Platform } from "../../shared/enums/platform.enum";
import { env } from "../../config/env";
import { redisConnection } from "../../config/redis";
import { normalizeShopifyDomain } from "../../utils/shopify.utils";

import { CreateIntegrationDto } from "./integration.types";

class IntegrationService {
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
        {
          client_id: env.SHOPIFY_CLIENT_ID,
          client_secret: env.SHOPIFY_CLIENT_SECRET,
          code,
        },
        { timeout: 15000 }
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

    return `${env.FRONTEND_URL}/integrations?shopify_success=true&store=${encodeURIComponent(cleanShop)}`;
  }
}

export const integrationService = new IntegrationService();