import ProductMapping from "./product-mapping.model";
import Product from "../products/product.model";
import Integration from "../integrations/integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
import { syncService } from "../sync/sync.service";
import { SyncJobAction } from "../sync/sync.types";
import { seedChannelListing, syncTargetsForMappingUpdate } from "../sync/channel-values";
import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
import { IChannelImportConnector } from "../sync/connectors/connector.interface";
import { Platform } from "../../shared/enums/platform.enum";

export interface CreateProductMappingDto {
  productId: string;
  integrationId: string;
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  shippingCost?: number;
  platformFeePercentage?: number;
  fixedFee?: number;
  isActive?: boolean;
}

export interface UpdateProductMappingDto {
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  shippingCost?: number;
  platformFeePercentage?: number;
  fixedFee?: number;
  isActive?: boolean;
}

class ProductMappingService {
  /**
   * 1. Create Product Mapping
   */
  async create(data: CreateProductMappingDto, userId?: string) {
    // Step 1: Find Master Product
    const product = await Product.findOne({
      _id: data.productId,
      isDeleted: false,
      ...(userId ? { userId } : {}),
    });

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    // Step 2: Find Integration
    const integration = await Integration.findOne({ _id: data.integrationId, ...(userId ? { userId } : {}) });

    if (!integration) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Integration not found"
      );
    }

    if (!integration.isActive) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Integration is inactive"
      );
    }

    // Step 3: Check if Product + Integration mapping already exists
    const existingProductMapping = await ProductMapping.findOne({
      productId: data.productId,
      integrationId: data.integrationId,
      isDeleted: false,
    });

    if (existingProductMapping) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This master product is already connected to this store"
      );
    }

    // Step 4: Check if externalProductId is already mapped to another product within the same integration
    if (data.externalProductId && data.externalProductId.trim() !== "") {
      const existingExternalMapping = await ProductMapping.findOne({
        integrationId: data.integrationId,
        externalProductId: data.externalProductId,
        externalVariantId: data.externalVariantId || "",
        isDeleted: false,
      });

      if (existingExternalMapping) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "This existing listing is already connected to a master product"
        );
      }
    }

    const seeded = seedChannelListing({
      channelPrice: data.channelPrice,
      channelQuantity: data.channelQuantity,
      channelCurrency: data.channelCurrency,
      masterPrice: product.price,
      masterQuantity: product.quantity,
      masterCurrency: product.currency,
      integrationCurrency: integration.credentials?.currency as string | undefined,
    });

    // Step 5: Create Product Mapping. Channel values are snapshotted once here.
    try {
      const mapping = await ProductMapping.create({
        productId: data.productId,
        integrationId: data.integrationId,
        sku: product.sku,
        externalProductId: data.externalProductId || "",
        externalVariantId: data.externalVariantId || "",
        externalInventoryItemId: data.externalInventoryItemId || "",
        externalSku: data.externalSku || "",
        channelPrice: seeded.channelPrice,
        channelQuantity: seeded.channelQuantity,
        channelCurrency: seeded.channelCurrency,
        channelCategoryId: data.channelCategoryId || "",
        channelCategoryName: data.channelCategoryName || "",
        shippingCost: data.shippingCost ?? 0,
        platformFeePercentage: data.platformFeePercentage,
        fixedFee: data.fixedFee,
        syncStatus: SyncStatus.PENDING,
        isActive: data.isActive ?? true,
        isDeleted: false,
      });

      const populated = await ProductMapping.findById(mapping._id)
        .populate("productId", "sku title category costPrice price quantity shippingCharge status")
        .populate("integrationId", "platform storeName storeUrl isActive");

      return populated;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "This existing listing is already connected"
        );
      }
      throw error;
    }
  }

  /**
   * 2. Get All Product Mappings (non-deleted, populated without credentials)
   */
  async getAll(productId?: string, userId?: string) {
    const query: Record<string, unknown> = { isDeleted: false };
    if (productId) {
      query.productId = productId;
    }
    if (userId) {
      const integrations = await Integration.find({ userId }).select("_id");
      query.integrationId = { $in: integrations.map((integration) => integration._id) };
    }

    return ProductMapping.find(query)
      .populate("productId", "sku title category costPrice price quantity shippingCharge status")
      .populate("integrationId", "platform storeName storeUrl isActive")
      .sort({ createdAt: -1 });
  }

  /**
   * 3. Get Product Mapping By ID
   */
  async getById(id: string, userId?: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate({ path: "integrationId", match: userId ? { userId } : undefined, select: "platform storeName storeUrl isActive userId" })
      .populate("productId", "sku title category costPrice price quantity status")
      .populate("integrationId", "platform storeName storeUrl isActive");

    if (!mapping || (userId && !mapping.integrationId)) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product mapping not found"
      );
    }

    return mapping;
  }

  /**
   * 4. Update Product Mapping
   */
  async update(id: string, data: UpdateProductMappingDto, userId?: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!mapping) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product mapping not found"
      );
    }

    const integration = await Integration.findOne({ _id: mapping.integrationId, ...(userId ? { userId } : {}) });
    if (!integration) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product mapping not found");

    // Check duplicate externalProductId within same integration if changed
    if (
      data.externalProductId &&
      data.externalProductId !== mapping.externalProductId &&
      data.externalProductId.trim() !== ""
    ) {
      const duplicateExternal = await ProductMapping.findOne({
        integrationId: mapping.integrationId,
        externalProductId: data.externalProductId,
        externalVariantId: data.externalVariantId || mapping.externalVariantId || "",
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateExternal) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "This existing listing is already connected to a master product"
        );
      }
    }

    if (data.externalProductId !== undefined) {
      mapping.externalProductId = data.externalProductId;
    }

    if (data.externalVariantId !== undefined) {
      mapping.externalVariantId = data.externalVariantId;
    }

    if (data.externalInventoryItemId !== undefined) {
      mapping.externalInventoryItemId = data.externalInventoryItemId;
    }

    if (data.externalSku !== undefined) {
      mapping.externalSku = data.externalSku;
    }

    if (data.channelPrice !== undefined) {
      mapping.channelPrice = data.channelPrice;
    }

    if (data.channelQuantity !== undefined) {
      mapping.channelQuantity = data.channelQuantity;
    }

    if (data.channelCurrency !== undefined) {
      mapping.channelCurrency = data.channelCurrency.toUpperCase();
    }

    if (data.channelCategoryId !== undefined) {
      mapping.channelCategoryId = data.channelCategoryId;
      mapping.missingAspects = [];
    }

    if (data.channelCategoryName !== undefined) {
      mapping.channelCategoryName = data.channelCategoryName;
    }

    if (data.shippingCost !== undefined) {
      mapping.shippingCost = data.shippingCost;
    }

    if (data.platformFeePercentage !== undefined) {
      mapping.platformFeePercentage = data.platformFeePercentage;
    }

    if (data.fixedFee !== undefined) {
      mapping.fixedFee = data.fixedFee;
    }

    if (data.isActive !== undefined) {
      mapping.isActive = data.isActive;
    }

    try {
      await mapping.save();

      const syncTargets = syncTargetsForMappingUpdate(mapping._id.toString(), data);
      if (syncTargets.length === 1 && mapping.isActive) {
        try {
          await syncService.enqueueSyncJob(syncTargets[0], SyncJobAction.UPDATE, userId);
        } catch (error: any) {
          if (error?.statusCode !== HTTP_STATUS.CONFLICT) throw error;
        }
      }

      const updated = await ProductMapping.findById(mapping._id)
        .populate("productId", "sku title category costPrice price quantity status")
        .populate("integrationId", "platform storeName storeUrl isActive");

      return updated;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "This existing listing is already connected"
        );
      }
      throw error;
    }
  }



  /**
   * 5. Delete (Soft Delete) Product Mapping
   */
  async delete(id: string, userId?: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!mapping) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product mapping not found"
      );
    }

    const integration = await Integration.findOne({ _id: mapping.integrationId, ...(userId ? { userId } : {}) });
    if (!integration) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product mapping not found");

    mapping.isDeleted = true;
    mapping.isActive = false;

    await mapping.save();

    return;
  }

  /**
   * 6. Unpublish Product Mapping (Enqueue DELETE Sync Job)
   */
  async unpublishChannel(id: string, userId?: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!mapping) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product mapping not found");
    }

    const integration = await Integration.findOne({ _id: mapping.integrationId, ...(userId ? { userId } : {}) });
    if (!integration || !integration.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Target channel integration is inactive or missing");
    }

    const syncJobResult = await syncService.enqueueSyncJob(
      mapping._id.toString(),
      SyncJobAction.DELETE,
      userId
    );

    return syncJobResult;
  }

  /**
   * Existing remote listings for one integration.
   * Shopify and eBay are read through the existing import connectors.
   * A live fetch failure returns any listings already stored for that same integration
   * plus the channel error, so the UI does not collapse into a generic 500.
   */
  async listChannelListings(integrationId: string, userId?: string) {
    const integration = await Integration.findOne({
      _id: integrationId,
      ...(userId ? { userId } : {}),
    });
    if (!integration) throw new ApiError(HTTP_STATUS.NOT_FOUND, "Integration not found");
    if (!integration.isActive) throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Integration is inactive");

    const stored = () => this.listingsFromStoredMappings(integration._id);

    if (integration.platform === Platform.SHOPIFY || integration.platform === Platform.EBAY) {
      const connector = MarketplaceConnectorFactory.getConnector(integration.platform) as unknown as IChannelImportConnector;
      if (typeof connector.fetchChannelProducts !== "function") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "This integration cannot list channel products");
      }
      try {
        const page = await connector.fetchChannelProducts(
          integration.credentials,
          null,
          50,
          integration.storeUrl,
          integration._id.toString()
        );
        return {
          listings: (page.products || []).map((product) => ({
            externalProductId: product.externalProductId,
            externalVariantId: product.externalVariantId || "",
            externalInventoryItemId: product.externalInventoryItemId || "",
            externalSku: product.externalSku || product.sku,
            title: product.title,
            channelPrice: product.price,
            channelQuantity: product.quantity,
            channelCurrency: product.currency || "",
            channelCategoryId: product.categoryId || "",
            channelCategoryName: product.category || "",
          })),
        };
      } catch (error) {
        return {
          listings: await stored(),
          message: channelListingErrorMessage(error),
        };
      }
    }

    return { listings: await stored() };
  }

  private async listingsFromStoredMappings(integrationId: unknown) {
    const mappings = await ProductMapping.find({
      integrationId,
      isDeleted: false,
      externalProductId: { $gt: "" },
    })
      .populate("productId", "title sku")
      .sort({ updatedAt: -1 })
      .limit(100);

    return mappings.map((mapping) => {
      const product = mapping.productId as unknown as { title?: string; sku?: string } | null;
      return {
        externalProductId: mapping.externalProductId,
        externalVariantId: mapping.externalVariantId || "",
        externalInventoryItemId: mapping.externalInventoryItemId || "",
        externalSku: mapping.externalSku || mapping.sku,
        title: product?.title || mapping.sku,
        channelPrice: mapping.channelPrice,
        channelQuantity: mapping.channelQuantity,
        channelCurrency: mapping.channelCurrency || "",
        channelCategoryId: mapping.channelCategoryId || "",
        channelCategoryName: mapping.channelCategoryName || "",
      };
    });
  }
}

function channelListingErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Failed to load existing listings";
  if (/402|Unavailable Shop/i.test(message)) {
    return "Shopify store is unavailable (HTTP 402). Existing listings cannot be loaded until the shop is available.";
  }
  return message;
}

export const productMappingService = new ProductMappingService();
