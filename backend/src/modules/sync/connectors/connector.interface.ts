export interface SyncPayload {
  sku: string;
  title: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price: number;
  quantity: number;
  shippingCharge?: number;
  status?: string;
  externalProductId?: string;
  externalVariantId?: string;
  credentials?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  externalProductId?: string;
  externalVariantId?: string;
  externalSku?: string;
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
  testConnection(credentials?: Record<string, unknown>, storeUrl?: string): Promise<HealthCheckResult>;
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
  quantity: number;
  shippingCharge?: number;
  status?: string;

  externalProductId: string;
  externalVariantId?: string;
  externalSku?: string;
}

/**
 * Paginated response structure for Inbound Channel Product Import
 */
export interface PaginatedChannelProducts {
  products: NormalizedChannelProduct[];
  nextCursor?: string | null;
  hasNextPage: boolean;
}

/**
 * Interface implemented by connectors supporting Inbound Channel Product Import
 */
export interface IChannelImportConnector {
  fetchChannelProducts(
    credentials?: Record<string, unknown>,
    cursor?: string | null,
    limit?: number
  ): Promise<PaginatedChannelProducts>;
}
