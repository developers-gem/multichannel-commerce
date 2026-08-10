import { ApiResponse } from "./common";

export type ProductStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface Product {
  _id: string;
  sku: string;
  title: string;
  description: string;
  brand: string;
  category: string;
  images: string[];
  price: number;
  quantity: number;
  shippingCharge: number;
  status: ProductStatus;
  syncStatus: SyncStatus;
  mappingCount?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProductsData {
  products: Product[];
  pagination: ProductsPagination;
}

export type ProductsResponse = ApiResponse<PaginatedProductsData>;
export type SingleProductResponse = ApiResponse<Product>;

export interface CreateProductInput {
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
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  brand?: string;
  category?: string;
  images?: string[];
  price?: number;
  quantity?: number;
  shippingCharge?: number;
  status?: ProductStatus;
}
