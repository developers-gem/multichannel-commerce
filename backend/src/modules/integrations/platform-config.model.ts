import { Schema, model } from "mongoose";
import { IPlatformConfig } from "./platform-config.types";
import { Platform } from "../../shared/enums/platform.enum";

const platformConfigSchema = new Schema<IPlatformConfig>(
  {
    platform: {
      type: String,
      enum: Object.values(Platform),
      required: true,
      unique: true,
    },

    defaultFeePercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    defaultFixedFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    defaultPaymentFeePercentage: {
      type: Number,
      default: 0,
      min: 0,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const PlatformConfig = model<IPlatformConfig>("PlatformConfig", platformConfigSchema);
