import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createIntegration,
  deleteIntegration,
  getIntegrations,
  testIntegrationConnection,
  updateIntegration,
} from "@/services/integration.service";
import {
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from "@/types/integration";

export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: getIntegrations,
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateIntegrationInput) =>
      createIntegration(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateIntegrationInput;
    }) => updateIntegration(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

export function useTestIntegrationConnection() {
  return useMutation({
    mutationFn: (id: string) => testIntegrationConnection(id),
  });
}