import mongoose, { Schema } from "mongoose";
import { ISyncLog, SyncJobAction, SyncLogStatus } from "./sync.types";

const syncLogSchema = new Schema<ISyncLog>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productMappingId: {
      type: Schema.Types.ObjectId,
      ref: "ProductMapping",
      required: true,
    },
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(SyncJobAction),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SyncLogStatus),
      default: SyncLogStatus.PENDING,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    error: {
      type: String,
      default: "",
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

syncLogSchema.index({ productMappingId: 1 });
syncLogSchema.index({ productId: 1 });
syncLogSchema.index({ integrationId: 1 });
syncLogSchema.index({ status: 1 });
syncLogSchema.index({ createdAt: -1 });
syncLogSchema.index({ productMappingId: 1, action: 1, status: 1 });

export default mongoose.model<ISyncLog>("SyncLog", syncLogSchema);
