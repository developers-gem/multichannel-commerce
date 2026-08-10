import Integration from "../integrations/integration.model";
import Product from "../products/product.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import { productService } from "../products/product.service";
import { MarketplaceConnectorFactory } from "../sync/connectors/connector.factory";
import { IChannelImportConnector } from "../sync/connectors/connector.interface";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { CATALOG_IMPORT_MESSAGES } from "./catalog-import.messages";
import { CatalogImportError, CatalogImportSummary } from "./catalog-import.types";

class CatalogImportService {
  /**
   * Execute channel product catalog import for a given Integration
   */
  async importChannelCatalog(integrationId: string): Promise<CatalogImportSummary> {
    // 1. Verify Integration exists and is active
    const integration = await Integration.findById(integrationId);

    if (!integration) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, CATALOG_IMPORT_MESSAGES.INTEGRATION_NOT_FOUND);
    }

    if (!integration.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, CATALOG_IMPORT_MESSAGES.INTEGRATION_INACTIVE);
    }

    // 2. Resolve Connector from Factory & check import support
    const connector = MarketplaceConnectorFactory.getConnector(integration.platform) as any;

    if (typeof connector.fetchChannelProducts !== "function") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, CATALOG_IMPORT_MESSAGES.UNSUPPORTED_PLATFORM);
    }

    const importConnector = connector as IChannelImportConnector;

    let totalFetched = 0;
    let masterProductsCreated = 0;
    let masterProductsMatched = 0;
    let mappingsCreated = 0;
    let mappingsUpdated = 0;
    let failed = 0;
    const errors: CatalogImportError[] = [];

    let hasNextPage = true;
    let cursor: string | null = null;
    const limit = 50;

    // 3. Page fetch products from channel
    while (hasNextPage) {
      let pageData;
      try {
        pageData = await importConnector.fetchChannelProducts(
          integration.credentials,
          cursor,
          limit
        );
      } catch (fetchErr: any) {
        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          fetchErr.message || "Failed to fetch products from channel"
        );
      }

      const products = pageData.products || [];
      totalFetched += products.length;

      // 4. Process each normalized channel product
      for (const normalized of products) {
        const rawSku = (normalized.sku || "").trim();

        if (!rawSku) {
          failed++;
          errors.push({
            sku: "",
            message: "Skipped product because SKU is missing",
          });
          continue;
        }

        const skuUpper = rawSku.toUpperCase();

        try {
          // A. Master SKU Matching Strategy: Match existing active Product by Master SKU
          let masterProduct = await Product.findOne({
            sku: skuUpper,
            isDeleted: false,
          });

          if (!masterProduct) {
            // Create new Master Product (passing skipSync: true to prevent outgoing sync loops)
            masterProduct = await productService.create(
              {
                sku: skuUpper,
                title: normalized.title || "Untitled Product",
                description: normalized.description || "",
                brand: normalized.brand || "",
                category: normalized.category || "",
                images: normalized.images || [],
                price: Math.max(0, normalized.price || 0),
                quantity: Math.max(0, normalized.quantity || 0),
                shippingCharge: Math.max(0, normalized.shippingCharge || 0),
                status: (normalized.status || "ACTIVE") as any,
              },
              { skipSync: true }
            );
            masterProductsCreated++;
          } else {
            // Reuse existing Master Product WITHOUT overwriting existing master price or quantity
            masterProductsMatched++;
          }

          // B. ProductMapping Lookup & Upsert (Matching by productId + integrationId or external IDs)
          let mapping = await ProductMapping.findOne({
            productId: masterProduct._id,
            integrationId: integration._id,
            isDeleted: false,
          });

          if (!mapping && normalized.externalProductId) {
            mapping = await ProductMapping.findOne({
              integrationId: integration._id,
              externalProductId: normalized.externalProductId,
              externalVariantId: normalized.externalVariantId || "",
              isDeleted: false,
            });
          }

          if (mapping) {
            // Update existing ProductMapping external identifiers
            mapping.externalProductId = normalized.externalProductId;
            mapping.externalVariantId = normalized.externalVariantId || "";
            mapping.externalSku = normalized.externalSku || skuUpper;
            mapping.syncStatus = SyncStatus.SYNCED;
            mapping.lastSyncedAt = new Date();
            mapping.lastSyncError = "";
            await mapping.save();
            mappingsUpdated++;
          } else {
            // Create new ProductMapping
            await ProductMapping.create({
              productId: masterProduct._id,
              integrationId: integration._id,
              sku: skuUpper,
              externalProductId: normalized.externalProductId,
              externalVariantId: normalized.externalVariantId || "",
              externalSku: normalized.externalSku || skuUpper,
              syncStatus: SyncStatus.SYNCED,
              lastSyncedAt: new Date(),
              isActive: true,
              isDeleted: false,
            });
            mappingsCreated++;
          }
        } catch (rowErr: any) {
          failed++;
          errors.push({
            sku: skuUpper,
            message: rowErr.message || "Failed to import channel product row",
          });
        }
      }

      hasNextPage = Boolean(pageData.hasNextPage);
      cursor = pageData.nextCursor || null;

      if (!cursor) {
        break;
      }
    }

    // Update integration lastSync timestamp
    await Integration.findByIdAndUpdate(integrationId, {
      lastSync: new Date(),
    });

    return {
      integrationId: integration._id.toString(),
      platform: integration.platform,
      storeName: integration.storeName,
      totalFetched,
      masterProductsCreated,
      masterProductsMatched,
      mappingsCreated,
      mappingsUpdated,
      failed,
      errors,
    };
  }
}

export const catalogImportService = new CatalogImportService();
