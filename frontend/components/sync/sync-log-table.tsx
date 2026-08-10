"use client";

import { Eye, RotateCw, RefreshCw, AlertCircle, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  PopulatedIntegrationRef,
  PopulatedProductMappingRef,
  PopulatedProductRef,
  SyncLog,
} from "@/types/sync";
import { Button } from "@/components/ui/button";

interface SyncLogTableProps {
  logs: SyncLog[];
  isLoading: boolean;
  onViewDetails: (syncLog: SyncLog) => void;
  onRetry: (syncLog: SyncLog) => void;
  onSyncNow: (productMappingId: string) => void;
  isRetryingId?: string | null;
}

export default function SyncLogTable({
  logs,
  isLoading,
  onViewDetails,
  onRetry,
  onSyncNow,
  isRetryingId,
}: SyncLogTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex h-16 animate-pulse items-center gap-4 rounded-xl bg-slate-100 px-4"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center shadow-sm">
        <div className="rounded-full bg-slate-100 p-4 text-slate-400 mb-4">
          <FileText className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          No Sync Jobs Found
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          Product synchronization jobs will appear here when products are synced or updated across sales channels.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-[1200px] w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
          <tr>
            <th className="px-6 py-4">Master SKU</th>
            <th className="px-6 py-4">Product Title</th>
            <th className="px-6 py-4">Platform</th>
            <th className="px-6 py-4">Store Name</th>
            <th className="px-6 py-4">Ext Product ID</th>
            <th className="px-6 py-4">Action</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Attempts</th>
            <th className="px-6 py-4">Created At</th>
            <th className="px-6 py-4">Completed At</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {logs.map((log) => {
            const product =
              typeof log.productId === "object"
                ? (log.productId as PopulatedProductRef)
                : null;
            const integration =
              typeof log.integrationId === "object"
                ? (log.integrationId as PopulatedIntegrationRef)
                : null;
            const mapping =
              typeof log.productMappingId === "object"
                ? (log.productMappingId as PopulatedProductMappingRef)
                : null;

            const sku = product?.sku || "--";
            const title = product?.title || "--";
            const platform = integration?.platform || "--";
            const storeName = integration?.storeName || "--";
            const externalProductId = mapping?.externalProductId || "--";

            const createdAtText = log.createdAt
              ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })
              : "--";

            const completedAtText = log.completedAt
              ? formatDistanceToNow(new Date(log.completedAt), { addSuffix: true })
              : "—";

            const mappingIdStr =
              typeof log.productMappingId === "object"
                ? log.productMappingId._id
                : log.productMappingId;

            return (
              <tr
                key={log._id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* SKU */}
                <td className="px-6 py-4 font-mono font-bold text-slate-900">
                  {sku}
                </td>

                {/* Product Title */}
                <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">
                  {title}
                </td>

                {/* Platform */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                    {platform}
                  </span>
                </td>

                {/* Store Name */}
                <td className="px-6 py-4 font-medium text-slate-700">
                  {storeName}
                </td>

                {/* Ext Product ID */}
                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                  {externalProductId}
                </td>

                {/* Action Badge */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${
                      log.action === "CREATE"
                        ? "bg-emerald-100 text-emerald-800"
                        : log.action === "DELETE"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {log.action}
                  </span>
                </td>

                {/* Status Badge */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                      log.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : log.status === "FAILED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : log.status === "PROCESSING"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {log.status}
                  </span>
                </td>

                {/* Attempts */}
                <td className="px-6 py-4 text-xs font-mono font-semibold text-slate-700">
                  {log.attempts} / {log.maxAttempts}
                </td>

                {/* Created At */}
                <td className="px-6 py-4 text-xs text-slate-500">
                  {createdAtText}
                </td>

                {/* Completed At */}
                <td className="px-6 py-4 text-xs text-slate-500">
                  {completedAtText}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Details Eye Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewDetails(log)}
                      title="View Details"
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Retry Button if FAILED */}
                    {log.status === "FAILED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRetryingId === log._id}
                        onClick={() => onRetry(log)}
                        title="Retry Failed Sync Job"
                        className="h-8 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <RotateCw
                          className={`mr-1 h-3.5 w-3.5 ${
                            isRetryingId === log._id ? "animate-spin" : ""
                          }`}
                        />
                        Retry
                      </Button>
                    )}

                    {/* Sync Now Button */}
                    {mappingIdStr && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSyncNow(mappingIdStr)}
                        title="Sync Now"
                        className="h-8 w-8 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
