import { ProductStatus } from "../../shared/enums/product-status.enum";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

export interface CreateProductDto {
  sku: string;
  title: string;
  description?: string;

  brand?: string;
  category?: string;

  images?: string[];

  costPrice?: number;
  price: number;
  currency?: string;
  quantity: number;
  inventoryMode?: "INDEPENDENT" | "SHARED";
  shippingCharge?: number;

  status?: ProductStatus;
  syncStatus?: SyncStatus;
}

export interface UpdateProductDto
  extends Partial<CreateProductDto> {}