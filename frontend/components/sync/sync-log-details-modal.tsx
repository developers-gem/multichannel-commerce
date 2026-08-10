"use client";

import { X, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  PopulatedIntegrationRef,
  PopulatedProductMappingRef,
  PopulatedProductRef,
  SyncLog,
} from "@/types/sync";
import { Button } from "@/components/ui/button";

interface SyncLogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncLog: SyncLog | null;
}

export default function SyncLogDetailsModal({
  isOpen,
  onClose,
  syncLog,
}: SyncLogDetailsModalProps) {
  if (!isOpen || !syncLog) return null;

  const product =
    typeof syncLog.productId === "object"
      ? (syncLog.productId as PopulatedProductRef)
      : null;
  const integration =
    typeof syncLog.integrationId === "object"
      ? (syncLog.integrationId as PopulatedIntegrationRef)
      : null;
  const mapping =
    typeof syncLog.productMappingId === "object"
      ? (syncLog.productMappingId as PopulatedProductMappingRef)
      : null;

  const formatDateText = (dateString?: string) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm:ss");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Sync Log Details
            </h2>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                syncLog.status === "COMPLETED"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : syncLog.status === "FAILED"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : syncLog.status === "PROCESSING"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {syncLog.status}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert Banner if FAILED */}
        {syncLog.status === "FAILED" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm space-y-1">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Sync Execution Error:
            </div>
            <p className="font-mono text-xs text-red-700 break-words">
              {syncLog.error || "Unknown execution error"}
            </p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          {/* Master Product Section */}
          <div className="rounded-xl border bg-slate-50/50 p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Master Product
            </h4>
            <div>
              <span className="text-slate-500 text-xs block">SKU</span>
              <span className="font-mono font-bold text-slate-900">
                {product?.sku || String(syncLog.productId)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">Title</span>
              <span className="font-semibold text-slate-800">
                {product?.title || "—"}
              </span>
            </div>
          </div>

          {/* Integration Channel Section */}
          <div className="rounded-xl border bg-slate-50/50 p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Sales Channel / Store
            </h4>
            <div>
              <span className="text-slate-500 text-xs block">Platform</span>
              <span className="inline-flex items-center rounded bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                {integration?.platform || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">Store Name</span>
              <span className="font-semibold text-slate-800">
                {integration?.storeName || "—"}
              </span>
            </div>
          </div>

          {/* Product Mapping Section */}
          <div className="rounded-xl border bg-slate-50/50 p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Product Mapping Identifiers
            </h4>
            <div>
              <span className="text-slate-500 text-xs block">External Product ID</span>
              <span className="font-mono text-xs font-semibold text-slate-800">
                {mapping?.externalProductId || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">External Variant ID</span>
              <span className="font-mono text-xs text-slate-600">
                {mapping?.externalVariantId || "—"}
              </span>
            </div>
          </div>

          {/* Sync Execution Metrics */}
          <div className="rounded-xl border bg-slate-50/50 p-4 space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Job Execution Metrics
            </h4>
            <div>
              <span className="text-slate-500 text-xs block">Action</span>
              <span className="font-bold text-indigo-600">{syncLog.action}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">Attempts</span>
              <span className="font-bold text-slate-800">
                {syncLog.attempts} / {syncLog.maxAttempts}
              </span>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
          <div>
            <span className="block font-semibold text-slate-700">Created At</span>
            {formatDateText(syncLog.createdAt)}
          </div>
          <div>
            <span className="block font-semibold text-slate-700">Started At</span>
            {formatDateText(syncLog.startedAt)}
          </div>
          <div>
            <span className="block font-semibold text-slate-700">Completed At</span>
            {formatDateText(syncLog.completedAt)}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
