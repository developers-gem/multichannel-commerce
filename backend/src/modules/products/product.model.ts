import mongoose, { Schema } from "mongoose";

import { ProductStatus } from "../../shared/enums/product-status.enum";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

const productSchema = new Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    brand: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      default: "",
    },

    images: [
      {
        type: String,
      },
    ],

    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    shippingCharge: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.ACTIVE,
    },

    syncStatus: {
      type: String,
      enum: Object.values(SyncStatus),
      default: SyncStatus.PENDING,
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

export default mongoose.model("Product", productSchema);