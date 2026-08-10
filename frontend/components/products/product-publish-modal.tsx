"use client";

import { useEffect, useState } from "react";
import { X, Send, Layers, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { useIntegrations } from "@/hooks/use-integrations";
import { useProductMappings } from "@/hooks/use-product-mappings";
import { usePublishProductToChannels } from "@/hooks/use-products";

interface ProductPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductPublishModal({
  isOpen,
  onClose,
  product,
}: ProductPublishModalProps) {
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useIntegrations();
  const { data: mappingsData, isLoading: isLoadingMappings } = useProductMappings(product?._id);

  const publishMutation = usePublishProductToChannels();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const integrations = (integrationsData?.data || []).filter((i: any) => i.isActive);
  const mappings = mappingsData?.data || [];

  const existingIntegrationIds = new Set(mappings.map((m: any) => m.integrationId?._id || m.integrationId));

  useEffect(() => {
    if (isOpen && integrations.length > 0) {
      // Pre-check all active integrations or existing mappings
      const initialSelected = integrations.map((i: any) => i._id);
      setSelectedIds(initialSelected);
    }
  }, [isOpen, integrationsData]);

  if (!isOpen || !product) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePublish = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one sales channel integration to publish.");
      return;
    }

    publishMutation.mutate(
      { id: product._id, integrationIds: selectedIds },
      {
        onSuccess: (res) => {
          toast.success(res.message || "Publishing jobs enqueued for selected sales channels");
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to publish product to selected channels");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5">
                SKU: {product.sku}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Publish to Channels</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Select connected sales channel accounts to publish or update this Master Product listing.
        </p>

        {/* Integration Selection Checklist */}
        <div className="mt-4 space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
          {isLoadingIntegrations || isLoadingMappings ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center bg-slate-50">
              <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Active Integrations Available</p>
              <p className="text-xs text-slate-500 mt-1">
                Please connect an active Shopify, eBay, or Custom Website channel on the Integrations page first.
              </p>
            </div>
          ) : (
            integrations.map((item: any) => {
              const isChecked = selectedIds.includes(item._id);
              const isAlreadyMapped = existingIntegrationIds.has(item._id);

              return (
                <label
                  key={item._id}
                  onClick={() => toggleSelect(item._id)}
                  className={`flex items-center justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                    isChecked
                      ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{item.storeName}</div>
                      <div className="text-xs text-slate-500 font-mono">{item.platform} • {item.storeUrl}</div>
                    </div>
                  </div>

                  {isAlreadyMapped && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-2 py-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Mapped
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            onClick={handlePublish}
            disabled={publishMutation.isPending || integrations.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publish to Selected Channels
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
