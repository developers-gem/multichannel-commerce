export interface CatalogImportError {
  sku: string;
  message: string;
}

export interface CatalogImportSummary {
  integrationId: string;
  platform: string;
  storeName: string;

  totalFetched: number;
  masterProductsCreated: number;
  masterProductsMatched: number;
  mappingsCreated: number;
  mappingsUpdated: number;
  failed: number;

  errors: CatalogImportError[];
}
