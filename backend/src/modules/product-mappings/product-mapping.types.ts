import { Document, Types } from "mongoose";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

export interface IProductMapping extends Document {
  productId: Types.ObjectId;
  integrationId: Types.ObjectId;
  sku: string;
  externalProductId: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;

  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  channelAspects?: Record<string, string[]>;
  missingAspects?: string[];
  shippingCost?: number;
  platformFeePercentage?: number;
  fixedFee?: number;

  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  lastSyncError?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
 
