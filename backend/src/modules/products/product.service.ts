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

export interface ProductServiceOptions {
  skipSync?: boolean;
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

    const product = await Product.create(data);

    // Enqueue sync jobs for pre-existing mappings unless skipSync is explicitly requested
    if (!options.skipSync) {
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.CREATE);
    }

    return product;
  }

  /**
   * Get All Products with attached mappingCount for connected sales channels
   */
  async getAll(
    page: number = 1,
    limit: number = 10,
    search: string = ""
  ) {
    const skip = (page - 1) * limit;

    const query = {
      isDeleted: false,
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
  async getById(id: string) {
    const product = await Product.findOne({
      _id: id,
      isDeleted: false,
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
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.UPDATE);
    }

    return product;
  }

  /**
   * Soft Delete Product
   */
  async delete(id: string, options: ProductServiceOptions = {}) {
    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
      },
      {
        isDeleted: true,
      },
      {
        new: true,
      }
    );

    if (!product) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Product not found"
      );
    }

    if (!options.skipSync) {
      await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.DELETE);
    }

    return;
  }

  /**
   * Publish Master Product to selected sales channel integrations
   */
  async publishToChannels(productId: string, integrationIds: string[]) {
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Product not found");
    }

    if (!Array.isArray(integrationIds) || integrationIds.length === 0) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "At least one target channel integration must be selected");
    }

    const results = [];

    for (const integrationId of integrationIds) {
      try {
        const integration = await Integration.findOne({ _id: integrationId });
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
          mapping = await ProductMapping.create({
            productId: product._id,
            integrationId: integration._id,
            sku: product.sku,
            externalProductId: "",
            externalVariantId: "",
            externalSku: "",
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

        const jobRes = await syncService.enqueueSyncJob(mapping._id.toString(), action);
        results.push({
          integrationId,
          productMappingId: mapping._id,
          action,
          status: jobRes.status,
        });
      } catch (err: any) {
        // Skip duplicate active jobs or errors without failing other selected channels
      }
    }

    return results;
  }
}

export const productService = new ProductService();