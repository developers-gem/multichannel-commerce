"use client";

import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductMapping } from "@/types/product-mapping";
import { useDeleteProductMapping } from "@/hooks/use-product-mappings";

interface ProductMappingDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ProductMapping | null;
}

export default function ProductMappingDeleteDialog({
  isOpen,
  onClose,
  mapping,
}: ProductMappingDeleteDialogProps) {
  const deleteMutation = useDeleteProductMapping();

  if (!isOpen || !mapping) return null;

  const storeName =
    typeof mapping.integrationId === "object"
      ? mapping.integrationId.storeName
      : "channel store";

  const handleDelete = () => {
    deleteMutation.mutate(mapping._id, {
      onSuccess: () => {
        toast.success(
          `Mapping for SKU "${mapping.sku}" deleted successfully`
        );
        onClose();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to delete product mapping");
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
              Delete Product Mapping
            </h3>
            <p className="text-sm text-slate-500">
              Are you sure you want to delete mapping for SKU{" "}
              <span className="font-semibold text-slate-800">
                "{mapping.sku}"
              </span>{" "}
              on <span className="font-semibold text-slate-800">{storeName}</span>?
              This action soft-deletes the mapping.
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
