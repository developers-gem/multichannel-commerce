"use client";

import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Integration } from "@/types/integration";
import { useDeleteIntegration } from "@/hooks/use-integrations";

interface IntegrationDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  integration: Integration | null;
}

export default function IntegrationDeleteDialog({
  isOpen,
  onClose,
  integration,
}: IntegrationDeleteDialogProps) {
  const deleteMutation = useDeleteIntegration();

  if (!isOpen || !integration) return null;

  const handleDelete = () => {
    deleteMutation.mutate(integration._id, {
      onSuccess: () => {
        toast.success(
          `Integration "${integration.storeName}" deleted successfully`
        );
        onClose();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to delete integration");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle className="h-6 w-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Disconnect Store Integration
            </h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete store integration{" "}
              <span className="font-semibold text-slate-800">
                "{integration.storeName}" ({integration.platform})
              </span>
              ? This action removes the store configuration.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>

          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
