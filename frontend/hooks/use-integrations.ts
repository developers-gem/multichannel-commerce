import { useQuery } from "@tanstack/react-query";
import { getIntegrations } from "@/services/integration.service";

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
  });
}