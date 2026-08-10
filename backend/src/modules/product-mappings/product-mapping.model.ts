import { Schema, model } from "mongoose";
import { IProductMapping } from "./product-mapping.types";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

const productMappingSchema = new Schema<IProductMapping>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },

    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    externalProductId: {
      type: String,
      trim: true,
      default: "",
    },

    externalVariantId: {
      type: String,
      trim: true,
      default: "",
    },

    externalSku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    syncStatus: {
      type: String,
      enum: Object.values(SyncStatus),
      default: SyncStatus.PENDING,
    },

    lastSyncedAt: {
      type: Date,
    },

    lastSyncError: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: productId + integrationId (Guarantees 1 mapping per Product + Integration pair)
productMappingSchema.index(
  { productId: 1, integrationId: 1 },
  { unique: true }
);

// Normal index: sku
productMappingSchema.index({ sku: 1 });

// Unique compound index for external IDs: integrationId + externalProductId + externalVariantId
// Uses partialFilterExpression to ignore pending mappings with empty externalProductId ("")
productMappingSchema.index(
  { integrationId: 1, externalProductId: 1, externalVariantId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      externalProductId: { $gt: "" },
    },
  }
);

const ProductMappingModel = model<IProductMapping>("ProductMapping", productMappingSchema);

// Sync indexes to automatically update MongoDB index definitions
ProductMappingModel.syncIndexes().catch(() => {});

export default ProductMappingModel;