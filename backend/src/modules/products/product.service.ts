import Product from "./product.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import Integration from "../integrations/integration.model";


import {
  CreateProductDto,
  UpdateProductDto,
} from "./product.types";

import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { syncService } from "../sync/sync.service";
import { SyncJobAction } from "../sync/sync.types";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
import { seedChannelListing } from "../sync/channel-values";

export interface ProductServiceOptions {
  skipSync?: boolean;
  userId?: string;
}




class ProductService {
  /**
   * Create Product
   */
  async create(data: CreateProductDto, options: ProductServiceOptions = {}) {
    const existingProduct = await Product.findOne({
      sku: data.sku,
      isDeleted: false,
    });

    if (existingProduct) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "SKU already exists"
      );
    }

    const product = await Product.create({ ...data, ...(options.userId ? { userId: options.userId } : {}) });

    // Enqueue sync jobs for pre-existing mappings unless skipSync is explicitly requested
    if (!options.skipSync) {
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.CREATE, options.userId);
    }

    return product;
  }

  /**
   * Get All Products with attached mappingCount for connected sales channels
   */
  async getAll(
    page: number = 1,
    limit: number = 10,
    search: string = "",
    userId?: string
  ) {
    const skip = (page - 1) * limit;

    const query = {
      isDeleted: false,
      ...(userId ? { userId } : {}),
      ...(search && {
        $or: [
          { sku: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
        ],
      }),
    };

    const [rawProducts, total] = await Promise.all([
      Product.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      Product.countDocuments(query),
    ]);

    const products = await Promise.all(
      rawProducts.map(async (p) => {
        const mappingCount = await ProductMapping.countDocuments({
          productId: p._id,
          isDeleted: false,
        });

        return {
          ...p.toObject(),
          mappingCount,
        };
      })
    );

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Product By Id
   */
  async getById(id: string, userId?: string) {
    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
      ...(userId ? { userId } : {}),
    });

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    const mappingCount = await ProductMapping.countDocuments({
      productId: product._id,
      isDeleted: false,
    });

    return {
      ...product.toObject(),
      mappingCount,
    };
  }

  /**
   * Update Product
   */
  async update(
    id: string,
    data: UpdateProductDto,
    options: ProductServiceOptions = {}
  ) {
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        ...(options.userId ? { userId: options.userId } : {}),
      },
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    // Enqueue sync jobs for active mappings unless skipSync is explicitly requested
    if (!options.skipSync) {
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.UPDATE, options.userId);
    }

    return product;
  }

  /**
   * Soft Delete Product
   */
  async delete(id: string, options: ProductServiceOptions = {}) {
    const product = await Product.findOne(
      {
        _id: id,
        isDeleted: false,
        ...(options.userId ? { userId: options.userId } : {}),
      }
    );

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    if (!options.skipSync) {
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.DELETE, options.userId);
    }

    await Product.findByIdAndUpdate(product._id, { isDeleted: true });

    return;
  }

  /**
   * Publish Master Product to selected sales channel integrations
   */
  async publishToChannels(
    productId: string,
    integrationIds: string[],
    userId?: string,
    channelValues?: Record<string, { channelPrice?: number; channelQuantity?: number; channelCurrency?: string }>
  ) {
    const product = await Product.findOne({ _id: productId, isDeleted: false, ...(userId ? { userId } : {}) });
    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product not found");
    }

    if (!Array.isArray(integrationIds) || integrationIds.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "At least one target channel integration must be selected");
    }

    const results = [];

    for (const integrationId of integrationIds) {
      try {
        const integration = await Integration.findOne({ _id: integrationId, ...(userId ? { userId } : {}) });
        if (!integration || !integration.isActive) {
          continue; // Skip inactive integration independently
        }

        let mapping = await ProductMapping.findOne({
          productId: product._id,
          integrationId: integration._id,
          isDeleted: false,
        });

        let action = SyncJobAction.CREATE;

        if (!mapping) {
          const requested = channelValues?.[String(integration._id)] || {};
          const seeded = seedChannelListing({
            channelPrice: requested.channelPrice,
            channelQuantity: requested.channelQuantity,
            channelCurrency: requested.channelCurrency,
            masterPrice: product.price,
            masterQuantity: product.quantity,
            masterCurrency: product.currency,
            integrationCurrency: integration.credentials?.currency as string | undefined,
          });
          mapping = await ProductMapping.create({
            productId: product._id,
            integrationId: integration._id,
            sku: product.sku,
            externalProductId: "",
            externalVariantId: "",
            externalSku: "",
            channelPrice: seeded.channelPrice,
            channelQuantity: seeded.channelQuantity,
            channelCurrency: seeded.channelCurrency,
            syncStatus: SyncStatus.PENDING,
            isActive: true,
            isDeleted: false,
          });
        } else {
          if (mapping.externalProductId && mapping.externalProductId.trim() !== "") {
            action = SyncJobAction.UPDATE;
          } else {
            action = SyncJobAction.CREATE;
          }
        }

        const jobRes = await syncService.enqueueSyncJob(mapping._id.toString(), action, userId);
        results.push({
          integrationId,
          productMappingId: mapping._id,
          action,
          status: jobRes.status,
        });
      } catch (err: any) {
        results.push({
          integrationId,
          status: "FAILED",
          error: err?.message || "Failed to publish to this channel",
        });
      }
    }

    if (results.length > 0 && results.every((result) => result.status === "FAILED")) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, results.map((result) => result.error).filter(Boolean).join("; "));
    }

    return results;
  }
}



export const productService = new ProductService();