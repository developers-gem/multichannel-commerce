import {
  DashboardSummaryResponse,
  SingleSyncLogResponse,
  SyncAction,
  SyncEnqueueResponse,
  SyncLogFilters,
  SyncLogsResponse,
} from "@/types/sync";
import { getAuthHeaders, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const response = await fetch(`${API_URL}/api/sync/dashboard-summary`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch sync dashboard summary");
  }

  return data;
}

export async function getSyncLogs(
  filters: SyncLogFilters = {}
): Promise<SyncLogsResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.status) params.append("status", filters.status);
  if (filters.action) params.append("action", filters.action);
  if (filters.platform) params.append("platform", filters.platform);
  if (filters.integrationId) params.append("integrationId", filters.integrationId);
  if (filters.productMappingId) params.append("productMappingId", filters.productMappingId);
  if (filters.productId) params.append("productId", filters.productId);

  const queryString = params.toString();
  const url = `${API_URL}/api/sync${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch sync logs");
  }

  return data;
}

export async function getSyncLogById(
  id: string
): Promise<SingleSyncLogResponse> {
  const response = await fetch(`${API_URL}/api/sync/${id}`, {
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch sync log details");
  }

  return data;
}

export async function triggerProductMappingSync(
  productMappingId: string,
  action: SyncAction = "UPDATE"
): Promise<SyncEnqueueResponse> {
  const response = await fetch(
    `${API_URL}/api/sync/products/${productMappingId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action }),
    }
  );

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to enqueue sync job");
  }

  return data;
}

export async function retrySync(
  syncLogId: string
): Promise<SyncEnqueueResponse> {
  const response = await fetch(`${API_URL}/api/sync/${syncLogId}/retry`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to retry sync job");
  }

  return data;
}
