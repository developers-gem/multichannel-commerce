import { PlatformConfig } from "./platform-config.model";
import { Platform } from "../../shared/enums/platform.enum";
import Integration from "./integration.model";
import ProductMapping from "../product-mappings/product-mapping.model";

export interface ResolvedFeeConfig {
  feePercentage: number;
  fixedFee: number;
  paymentFeePercentage: number;
  source: "LISTING_OVERRIDE" | "STORE_OVERRIDE" | "PLATFORM_DEFAULT";
}

export interface ProfitabilityCalculation {
  sellingPrice: number;
  costPrice: number;
  shippingCost: number;
  feePercentage: number;
  fixedFee: number;
  platformFee: number;
  netProfit: number;
  profitMarginPercentage: number;
  isProfitable: boolean;
  feeSource: "LISTING_OVERRIDE" | "STORE_OVERRIDE" | "PLATFORM_DEFAULT";
}

export const INITIAL_PLATFORM_DEFAULTS: Record<string, { feePercentage: number; fixedFee: number }> = {
  [Platform.SHOPIFY]: { feePercentage: 2.9, fixedFee: 0.30 },
  [Platform.EBAY]: { feePercentage: 13.25, fixedFee: 0.30 },
  [Platform.CUSTOM_WEBSITE]: { feePercentage: 0, fixedFee: 0 },
};

class PlatformConfigService {
  /**
   * Calculate on-demand profitability metrics from source values
   */
  calculateProfitability(
    sellingPrice: number,
    costPrice: number,
    shippingCost: number,
    feeConfig: ResolvedFeeConfig
  ): ProfitabilityCalculation {
    const sPrice = Math.max(0, sellingPrice || 0);
    const cPrice = Math.max(0, costPrice || 0);
    const sCost = Math.max(0, shippingCost || 0);

    const feePct = Math.max(0, feeConfig.feePercentage || 0);
    const fixedFee = Math.max(0, feeConfig.fixedFee || 0);

    const platformFee = Number(((sPrice * (feePct / 100)) + fixedFee).toFixed(2));
    const netProfit = Number((sPrice - cPrice - sCost - platformFee).toFixed(2));
    const profitMarginPercentage = sPrice > 0 ? Number(((netProfit / sPrice) * 100).toFixed(2)) : 0;

    return {
      sellingPrice: sPrice,
      costPrice: cPrice,
      shippingCost: sCost,
      feePercentage: feePct,
      fixedFee,
      platformFee,
      netProfit,
      profitMarginPercentage,
      isProfitable: netProfit >= 0,
      feeSource: feeConfig.source,
    };
  }

  /**
   * Get or initialize platform fee configuration defaults
   */
  async getPlatformConfig(platform: Platform): Promise<{ feePercentage: number; fixedFee: number }> {
    const config = await PlatformConfig.findOne({ platform });
    if (config) {
      return {
        feePercentage: config.defaultFeePercentage,
        fixedFee: config.defaultFixedFee,
      };
    }

    const fallback = INITIAL_PLATFORM_DEFAULTS[platform] || { feePercentage: 0, fixedFee: 0 };
    return fallback;
  }

  /**
   * Update platform fee configuration defaults (Admin/Configurable)
   */
  async updatePlatformConfig(platform: Platform, feePercentage?: number, fixedFee?: number, userId?: string) {
    const updateObj: Record<string, any> = {};
    if (feePercentage !== undefined) updateObj.defaultFeePercentage = Math.max(0, feePercentage);
    if (fixedFee !== undefined) updateObj.defaultFixedFee = Math.max(0, fixedFee);
    if (userId) updateObj.updatedBy = userId;

    const config = await PlatformConfig.findOneAndUpdate(
      { platform },
      { $set: updateObj },
      { new: true, upsert: true }
    );

    return config;
  }

  /**
   * 3-Tier Fee Resolution: Listing Override -> Store/Integration Override -> Platform Default
   */
  async resolveFeeConfig(mappingId: string): Promise<ResolvedFeeConfig> {
    const mapping = await ProductMapping.findById(mappingId);
    if (!mapping) {
      return { feePercentage: 0, fixedFee: 0, paymentFeePercentage: 0, source: "PLATFORM_DEFAULT" };
    }

    // Tier 1: Listing-level override
    if (mapping.platformFeePercentage !== undefined && mapping.platformFeePercentage !== null) {
      return {
        feePercentage: mapping.platformFeePercentage,
        fixedFee: mapping.fixedFee ?? 0,
        paymentFeePercentage: 0,
        source: "LISTING_OVERRIDE",
      };
    }

    // Tier 2: Store/Integration-level override
    const integration = await Integration.findById(mapping.integrationId);
    if (integration && integration.credentials) {
      const storeFeePct = integration.credentials.feePercentage;
      const storeFixedFee = integration.credentials.fixedFee;
      if (storeFeePct !== undefined && storeFeePct !== null) {
        return {
          feePercentage: Number(storeFeePct) || 0,
          fixedFee: Number(storeFixedFee) || 0,
          paymentFeePercentage: 0,
          source: "STORE_OVERRIDE",
        };
      }
    }

    // Tier 3: Platform Default Config
    const platform = integration?.platform || Platform.SHOPIFY;
    const defaultConfig = await this.getPlatformConfig(platform);

    return {
      feePercentage: defaultConfig.feePercentage,
      fixedFee: defaultConfig.fixedFee,
      paymentFeePercentage: 0,
      source: "PLATFORM_DEFAULT",
    };
  }
}

export const platformConfigService = new PlatformConfigService();

