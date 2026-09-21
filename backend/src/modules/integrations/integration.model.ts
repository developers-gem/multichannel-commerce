import { Schema, model, Document, Types } from "mongoose";
import { Platform } from "../../shared/enums/platform.enum";

export interface IIntegration extends Document {
  userId?: Types.ObjectId;
  platform: Platform;
  storeName: string;
  storeUrl: string;

  credentials: Record<string, any>;

  isActive: boolean;

  lastSync?: Date;
}

const integrationSchema = new Schema<IIntegration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    platform: {
      type: String,
      enum: Object.values(Platform),
      required: true,
    },

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    storeUrl: {
      type: String,
      required: true,
      trim: true,
    },

    credentials: {
      type: Schema.Types.Mixed,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastSync: Date,
  },
  {
    timestamps: true,
  }
);

// Compound unique index per user, platform, and storeUrl
integrationSchema.index(
  { userId: 1, platform: 1, storeUrl: 1 },
  { unique: true, sparse: true }
);

const Integration = model<IIntegration>(
  "Integration",
  integrationSchema
);

export default Integration;