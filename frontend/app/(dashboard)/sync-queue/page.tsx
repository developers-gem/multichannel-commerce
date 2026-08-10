"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SyncAction, SyncLog, SyncStatus } from "@/types/sync";
import {
  useRetrySync,
  useSyncLogs,
  useTriggerSync,
} from "@/hooks/use-sync";
import SyncSummaryCards from "@/components/sync/sync-summary-cards";
import SyncLogTable from "@/components/sync/sync-log-table";
import SyncLogDetailsModal from "@/components/sync/sync-log-details-modal";
import { Button } from "@/components/ui/button";

export default function SyncQueuePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SyncStatus | "ALL">("ALL");
  const [actionFilter, setActionFilter] = useState<SyncAction | "ALL">("ALL");

  const [selectedSyncLog, setSelectedSyncLog] = useState<SyncLog | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const filters = {
    page,
    limit: 20,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(actionFilter !== "ALL" ? { action: actionFilter } : {}),
  };

  const { data, isLoading, isError, error } = useSyncLogs(filters);

  const triggerSyncMutation = useTriggerSync();
  const retryMutation = useRetrySync();

  const handleOpenDetails = (log: SyncLog) => {
    setSelectedSyncLog(log);
    setIsDetailsModalOpen(true);
  };

  const handleSyncNow = (productMappingId: string) => {
    triggerSyncMutation.mutate(
      { productMappingId, action: "UPDATE" },
      {
        onSuccess: () => {
          toast.success("Sync job enqueued successfully");
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to enqueue sync job");
        },
      }
    );
  };

  const handleRetry = (log: SyncLog) => {
    retryMutation.mutate(log._id, {
      onSuccess: () => {
        toast.success("Retry job enqueued successfully");
      },
      onError: (err: Error) => {
        toast.error(err.message || "Failed to retry sync job");
      },
    });
  };

  const logs = data?.data?.logs || [];
  const pagination = data?.data?.pagination;
  const totalRows = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sync Queue</h1>
        <p className="mt-1 text-slate-500">
          Monitor product synchronization across connected sales channels
        </p>
      </div>

      {/* Summary Metrics Cards */}
      <SyncSummaryCards logs={logs} totalFromPagination={totalRows} />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as SyncStatus | "ALL");
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as SyncAction | "ALL");
                setPage(1);
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Failed to load sync queue logs:{" "}
          {(error as Error)?.message || "Unknown error"}
        </div>
      )}

      {/* Sync Log Table */}
      <SyncLogTable
        logs={logs}
        isLoading={isLoading}
        onViewDetails={handleOpenDetails}
        onRetry={handleRetry}
        onSyncNow={handleSyncNow}
        isRetryingId={retryMutation.isPending ? (retryMutation.variables as string) : null}
      />

      {/* Pagination Controls */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-white px-4 py-3 rounded-2xl shadow-sm">
          <p className="text-xs text-slate-500 font-medium">
            Page <span className="font-bold text-slate-900">{page}</span> of{" "}
            <span className="font-bold text-slate-900">{totalPages}</span> ({totalRows} total jobs)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              className="h-8 text-xs font-medium"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              className="h-8 text-xs font-medium"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <SyncLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        syncLog={selectedSyncLog}
      />
    </div>
  );
}
