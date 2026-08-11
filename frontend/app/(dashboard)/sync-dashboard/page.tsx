"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Layers,
  RefreshCw,
  RotateCw,
  ShieldCheck,
  Store,
  XCircle,
} from "lucide-react";

import { useSyncDashboardSummary, useSyncLogs, useRetrySync } from "@/hooks/use-sync";
import { useTestIntegrationConnection } from "@/hooks/use-integrations";
import ProductSyncModal from "@/components/products/product-sync-modal";
import { SyncAction, SyncLog, SyncStatus } from "@/types/sync";
import { Product } from "@/types/product";

export default function SyncDashboardPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: summaryRes, isLoading: summaryLoading, refetch: refetchSummary } = useSyncDashboardSummary();
  const summary = summaryRes?.data;

  const filters = {
    page,
    limit: 15,
    status: statusFilter !== "ALL" ? (statusFilter as SyncStatus) : undefined,
    action: actionFilter !== "ALL" ? (actionFilter as SyncAction) : undefined,
    platform: platformFilter !== "ALL" ? platformFilter : undefined,
  };

  const { data: logsRes, isLoading: logsLoading, refetch: refetchLogs } = useSyncLogs(filters);
  const logsData = logsRes?.data;

  const { data: failedLogsRes } = useSyncLogs({ status: "FAILED", limit: 10 });
  const failedLogs = failedLogsRes?.data?.logs || [];

  const retryMutation = useRetrySync();
  const testConnMutation = useTestIntegrationConnection();

  const handleManualRefresh = () => {
    refetchSummary();
    refetchLogs();
  };

  const handleRetry = (logId: string) => {
    retryMutation.mutate(logId);
  };

  const handleTestConnection = async (integrationId: string) => {
    setTestingId(integrationId);
    try {
      await testConnMutation.mutateAsync(integrationId);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Activity className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Sync Operations Dashboard</h1>
              <p className="text-sm text-slate-800">
                Real-time operational monitoring & channel synchronization engine
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Polling (5s)
          </span>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-sm font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">Master Products</span>
            <Layers className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-100">
              {summaryLoading ? "..." : summary?.summaryMetrics.totalMasterProducts ?? 0}
            </span>
            <span className="text-xs text-slate-800">Single Source of Truth</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">Connected Channels</span>
            <Store className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-100">
              {summaryLoading ? "..." : summary?.summaryMetrics.totalConnectedIntegrations ?? 0}
            </span>
            <span className="text-xs text-cyan-400">Shopify / eBay / Custom</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">Published Listings</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-400">
              {summaryLoading ? "..." : summary?.summaryMetrics.totalPublishedListings ?? 0}
            </span>
            <span className="text-xs text-slate-800">
              Unpublished: {summary?.summaryMetrics.unpublishedMappings ?? 0}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">Overall Success Rate</span>
            <ShieldCheck className="h-5 w-5 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-purple-400">
              {summaryLoading ? "..." : `${summary?.summaryMetrics.syncSuccessRate ?? 0}%`}
            </span>
            <span className="text-xs text-slate-800">Historical Jobs</span>
          </div>
        </div>
      </div>

      {/* Sync Job Status Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Pending Jobs</span>
          </div>
          <span className="text-lg font-bold text-amber-400">
            {summaryLoading ? "..." : summary?.summaryMetrics.pendingSyncJobs ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RotateCw className="h-4 w-4 text-blue-400 animate-spin" />
            <span className="text-sm font-medium text-blue-300">Processing Jobs</span>
          </div>
          <span className="text-lg font-bold text-blue-400">
            {summaryLoading ? "..." : summary?.summaryMetrics.processingSyncJobs ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Completed Jobs</span>
          </div>
          <span className="text-lg font-bold text-emerald-400">
            {summaryLoading ? "..." : summary?.summaryMetrics.completedSyncJobs ?? 0}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <XCircle className="h-4 w-4 text-rose-400" />
            <span className="text-sm font-medium text-rose-300">Failed Jobs</span>
          </div>
          <span className="text-lg font-bold text-rose-400">
            {summaryLoading ? "..." : summary?.summaryMetrics.failedSyncJobs ?? 0}
          </span>
        </div>
      </div>

      {/* Platform Statistics Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Platform Sync Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(summary?.platformStats || []).map((stat) => (
            <div
              key={stat.platform}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-bold text-slate-100 tracking-wider">
                  {stat.platform}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {stat.connectedIntegrations} Connected Accounts
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-800">Published Mappings:</span>
                  <div className="text-base font-semibold text-emerald-400 mt-0.5">
                    {stat.publishedMappings}
                  </div>
                </div>
                <div>
                  <span className="text-slate-800">Pending / Processing:</span>
                  <div className="text-base font-semibold text-amber-400 mt-0.5">
                    {stat.pendingJobs + stat.processingJobs}
                  </div>
                </div>
                <div>
                  <span className="text-slate-800">Completed Jobs:</span>
                  <div className="text-base font-semibold text-blue-400 mt-0.5">
                    {stat.completedJobs}
                  </div>
                </div>
                <div>
                  <span className="text-slate-800">Failed Jobs:</span>
                  <div className="text-base font-semibold text-rose-400 mt-0.5">
                    {stat.failedJobs}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Channel Health Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Connected Channel Health</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(summary?.integrationsHealth || []).map((integration) => (
            <div
              key={integration._id}
              className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm">{integration.storeName}</span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                    {integration.platform}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate max-w-[180px]">
                  {integration.storeUrl || "Configured"}
                </p>
              </div>
              <button
                onClick={() => handleTestConnection(integration._id)}
                disabled={testingId === integration._id}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {testingId === integration._id ? (
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-slate-800" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                )}
                Test
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Failed Sync Section (With Retry Controls) */}
      {failedLogs.length > 0 && (
        <div className="space-y-4 bg-rose-950/20 border border-rose-900/30 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="text-lg font-semibold text-slate-100">Failed Sync Jobs Requiring Attention</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-medium">
              {failedLogs.length} Failed
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-rose-900/20 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-rose-950/40 text-slate-300 font-semibold border-b border-rose-900/30">
                <tr>
                  <th className="p-3">Master SKU</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Store Account</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Attempts</th>
                  <th className="p-3">Error Cause</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-900/20 text-slate-300">
                {failedLogs.map((log: SyncLog) => {
                  const prod = typeof log.productId === "object" ? log.productId : null;
                  const integ = typeof log.integrationId === "object" ? log.integrationId : null;

                  return (
                    <tr key={log._id} className="hover:bg-rose-900/10">
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {prod?.sku || "N/A"}
                      </td>
                      <td className="p-3">{integ?.platform || "N/A"}</td>
                      <td className="p-3">{integ?.storeName || "N/A"}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3">{log.attempts} / {log.maxAttempts}</td>
                      <td className="p-3 text-rose-300 max-w-xs truncate" title={log.error}>
                        {log.error || "Unknown Error"}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRetry(log._id)}
                          disabled={retryMutation.isPending}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow transition-colors text-xs flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          <RotateCw className="h-3 w-3" />
                          Retry
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sync Activity Table & Server-Side Filters */}
      <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Recent Sync Activity Audit Log</h2>
            <p className="text-xs text-slate-800">Complete historical sync trail across all channels</p>
          </div>

          {/* Server-Side Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-200 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={platformFilter}
              onChange={(e) => {
                setPlatformFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Platforms</option>
              <option value="SHOPIFY">SHOPIFY</option>
              <option value="EBAY">EBAY</option>
              <option value="CUSTOM_WEBSITE">CUSTOM WEBSITE</option>
            </select>
          </div>
        </div>

        {/* Sync Logs Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-200 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Master SKU</th>
                <th className="p-3.5">Title</th>
                <th className="p-3.5">Platform</th>
                <th className="p-3.5">Store Name</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Attempts</th>
                <th className="p-3.5">Created At</th>
                <th className="p-3.5">Completed At</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {logsLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Loading sync activity...
                  </td>
                </tr>
              ) : (logsData?.logs || []).length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No sync logs match the selected filters.
                  </td>
                </tr>
              ) : (
                (logsData?.logs || []).map((log: SyncLog) => {
                  const prod = typeof log.productId === "object" ? log.productId : null;
                  const integ = typeof log.integrationId === "object" ? log.integrationId : null;

                  return (
                    <tr key={log._id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono font-semibold text-slate-200">
                        {prod?.sku || "N/A"}
                      </td>
                      <td className="p-3.5 max-w-[180px] truncate text-slate-300">
                        {prod?.title || "N/A"}
                      </td>
                      <td className="p-3.5 font-medium">{integ?.platform || "N/A"}</td>
                      <td className="p-3.5">{integ?.storeName || "N/A"}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            log.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : log.status === "FAILED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : log.status === "PROCESSING"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5">{log.attempts} / {log.maxAttempts}</td>
                      <td className="p-3.5 text-slate-200">
                        {new Date(log.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="p-3.5 text-slate-200">
                        {log.completedAt ? new Date(log.completedAt).toLocaleTimeString() : "-"}
                      </td>
                      <td className="p-3.5 text-right">
                        {prod?._id && (
                          <button
                            onClick={() =>
                              setSelectedProductForModal({
                                _id: prod._id,
                                sku: prod.sku,
                                title: prod.title,
                                description: prod.description || "",
                                brand: "",
                                category: "",
                                images: [],
                                price: prod.price ?? 0,
                                quantity: prod.quantity ?? 0,
                                shippingCharge: 0,
                                status: (prod.status as any) || "ACTIVE",
                                syncStatus: "SYNCED",
                                isDeleted: false,
                                createdAt: "",
                                updatedAt: "",
                              })
                            }
                            className="p-1.5 text-slate-200 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1 text-xs"
                            title="View product channel details"
                          >
                            <Eye className="h-4 w-4 text-indigo-400" />
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {logsData?.pagination && logsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs text-slate-800">
              Page {logsData.pagination.page} of {logsData.pagination.totalPages} ({logsData.pagination.total} total logs)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, logsData.pagination.totalPages))}
                disabled={page === logsData.pagination.totalPages}
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Product-Level Channel Sync Details Modal (Reused Phase 25 Component) */}
      {selectedProductForModal && (
        <ProductSyncModal
          product={selectedProductForModal}
          isOpen={Boolean(selectedProductForModal)}
          onClose={() => setSelectedProductForModal(null)}
        />
      )}
    </div>
  );
}
