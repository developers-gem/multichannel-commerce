import { ApiResponse } from "./common";
import { Product, SyncStatus } from "./product";
import { Integration } from "./integration";

export interface ProductMapping {
  _id: string;
  productId: Product | string;
  integrationId: Integration | string;
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
  missingAspects?: string[];
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  lastSyncError?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SingleProductMappingResponse = ApiResponse<ProductMapping>;
export type ProductMappingsListResponse = ApiResponse<ProductMapping[]>;

export interface ChannelListing {
  externalProductId: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  title: string;
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
}

export interface ChannelListingsResult {
  listings: ChannelListing[];
  message?: string;
}

export type ChannelListingsResponse = ApiResponse<ChannelListingsResult>;

export interface CreateProductMappingInput {
  productId: string;
  integrationId: string;
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  isActive?: boolean;
}

export interface UpdateProductMappingInput {
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  channelPrice?: number;
  channelQuantity?: number;
  channelCurrency?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  isActive?: boolean;
}
