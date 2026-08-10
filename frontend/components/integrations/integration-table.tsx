"use client";

import { Edit2, Trash2, Link2, ExternalLink, Download, Loader2, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Integration } from "@/types/integration";
import { Button } from "@/components/ui/button";

interface IntegrationTableProps {
  integrations: Integration[];
  isLoading: boolean;
  importingId?: string | null;
  testingId?: string | null;
  onEdit: (integration: Integration) => void;
  onDelete: (integration: Integration) => void;
  onImportProducts: (integration: Integration) => void;
  onTestConnection: (integration: Integration) => void;
}

export default function IntegrationTable({
  integrations,
  isLoading,
  importingId,
  testingId,
  onEdit,
  onDelete,
  onImportProducts,
  onTestConnection,
}: IntegrationTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="flex h-16 animate-pulse items-center gap-4 rounded-xl bg-slate-100 px-4"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!integrations || integrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center shadow-sm">
        <div className="rounded-full bg-slate-100 p-4 text-slate-400 mb-4">
          <Link2 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Integrations Connected</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          You haven't connected any marketplace stores yet. Click "Connect Channel" above to add your first sales integration.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-[950px] w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
          <tr>
            <th className="px-6 py-4">Platform</th>
            <th className="px-6 py-4">Store Name</th>
            <th className="px-6 py-4">Store URL</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Last Sync</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {integrations.map((item) => {
            const isCurrentlyImporting = importingId === item._id;
            const isCurrentlyTesting = testingId === item._id;

            const lastSyncText = item.lastSync
              ? formatDistanceToNow(new Date(item.lastSync), { addSuffix: true })
              : "--";

            return (
              <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                {/* Platform */}
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    {item.platform}
                  </span>
                </td>

                {/* Store Name */}
                <td className="px-6 py-4 font-semibold text-slate-900">
                  {item.storeName}
                </td>

                {/* Store URL */}
                <td className="px-6 py-4">
                  <a
                    href={item.storeUrl.startsWith("http") ? item.storeUrl : `https://${item.storeUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-indigo-600 hover:underline font-mono text-xs"
                  >
                    {item.storeUrl}
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                      item.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {item.isActive ? "Connected" : "Disconnected"}
                  </span>
                </td>

                {/* Last Sync */}
                <td className="px-6 py-4 text-xs text-slate-500">
                  {lastSyncText}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Test Connection Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCurrentlyTesting || !item.isActive}
                      onClick={() => onTestConnection(item)}
                      className="h-8 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      {isCurrentlyTesting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Activity className="h-3.5 w-3.5 text-indigo-600" />
                          Test Connection
                        </>
                      )}
                    </Button>

                    {/* Import Products Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCurrentlyImporting || !item.isActive}
                      onClick={() => onImportProducts(item)}
                      className="h-8 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                    >
                      {isCurrentlyImporting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5" />
                          Import Products
                        </>
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(item)}
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item)}
                      className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
