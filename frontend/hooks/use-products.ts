import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProduct,
  deleteProduct,
  getProducts,
  publishProductToChannels,
  syncProductChannels,
  updateProduct,
} from "@/services/product.service";
import { CreateProductInput, UpdateProductInput } from "@/types/product";

export function useProducts(page: number = 1, limit: number = 20, search: string = "") {
  return useQuery({
    queryKey: ["products", page, limit, search],
    queryFn: () => getProducts(page, limit, search),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProductInput) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductInput }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function useSyncProductChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => syncProductChannels(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}

export function usePublishProductToChannels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, integrationIds }: { id: string; integrationIds: string[] }) =>
      publishProductToChannels(id, integrationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
    },
  });
}
