import { ApiResponse } from "./common";

export type SyncAction = "CREATE" | "UPDATE" | "DELETE";
export type SyncStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface PopulatedProductRef {
  _id: string;
  sku: string;
  title: string;
  description?: string;
  price?: number;
  quantity?: number;
  status?: string;
}

export interface PopulatedIntegrationRef {
  _id: string;
  platform: string;
  storeName: string;
  storeUrl?: string;
}

export interface PopulatedProductMappingRef {
  _id: string;
  externalProductId: string;
  externalVariantId?: string;
  externalSku?: string;
  syncStatus?: string;
}

export interface SyncLog {
  _id: string;
  productId: PopulatedProductRef | string;
  productMappingId: PopulatedProductMappingRef | string;
  integrationId: PopulatedIntegrationRef | string;
  action: SyncAction;
  status: SyncStatus;
  attempts: number;
  maxAttempts: number;
  error: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLogsData {
  logs: SyncLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type SyncLogsResponse = ApiResponse<SyncLogsData>;
export type SingleSyncLogResponse = ApiResponse<SyncLog>;

export interface SyncEnqueueData {
  syncLogId: string;
  jobId: string;
  status: string;
}

export type SyncEnqueueResponse = ApiResponse<SyncEnqueueData>;

export interface SyncLogFilters {
  page?: number;
  limit?: number;
  status?: SyncStatus;
  action?: SyncAction;
  integrationId?: string;
  productMappingId?: string;
  productId?: string;
}
