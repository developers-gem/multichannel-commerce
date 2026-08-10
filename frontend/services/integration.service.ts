import {
  CreateIntegrationInput,
  IntegrationResponse,
  SingleIntegrationResponse,
  UpdateIntegrationInput,
} from "@/types/integration";
import { ApiResponse } from "@/types/common";
import { getAuthHeaders, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getIntegrations(): Promise<IntegrationResponse> {
  const response = await fetch(`${API_URL}/api/integrations`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch integrations");
  }

  return data;
}

export async function getIntegrationById(
  id: string
): Promise<SingleIntegrationResponse> {
  const response = await fetch(`${API_URL}/api/integrations/${id}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch integration details");
  }

  return data;
}

export async function createIntegration(
  payload: CreateIntegrationInput
): Promise<SingleIntegrationResponse> {
  const response = await fetch(`${API_URL}/api/integrations`, {
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
    throw new Error(data.message || "Failed to create integration");
  }

  return data;
}

export async function updateIntegration(
  id: string,
  payload: UpdateIntegrationInput
): Promise<SingleIntegrationResponse> {
  const response = await fetch(`${API_URL}/api/integrations/${id}`, {
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
    throw new Error(data.message || "Failed to update integration");
  }

  return data;
}

export async function deleteIntegration(
  id: string
): Promise<ApiResponse<void>> {
  const response = await fetch(`${API_URL}/api/integrations/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete integration");
  }

  return data;
}

export async function testIntegrationConnection(
  id: string
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${API_URL}/api/integrations/${id}/test-connection`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || "Connection test failed",
      data: { success: false, message: data.message || "Connection test failed" },
    };
  }

  return data;
}