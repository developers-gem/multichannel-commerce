import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importChannelCatalog } from "@/services/catalog-import.service";
import { CatalogImportResponse } from "@/types/integration";

export function useCatalogImport() {
  const queryClient = useQueryClient();

  return useMutation<CatalogImportResponse, Error, string>({
    mutationFn: (integrationId: string) => importChannelCatalog(integrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}
