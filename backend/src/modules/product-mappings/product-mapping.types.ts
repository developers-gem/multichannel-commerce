import { Document, Types } from "mongoose";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

export interface IProductMapping extends Document {
  productId: Types.ObjectId;
  integrationId: Types.ObjectId;
  sku: string;
  externalProductId: string;
  externalVariantId?: string;
  externalSku?: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  lastSyncError?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}