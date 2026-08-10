import { CatalogImportResponse } from "@/types/integration";
import { getAuthHeaders, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function importChannelCatalog(
  integrationId: string
): Promise<CatalogImportResponse> {
  const response = await fetch(
    `${API_URL}/api/catalog-import/${integrationId}`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to import channel catalog");
  }

  return data;
}
