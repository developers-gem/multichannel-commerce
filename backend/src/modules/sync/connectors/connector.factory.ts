import {
  HealthCheckResult,
  IChannelImportConnector,
  IMarketplaceConnector,
  NormalizedChannelProduct,
  PaginatedChannelProducts,
  SyncPayload,
  SyncResult,
} from "./connector.interface";
import { ShopifyConnector } from "./shopify.connector";
import { EbayConnector } from "./ebay.connector";
import { CustomWebsiteConnector } from "./custom-website.connector";
import { Platform } from "../../../shared/enums/platform.enum";

class MockMarketplaceConnector implements IMarketplaceConnector, IChannelImportConnector {
  private platform: string;

  constructor(platform: string) {
    this.platform = platform;
  }

  async testConnection(
    _credentials?: Record<string, unknown>,
    _storeUrl?: string
  ): Promise<HealthCheckResult> {
    return {
      success: true,
      message: `Mock connection test successful for platform ${this.platform}`,
    };
  }

  async createProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `MOCK-${this.platform}-ID-${Date.now()}`,
        externalVariantId: payload.externalVariantId || ``,
        externalSku: payload.sku,
      };
    }
    return {
      success: false,
      error: `Marketplace API connector is not yet implemented for platform ${this.platform}`,
    };
  }

  async updateProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId || `MOCK-${this.platform}-ID-123`,
        externalVariantId: payload.externalVariantId || ``,
        externalSku: payload.sku,
      };
    }
    return {
      success: false,
      error: `Marketplace API connector is not yet implemented for platform ${this.platform}`,
    };
  }

  async deleteProduct(payload: SyncPayload): Promise<SyncResult> {
    if (process.env.MOCK_SYNC_CONNECTORS === "true") {
      return {
        success: true,
        externalProductId: payload.externalProductId,
      };
    }
    return {
      success: false,
      error: `Marketplace API connector is not yet implemented for platform ${this.platform}`,
    };
  }

  async fetchChannelProducts(
    _credentials?: Record<string, unknown>,
    _cursor?: string | null,
    _limit: number = 50
  ): Promise<PaginatedChannelProducts> {
    return {
      products: [],
      nextCursor: null,
      hasNextPage: false,
    };
  }
}

export class MarketplaceConnectorFactory {
  static getConnector(platform: string): IMarketplaceConnector {
    const formattedPlatform = (platform || "").toUpperCase();

    // Shopify Admin GraphQL Connector implementation
    if (formattedPlatform === Platform.SHOPIFY || formattedPlatform === "SHOPIFY") {
      return new ShopifyConnector();
    }

    // eBay Sell Inventory REST API Connector implementation
    if (formattedPlatform === Platform.EBAY || formattedPlatform === "EBAY") {
      return new EbayConnector();
    }

    // Custom Website REST API Connector implementation
    if (formattedPlatform === Platform.CUSTOM_WEBSITE || formattedPlatform === "CUSTOM_WEBSITE") {
      return new CustomWebsiteConnector();
    }

    // Default fallback for unknown or mock platforms
    return new MockMarketplaceConnector(formattedPlatform);
  }
}
