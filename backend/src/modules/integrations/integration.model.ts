import { Schema, model, Document } from "mongoose";
import { Platform } from "../../shared/enums/platform.enum";

export interface IIntegration extends Document {
  platform: Platform;
  storeName: string;
  storeUrl: string;

  credentials: Record<string, any>;

  isActive: boolean;

  lastSync?: Date;
}

const integrationSchema = new Schema<IIntegration>(
  {
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

const Integration = model<IIntegration>(
  "Integration",
  integrationSchema
);

export default Integration;