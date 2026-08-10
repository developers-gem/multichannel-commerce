import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSyncLogById,
  getSyncLogs,
  retrySync,
  triggerProductMappingSync,
} from "@/services/sync.service";
import { SyncAction, SyncLogFilters } from "@/types/sync";

export function useSyncLogs(filters: SyncLogFilters = {}) {
  return useQuery({
    queryKey: ["sync-logs", filters],
    queryFn: () => getSyncLogs(filters),
    refetchInterval: 5000, // Poll every 5 seconds to reflect background worker updates
  });
}

export function useSyncLog(id: string) {
  return useQuery({
    queryKey: ["sync-log", id],
    queryFn: () => getSyncLogById(id),
    enabled: Boolean(id),
  });
}

export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productMappingId,
      action,
    }: {
      productMappingId: string;
      action?: SyncAction;
    }) => triggerProductMappingSync(productMappingId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
    },
  });
}

export function useRetrySync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (syncLogId: string) => retrySync(syncLogId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["product-mappings"] });
    },
  });
}
