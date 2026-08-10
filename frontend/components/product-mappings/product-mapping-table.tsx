"use client";

import { Edit2, Trash2, Link2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProductMapping } from "@/types/product-mapping";
import { Button } from "@/components/ui/button";

interface ProductMappingTableProps {
  mappings: ProductMapping[];
  isLoading: boolean;
  onEdit: (mapping: ProductMapping) => void;
  onDelete: (mapping: ProductMapping) => void;
}

export default function ProductMappingTable({
  mappings,
  isLoading,
  onEdit,
  onDelete,
}: ProductMappingTableProps) {
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

  if (!mappings || mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center shadow-sm">
        <div className="rounded-full bg-slate-100 p-4 text-slate-400 mb-4">
          <Link2 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">
          No Product Mappings Found
        </h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          No product mappings match your search criteria or none have been created yet. Click "Add Mapping" above to connect your first product listing.
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
            <th className="px-6 py-4">Ext Variant ID</th>
            <th className="px-6 py-4">Ext SKU</th>
            <th className="px-6 py-4">Sync Status</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Last Synced</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {mappings.map((mapping) => {
            const product =
              typeof mapping.productId === "object" ? mapping.productId : null;
            const integration =
              typeof mapping.integrationId === "object"
                ? mapping.integrationId
                : null;

            const productTitle = product?.title || "--";
            const platform = integration?.platform || "--";
            const storeName = integration?.storeName || "--";

            const lastSyncedText = mapping.lastSyncedAt
              ? formatDistanceToNow(new Date(mapping.lastSyncedAt), {
                  addSuffix: true,
                })
              : "--";

            return (
              <tr
                key={mapping._id}
                className="hover:bg-slate-50/80 transition-colors"
              >
                {/* SKU */}
                <td className="px-6 py-4 font-mono font-bold text-slate-900">
                  {mapping.sku}
                </td>

                {/* Title */}
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900 max-w-xs truncate">
                    {productTitle}
                  </div>
                </td>

                {/* Platform */}
                <td className="px-6 py-4 font-medium text-slate-800">
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {platform}
                  </span>
                </td>

                {/* Store Name */}
                <td className="px-6 py-4 font-medium text-slate-700">
                  {storeName}
                </td>

                {/* External Product ID */}
                <td className="px-6 py-4 font-mono text-xs text-slate-600">
                  {mapping.externalProductId}
                </td>

                {/* External Variant ID */}
                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                  {mapping.externalVariantId || "--"}
                </td>

                {/* External SKU */}
                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                  {mapping.externalSku || "--"}
                </td>

                {/* Sync Status */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                      mapping.syncStatus === "SYNCED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : mapping.syncStatus === "FAILED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {mapping.syncStatus}
                  </span>
                </td>

                {/* Active Status */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                      mapping.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {mapping.isActive ? "Active" : "Inactive"}
                  </span>
                </td>

                {/* Last Synced */}
                <td className="px-6 py-4 text-xs text-slate-500">
                  {lastSyncedText}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(mapping)}
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(mapping)}
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
