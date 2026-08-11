import ProductMapping from "./product-mapping.model";
import Product from "../products/product.model";
import Integration from "../integrations/integration.model";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
import { syncService } from "../sync/sync.service";
import { SyncJobAction } from "../sync/sync.types";

export interface CreateProductMappingDto {
  productId: string;
  integrationId: string;
  externalProductId: string;
  externalVariantId?: string;
  externalSku?: string;
  isActive?: boolean;
}

export interface UpdateProductMappingDto {
  externalProductId?: string;
  externalVariantId?: string;
  externalSku?: string;
  isActive?: boolean;
}

class ProductMappingService {
  /**
   * 1. Create Product Mapping
   */
  async create(data: CreateProductMappingDto) {
    // Step 1: Find Master Product
    const product = await Product.findOne({
      _id: data.productId,
      isDeleted: false,
    });

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    // Step 2: Find Integration
    const integration = await Integration.findById(data.integrationId);

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
        "Product is already mapped to this integration"
      );
    }

    // Step 4: Check if externalProductId is already mapped to another product within the same integration
    if (data.externalProductId && data.externalProductId.trim() !== "") {
      const existingExternalMapping = await ProductMapping.findOne({
        integrationId: data.integrationId,
        externalProductId: data.externalProductId,
        isDeleted: false,
      });

      if (existingExternalMapping) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "External Product ID is already mapped to this integration"
        );
      }
    }

    // Step 5: Create Product Mapping
    try {
      const mapping = await ProductMapping.create({
        productId: data.productId,
        integrationId: data.integrationId,
        sku: product.sku,
        externalProductId: data.externalProductId,
        externalVariantId: data.externalVariantId || "",
        externalSku: data.externalSku || "",
        syncStatus: SyncStatus.PENDING,
        isActive: data.isActive ?? true,
        isDeleted: false,
      });

      const populated = await ProductMapping.findById(mapping._id)
        .populate("productId", "sku title category price quantity status")
        .populate("integrationId", "platform storeName storeUrl isActive");

      return populated;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "A product mapping with these parameters already exists"
        );
      }
      throw error;
    }
  }

  /**
   * 2. Get All Product Mappings (non-deleted, populated without credentials)
   */
  async getAll(productId?: string) {
    const query: Record<string, unknown> = { isDeleted: false };
    if (productId) {
      query.productId = productId;
    }

    return ProductMapping.find(query)
      .populate("productId", "sku title category price quantity shippingCharge status")
      .populate("integrationId", "platform storeName storeUrl isActive")
      .sort({ createdAt: -1 });
  }

  /**
   * 3. Get Product Mapping By ID
   */
  async getById(id: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate("productId", "sku title category price quantity status")
      .populate("integrationId", "platform storeName storeUrl isActive");

    if (!mapping) {
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
  async update(id: string, data: UpdateProductMappingDto) {
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

    // Check duplicate externalProductId within same integration if changed
    if (
      data.externalProductId &&
      data.externalProductId !== mapping.externalProductId &&
      data.externalProductId.trim() !== ""
    ) {
      const duplicateExternal = await ProductMapping.findOne({
        integrationId: mapping.integrationId,
        externalProductId: data.externalProductId,
        _id: { $ne: id },
        isDeleted: false,
      });

      if (duplicateExternal) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "External Product ID is already mapped to this integration"
        );
      }
    }

    if (data.externalProductId !== undefined) {
      mapping.externalProductId = data.externalProductId;
    }

    if (data.externalVariantId !== undefined) {
      mapping.externalVariantId = data.externalVariantId;
    }

    if (data.externalSku !== undefined) {
      mapping.externalSku = data.externalSku;
    }

    if (data.isActive !== undefined) {
      mapping.isActive = data.isActive;
    }

    try {
      await mapping.save();

      const updated = await ProductMapping.findById(mapping._id)
        .populate("productId", "sku title category price quantity status")
        .populate("integrationId", "platform storeName storeUrl isActive");

      return updated;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "A product mapping with these parameters already exists"
        );
      }
      throw error;
    }
  }

  /**
   * 5. Delete (Soft Delete) Product Mapping
   */
  async delete(id: string) {
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

    mapping.isDeleted = true;
    mapping.isActive = false;

    await mapping.save();

    return;
  }

  /**
   * 6. Unpublish Product Mapping (Enqueue DELETE Sync Job)
   */
  async unpublishChannel(id: string) {
    const mapping = await ProductMapping.findOne({
      _id: id,
      isDeleted: false,
    });

    if (!mapping) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product mapping not found");
    }

    const integration = await Integration.findById(mapping.integrationId);
    if (!integration || !integration.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Target channel integration is inactive or missing");
    }

    const syncJobResult = await syncService.enqueueSyncJob(
      mapping._id.toString(),
      SyncJobAction.DELETE
    );

    return syncJobResult;
  }
}

export const productMappingService = new ProductMappingService();
