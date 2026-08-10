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
  externalSku?: string;
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

export interface CreateProductMappingInput {
  productId: string;
  integrationId: string;
  externalProductId: string;
  externalVariantId?: string;
  externalSku?: string;
  isActive?: boolean;
}

export interface UpdateProductMappingInput {
  externalProductId?: string;
  externalVariantId?: string;
  externalSku?: string;
  isActive?: boolean;
}
