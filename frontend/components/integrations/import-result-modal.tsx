"use client";

import { CheckCircle2, AlertCircle, PackageCheck, Layers, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CatalogImportSummary } from "@/types/integration";

interface ImportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CatalogImportSummary | null;
}

export default function ImportResultModal({
  isOpen,
  onClose,
  summary,
}: ImportResultModalProps) {
  if (!isOpen || !summary) return null;

  const hasErrors = summary.failed > 0 || (summary.errors && summary.errors.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 ${hasErrors ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              {hasErrors ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Catalog Import Completed
              </h2>
              <p className="text-xs text-slate-500">
                {summary.platform} — {summary.storeName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6">
          <div className="rounded-xl border bg-slate-50 p-3.5 text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fetched</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalFetched}</p>
          </div>

          <div className="rounded-xl border bg-indigo-50/50 border-indigo-100 p-3.5 text-center">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Created</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{summary.masterProductsCreated}</p>
          </div>

          <div className="rounded-xl border bg-blue-50/50 border-blue-100 p-3.5 text-center">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Matched</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{summary.masterProductsMatched}</p>
          </div>

          <div className="rounded-xl border bg-emerald-50/50 border-emerald-100 p-3.5 text-center">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Mappings New</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{summary.mappingsCreated}</p>
          </div>

          <div className="rounded-xl border bg-purple-50/50 border-purple-100 p-3.5 text-center">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Mappings Updated</p>
            <p className="text-2xl font-black text-purple-700 mt-1">{summary.mappingsUpdated}</p>
          </div>

          <div className={`rounded-xl border p-3.5 text-center ${summary.failed > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-slate-50 text-slate-500"}`}>
            <p className="text-xs font-semibold uppercase tracking-wider">Failed</p>
            <p className={`text-2xl font-black mt-1 ${summary.failed > 0 ? "text-red-700" : "text-slate-900"}`}>{summary.failed}</p>
          </div>
        </div>

        {/* Detailed Errors List */}
        {summary.errors && summary.errors.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Skipped / Failed Item Errors ({summary.errors.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {summary.errors.map((err, idx) => (
                <div key={idx} className="rounded-lg bg-red-50 p-2.5 border border-red-100 text-xs flex flex-col gap-0.5">
                  <span className="font-mono font-bold text-red-900">
                    SKU: {err.sku || "N/A"}
                  </span>
                  <span className="text-red-700">{err.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-4 mt-6">
          <p className="text-xs text-slate-500">
            Master Catalog & Product Mappings updated automatically.
          </p>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
