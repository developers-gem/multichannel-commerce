import crypto from "crypto";
import axios from "axios";
import Integration from "./integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
import { Platform } from "../../shared/enums/platform.enum";
import { env } from "../../config/env";

import { CreateIntegrationDto } from "./integration.types";

class IntegrationService {
  /**
   * Create Integration
   */
  async create(data: CreateIntegrationDto) {
    const existing = await Integration.findOne({
      platform: data.platform,
      storeUrl: data.storeUrl,
    });

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Integration already exists"
      );
    }

    const integration = await Integration.create(data);

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
   * Get All Integrations
   */
  async getAll() {
    return Integration.find()
      .select("-credentials -__v")
      .sort({ createdAt: -1 });
  }

  /**
   * Get Integration By Id
   */
  async getById(id: string) {
    const integration = await Integration.findById(id).select(
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
   * Update Integration
   */
  async update(
    id: string,
    data: Partial<CreateIntegrationDto>
  ) {
    const integration = await Integration.findByIdAndUpdate(
      id,
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
   * Delete Integration
   */
  async delete(id: string) {
    const integration = await Integration.findByIdAndDelete(id);

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    return;
  }

  /**
   * Test Integration Connection Health
   */
  async testConnection(id: string) {
    const integration = await Integration.findById(id);

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
      integration.storeUrl
    );

    return result;
  }

  /**
   * Minimal Shopify OAuth: Generate Authorization URL
   */
  getShopifyAuthorizeUrl(shopInput: string): string {
    if (!env.SHOPIFY_CLIENT_ID) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Shopify App Client ID is missing. Please set SHOPIFY_CLIENT_ID in backend environment."
      );
    }

    let cleanShop = (shopInput || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    if (!cleanShop) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify store URL is required");
    }

    if (!cleanShop.includes(".")) {
      cleanShop = `${cleanShop}.myshopify.com`;
    }

    const scopes = "read_products,write_products,read_inventory,write_inventory";
    const state = crypto.randomBytes(16).toString("hex");

    return `https://${cleanShop}/admin/oauth/authorize?client_id=${env.SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(env.SHOPIFY_REDIRECT_URI)}&state=${state}`;
  }

  /**
   * Minimal Shopify OAuth: Handle Callback & Access Token Exchange
   */
  async handleShopifyCallback(query: Record<string, any>): Promise<string> {
    const { shop, code, hmac } = query;

    if (!shop || !code) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing shop or code in Shopify OAuth callback");
    }

    let cleanShop = String(shop).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");

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

    // Exchange authorization code for offline access token
    let accessToken = "";
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

      accessToken = tokenRes.data?.access_token || "";
    } catch (err: any) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Shopify OAuth token exchange failed: ${err.response?.data?.error_description || err.message}`
      );
    }

    if (!accessToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Shopify token exchange succeeded but returned empty token");
    }

    // Create or update Integration record in MongoDB
    let integration = await Integration.findOne({
      platform: Platform.SHOPIFY,
      storeUrl: cleanShop,
    });

    const storeName = cleanShop.split(".")[0];

    if (integration) {
      integration.credentials = { accessToken };
      integration.isActive = true;
      await integration.save();
    } else {
      integration = await Integration.create({
        platform: Platform.SHOPIFY,
        storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
        storeUrl: cleanShop,
        credentials: { accessToken },
        isActive: true,
      });
    }

    // Run connection test
    await this.testConnection(String(integration._id));

    return `${env.FRONTEND_URL}/integrations?shopify_success=true&store=${encodeURIComponent(cleanShop)}`;
  }
}

export const integrationService = new IntegrationService();