import {
  CreateProductMappingInput,
  ProductMapping,
  ProductMappingsListResponse,
  SingleProductMappingResponse,
  UpdateProductMappingInput,
} from "@/types/product-mapping";
import { ApiResponse } from "@/types/common";
import { getAuthHeaders, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getProductMappings(productId?: string): Promise<ProductMappingsListResponse> {
  const url = productId
    ? `${API_URL}/api/product-mappings?productId=${encodeURIComponent(productId)}`
    : `${API_URL}/api/product-mappings`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch product mappings");
  }

  return data;
}

export async function getProductMappingById(
  id: string
): Promise<SingleProductMappingResponse> {
  const response = await fetch(`${API_URL}/api/product-mappings/${id}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch product mapping details");
  }

  return data;
}

export async function createProductMapping(
  payload: CreateProductMappingInput
): Promise<SingleProductMappingResponse> {
  const response = await fetch(`${API_URL}/api/product-mappings`, {
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
    throw new Error(data.message || "Failed to create product mapping");
  }

  return data;
}

export async function updateProductMapping(
  id: string,
  payload: UpdateProductMappingInput
): Promise<SingleProductMappingResponse> {
  const response = await fetch(`${API_URL}/api/product-mappings/${id}`, {
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
    throw new Error(data.message || "Failed to update product mapping");
  }

  return data;
}

export async function deleteProductMapping(
  id: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/api/product-mappings/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete product mapping");
  }

  return data;
}

export async function unpublishProductMapping(
  id: string
): Promise<ApiResponse<{ jobId: string }>> {
  const response = await fetch(`${API_URL}/api/product-mappings/${id}/unpublish`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to unpublish channel mapping");
  }

  return data;
}
