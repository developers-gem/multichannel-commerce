export interface SyncPayload {
  sku: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price: number;
  currency?: string;
  quantity: number;
  shippingCharge?: number;
  status?: string;
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  channelCategoryId?: string;
  channelCategoryName?: string;
  channelAspects?: Record<string, string[]>;
  aspects?: Record<string, string[]>;
  storeUrl?: string;
  integrationId?: string;
  credentials?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  externalProductId?: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  categoryId?: string;
  categoryName?: string;
  aspects?: Record<string, string[]>;
  missingAspects?: string[];
  error?: string;
}

export interface HealthCheckResult {
  success: boolean;
  message: string;
}

export interface IMarketplaceConnector {
  createProduct(payload: SyncPayload): Promise<SyncResult>;
  updateProduct(payload: SyncPayload): Promise<SyncResult>;
  deleteProduct(payload: SyncPayload): Promise<SyncResult>;
  testConnection(credentials?: Record<string, unknown>, storeUrl?: string, integrationId?: string): Promise<HealthCheckResult>;
}

/**
 * Normalized Product structure produced during Inbound Channel Product Import
 */
export interface NormalizedChannelProduct {
  sku: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price: number;
  currency?: string;
  quantity: number;
  shippingCharge?: number;
  status?: string;

  externalProductId: string;
  externalVariantId?: string;
  externalInventoryItemId?: string;
  externalSku?: string;
  categoryId?: string;
}

/**
 * Paginated response structure for Inbound Channel Product Import
 */
export interface PaginatedChannelProducts {
  products: NormalizedChannelProduct[];
  nextCursor?: string | null;
  hasNextPage: boolean;
  errors?: Array<{ sku: string; message: string }>;
}

/**
 * Interface implemented by connectors supporting Inbound Channel Product Import
 */
export interface IChannelImportConnector {
  fetchChannelProducts(
    credentials?: Record<string, unknown>,
    cursor?: string | null,
    limit?: number,
    storeUrl?: string,
    integrationId?: string
  ): Promise<PaginatedChannelProducts>;
}
