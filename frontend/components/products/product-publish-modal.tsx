"use client";

import { useEffect, useState } from "react";
import { X, Send, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { useIntegrations } from "@/hooks/use-integrations";
import { useProductMappings } from "@/hooks/use-product-mappings";
import { usePublishProductToChannels } from "@/hooks/use-products";
import { Integration } from "@/types/integration";

interface ChannelPublishValues {
  selected: boolean;
  price: string;
  quantity: string;
}

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
  const [channelValues, setChannelValues] = useState<Record<string, ChannelPublishValues>>({});

  const integrations = (integrationsData?.data || []).filter(
    (integration) => integration.isActive && (integration.platform === "SHOPIFY" || integration.platform === "EBAY")
  );
  const mappings = mappingsData?.data || [];
  const existingIntegrationIds = new Set(
    mappings.map((mapping) => typeof mapping.integrationId === "object" ? mapping.integrationId._id : mapping.integrationId)
  );

  useEffect(() => {
    if (isOpen && product && !isLoadingIntegrations && !isLoadingMappings) {
      setChannelValues(Object.fromEntries(integrations.map((integration) => [integration._id, {
        selected: false,
        price: String(product.price ?? 0),
        quantity: String(product.quantity ?? 0),
      }])));
    }
  }, [isOpen, product?._id, isLoadingIntegrations, isLoadingMappings]);

  if (!isOpen || !product) return null;

  const updateChannel = (integrationId: string, patch: Partial<ChannelPublishValues>) => {
    setChannelValues((current) => ({
      ...current,
      [integrationId]: { ...current[integrationId], ...patch },
    }));
  };

  const handlePublish = () => {
    const selectedIntegrations = integrations.filter(
      (integration) => channelValues[integration._id]?.selected && !existingIntegrationIds.has(integration._id)
    );
    if (selectedIntegrations.length === 0) {
      toast.error("Select at least one channel that is not already mapped.");
      return;
    }

    const invalidIntegration = selectedIntegrations.find((integration) => {
      const values = channelValues[integration._id];
      const price = Number(values.price);
      const quantity = Number(values.quantity);
      return !Number.isFinite(price) || price < 0 || !Number.isFinite(quantity) || quantity < 0;
    });
    if (invalidIntegration) {
      toast.error(`Enter a valid price and quantity for ${invalidIntegration.storeName}.`);
      return;
    }

    const channels = selectedIntegrations.map((integration) => {
      const values = channelValues[integration._id];
      return {
        integrationId: integration._id,
        channelPrice: Number(values.price),
        channelQuantity: Number(values.quantity),
        channelCurrency: product.currency || "USD",
      };
    });

    publishMutation.mutate(
      { id: product._id, channels },
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
            <p className="text-xs font-semibold uppercase text-slate-500">Master Product</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{product.title}</h2>
            <p className="font-mono text-sm text-slate-500">SKU: {product.sku}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Set an independent price and quantity for each channel. Publishing creates channel mappings for this Master Product.
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
                Connect an active Shopify or eBay account on the Integrations page first.
              </p>
            </div>
          ) : (
            integrations.map((item: Integration) => {
              const values = channelValues[item._id] || { selected: false, price: "", quantity: "" };
              const isAlreadyMapped = existingIntegrationIds.has(item._id);

              return (
                <div
                  key={item._id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    values.selected ? "border-indigo-600 bg-indigo-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <label className={`flex items-center gap-3 ${isAlreadyMapped ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                      type="checkbox"
                      checked={values.selected}
                      disabled={isAlreadyMapped || publishMutation.isPending}
                      onChange={(event) => updateChannel(item._id, { selected: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{item.platform} — {item.storeName}</div>
                      <div className="truncate text-xs text-slate-500">{item.storeUrl}</div>
                    </div>
                  </label>
                  {isAlreadyMapped && (
                    <span className="mt-2 inline-block text-xs font-medium text-slate-500">
                      Already mapped. Manage its channel values from the product detail page.
                    </span>
                  )}
                  {values.selected && !isAlreadyMapped && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor={`price-${item._id}`} className="mb-1 block text-xs font-medium text-slate-600">Channel Price</label>
                        <input
                          id={`price-${item._id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={values.price}
                          onChange={(event) => updateChannel(item._id, { price: event.target.value })}
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor={`quantity-${item._id}`} className="mb-1 block text-xs font-medium text-slate-600">Channel Quantity</label>
                        <input
                          id={`quantity-${item._id}`}
                          type="number"
                          min="0"
                          step="1"
                          value={values.quantity}
                          onChange={(event) => updateChannel(item._id, { quantity: event.target.value })}
                          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
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
            disabled={publishMutation.isPending || !integrations.some((integration) => channelValues[integration._id]?.selected && !existingIntegrationIds.has(integration._id))}
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
