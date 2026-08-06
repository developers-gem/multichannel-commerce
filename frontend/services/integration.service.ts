import { IntegrationResponse } from "@/types/integration";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function getIntegrations(): Promise<IntegrationResponse> {
  const response = await fetch(`${API_URL}/api/integrations`);

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch integrations");
  }

  return data;
}