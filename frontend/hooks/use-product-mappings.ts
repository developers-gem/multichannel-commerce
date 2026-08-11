import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProductMapping,
  deleteProductMapping,
  getProductMappings,
  unpublishProductMapping,
  updateProductMapping,
} from "@/services/product-mapping.service";
import {
  CreateProductMappingInput,
  UpdateProductMappingInput,
} from "@/types/product-mapping";

export function useProductMappings(productId?: string) {
  return useQuery({
    queryKey: productId ? ["product-mappings", productId] : ["product-mappings"],
    queryFn: () => getProductMappings(productId),
  });
}

export function useCreateProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductMappingInput) =>
      createProductMapping(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useUpdateProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProductMappingInput;
    }) => updateProductMapping(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useDeleteProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProductMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useUnpublishProductMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unpublishProductMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}
