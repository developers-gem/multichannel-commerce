import { ProductStatus } from "../../shared/enums/product-status.enum";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

export interface CreateProductDto {
  sku: string;
  title: string;
  description?: string;

  brand?: string;
  category?: string;

  images?: string[];

  price: number;
  quantity: number;
  shippingCharge?: number;

  status?: ProductStatus;
  syncStatus?: SyncStatus;
}

export interface UpdateProductDto
  extends Partial<CreateProductDto> {}