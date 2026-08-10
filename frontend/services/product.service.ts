import {
  CreateProductInput,
  ProductsResponse,
  SingleProductResponse,
  UpdateProductInput,
} from "@/types/product";
import { ApiResponse } from "@/types/common";
import { getAuthHeaders, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getProducts(
  page: number = 1,
  limit: number = 20,
  search: string = ""
): Promise<ProductsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search ? { search } : {}),
  });

  const response = await fetch(`${API_URL}/api/products?${params.toString()}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch products");
  }

  return data;
}

export async function getProductById(id: string): Promise<SingleProductResponse> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch product details");
  }

  return data;
}

export async function createProduct(
  payload: CreateProductInput
): Promise<SingleProductResponse> {
  const response = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to create product");
  }

  return data;
}

export async function updateProduct(
  id: string,
  payload: UpdateProductInput
): Promise<SingleProductResponse> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to update product");
  }

  return data;
}

export async function deleteProduct(id: string): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/api/products/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete product");
  }

  return data;
}

export async function syncProductChannels(id: string): Promise<ApiResponse<{ enqueuedCount: number }>> {
  const response = await fetch(`${API_URL}/api/products/${id}/sync`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to trigger product channel synchronization");
  }

  return data;
}

export async function publishProductToChannels(
  id: string,
  integrationIds: string[]
): Promise<ApiResponse<{ enqueuedCount: number }>> {
  const response = await fetch(`${API_URL}/api/products/${id}/publish`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ integrationIds }),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to publish product to channels");
  }

  return data;
}
