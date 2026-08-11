"use client";

import { useState } from "react";
import {
  X,
  RefreshCw,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Loader2,
  Send,
  Trash2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Product } from "@/types/product";
import { useProductMappings, useUnpublishProductMapping } from "@/hooks/use-product-mappings";
import { useSyncLogs, useTriggerSync, useRetrySync } from "@/hooks/use-sync";
import { useSyncProductChannels } from "@/hooks/use-products";

interface ProductSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onPublishToChannels?: (product: Product) => void;
}

export default function ProductSyncModal({
  isOpen,
  onClose,
  product,
  onPublishToChannels,
}: ProductSyncModalProps) {
  if (!isOpen || !product) return null;

  const { data: mappingsData, isLoading: isLoadingMappings } = useProductMappings(product._id);
  const { data: logsData, isLoading: isLoadingLogs } = useSyncLogs({
    productId: product._id,
  });

  const syncProductMutation = useSyncProductChannels();
  const manualSyncMutation = useTriggerSync();
  const retryMutation = useRetrySync();
  const unpublishMutation = useUnpublishProductMapping();

  const [activeSyncingMappingId, setActiveSyncingMappingId] = useState<string | null>(null);
  const [activeUnpublishingMappingId, setActiveUnpublishingMappingId] = useState<string | null>(null);

  const mappings = mappingsData?.data || [];
  const logs = logsData?.data?.logs || [];

  const handleSyncAll = () => {
    syncProductMutation.mutate(product._id, {
      onSuccess: (res) => {
        toast.success(res.message || "Sync jobs enqueued for all active channel mappings");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to enqueue sync jobs");
      },
    });
  };

  const handleSyncNow = (mappingId: string) => {
    setActiveSyncingMappingId(mappingId);
    manualSyncMutation.mutate(
      { productMappingId: mappingId, action: "UPDATE" },
      {
        onSuccess: () => {
          toast.success("Synchronization job enqueued for this channel mapping");
          setActiveSyncingMappingId(null);
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to trigger sync job");
          setActiveSyncingMappingId(null);
        },
      }
    );
  };

  const handleRetry = (logId: string) => {
    retryMutation.mutate(logId, {
      onSuccess: () => {
        toast.success("Retry job enqueued successfully");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to retry sync job");
      },
    });
  };

  const handleUnpublish = (mappingId: string, storeName: string) => {
    setActiveUnpublishingMappingId(mappingId);
    toast.info(`Enqueuing unpublish job for ${storeName}...`);

    unpublishMutation.mutate(mappingId, {
      onSuccess: (res) => {
        toast.success(res.message || `Unpublish job enqueued for ${storeName}`);
        setActiveUnpublishingMappingId(null);
      },
      onError: (err: Error) => {
        toast.error(err.message || `Failed to unpublish from ${storeName}`);
        setActiveUnpublishingMappingId(null);
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5">
                SKU: {product.sku}
              </span>
              <span className="text-xs text-slate-400">(Immutable Master Identity)</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{product.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Master Catalog Stats Bar */}
        <div className="my-4 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4 text-center text-sm border">
          <div>
            <span className="text-xs text-slate-500 block uppercase font-medium">Price</span>
            <span className="font-bold text-slate-900">${product.price.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase font-medium">Stock</span>
            <span className="font-bold text-slate-900">{product.quantity} units</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase font-medium">Shipping</span>
            <span className="font-bold text-slate-900">${(product.shippingCharge || 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase font-medium">Channels</span>
            <span className="font-bold text-indigo-700">{mappings.length} Mapped</span>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 my-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-600" />
            Connected Channel Mappings
          </h3>

          <div className="flex items-center gap-2">
            {onPublishToChannels && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onPublishToChannels(product)}
                className="text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Send className="h-3.5 w-3.5" />
                Publish / Manage Channels
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSyncAll}
              disabled={syncProductMutation.isPending || mappings.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2 shadow-sm text-xs"
            >
              {syncProductMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sync All Channels
            </Button>
          </div>
        </div>

        {/* Channel Mappings List */}
        {isLoadingMappings || isLoadingLogs ? (
          <div className="space-y-3 py-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : mappings.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center bg-slate-50/50">
            <Layers className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Sales Channels Mapped Yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              This product is not currently connected to any active marketplace integrations. Click "Publish / Manage Channels" above to list it on your store accounts.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {mappings.map((mapping: any) => {
              const integration = mapping.integrationId;
              const platform = integration?.platform || "CHANNEL";
              const storeName = integration?.storeName || "Store";

              const isSyncingThis = activeSyncingMappingId === mapping._id;
              const isUnpublishingThis = activeUnpublishingMappingId === mapping._id;

              const isUnpublished = mapping.syncStatus === "UNPUBLISHED" || !mapping.isActive;

              const lastFailedLog = logs.find(
                (l: any) => l.productMappingId === mapping._id && l.status === "FAILED"
              );

              return (
                <div
                  key={mapping._id}
                  className={`rounded-xl border p-4 transition-all space-y-3 ${
                    isUnpublished
                      ? "bg-slate-50/70 border-slate-200 opacity-80"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {/* Platform Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            platform === "SHOPIFY"
                              ? "bg-emerald-100 text-emerald-800"
                              : platform === "EBAY"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {platform === "SHOPIFY"
                            ? "Shopify"
                            : platform === "EBAY"
                            ? "eBay"
                            : "Custom Website"}{" "}
                          — {storeName}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isUnpublished
                              ? "bg-slate-100 text-slate-600 border border-slate-300"
                              : mapping.syncStatus === "SYNCED"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : mapping.syncStatus === "FAILED"
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isUnpublished ? (
                            <Ban className="h-3 w-3 text-slate-500" />
                          ) : mapping.syncStatus === "SYNCED" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : mapping.syncStatus === "FAILED" ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {isUnpublished ? "NOT PUBLISHED" : mapping.syncStatus}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1 font-mono">
                        <span>Ext ID: {mapping.externalProductId || "(Not Listed)"}</span>
                        {mapping.externalVariantId && (
                          <span>Variant GID: {mapping.externalVariantId}</span>
                        )}
                        {mapping.lastSyncedAt && (
                          <span className="text-slate-400 font-sans">
                            Last Sync: {new Date(mapping.lastSyncedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Channel Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isUnpublished ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPublishToChannels && onPublishToChannels(product)}
                          className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Publish Again
                        </Button>
                      ) : (
                        <>
                          {mapping.syncStatus === "FAILED" && lastFailedLog && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(lastFailedLog._id)}
                              disabled={retryMutation.isPending}
                              className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <RotateCw className="h-3.5 w-3.5 mr-1" />
                              Retry
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncNow(mapping._id)}
                            disabled={isSyncingThis || manualSyncMutation.isPending}
                            className="h-8 text-xs hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                          >
                            {isSyncingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Sync Now
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnpublish(mapping._id, storeName)}
                            disabled={isUnpublishingThis || unpublishMutation.isPending}
                            className="h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                          >
                            {isUnpublishingThis ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                            )}
                            Unpublish
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Error Alert Box if Failed */}
                  {mapping.lastSyncError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      <div>
                        <span className="font-semibold block">Last Sync Failure Error:</span>
                        <span>{mapping.lastSyncError}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex justify-end border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
