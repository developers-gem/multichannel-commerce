import { ApiResponse } from "./common";

export type PlatformType = "SHOPIFY" | "EBAY" | "CUSTOM_WEBSITE";

export interface Integration {
  _id: string;
  platform: PlatformType;
  storeName: string;
  storeUrl: string;
  isActive: boolean;
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationResponse = ApiResponse<Integration[]>;
export type SingleIntegrationResponse = ApiResponse<Integration>;

export interface CreateIntegrationInput {
  platform: PlatformType;
  storeName: string;
  storeUrl: string;
  credentials: Record<string, unknown>;
}

export interface UpdateIntegrationInput {
  platform?: PlatformType;
  storeName?: string;
  storeUrl?: string;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
}

export interface CatalogImportError {
  sku: string;
  message: string;
}

export interface CatalogImportSummary {
  integrationId: string;
  platform: PlatformType;
  storeName: string;

  totalFetched: number;
  masterProductsCreated: number;
  masterProductsMatched: number;
  mappingsCreated: number;
  mappingsUpdated: number;
  failed: number;

  errors: CatalogImportError[];
}

export type CatalogImportResponse = ApiResponse<CatalogImportSummary>;