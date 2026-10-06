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
  onSync: (mapping: ProductMapping) => void;
}

function platformLabel(platform: string): string {
  if (platform === "SHOPIFY") return "Shopify";
  if (platform === "EBAY") return "eBay";
  if (platform === "CUSTOM_WEBSITE") return "Custom Website";
  return platform || "--";
}

export default function ProductMappingTable({
  mappings,
  isLoading,
  onEdit,
  onDelete,
  onSync,
}: ProductMappingTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex h-16 animate-pulse items-center gap-4 rounded-xl bg-slate-100 px-4" />
          ))}
        </div>
      </div>
    );
  }

  if (!mappings || mappings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center shadow-sm">
        <div className="mb-4 rounded-full bg-slate-100 p-4 text-slate-400">
          <Link2 className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No channel mappings yet</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Publish a master product, or link a listing that already exists on Shopify or eBay.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
      <table className="min-w-[1100px] w-full text-left text-sm text-slate-600">
        <thead className="border-b bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-6 py-4">Master Product</th>
            <th className="px-6 py-4">Channel</th>
            <th className="px-6 py-4">Existing Channel Listing</th>
            <th className="px-6 py-4">Channel SKU</th>
            <th className="px-6 py-4">Price</th>
            <th className="px-6 py-4">Quantity</th>
            <th className="px-6 py-4">Currency</th>
            <th className="px-6 py-4">Sync Status</th>
            <th className="px-6 py-4">Last Synced</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {mappings.map((mapping) => {
            const product = typeof mapping.productId === "object" ? mapping.productId : null;
            const integration = typeof mapping.integrationId === "object" ? mapping.integrationId : null;
            const platform = integration?.platform || "";
            const listingMissing = !mapping.externalProductId;
            const priceMissing = mapping.channelPrice === undefined || mapping.channelPrice === null;
            const quantityMissing = mapping.channelQuantity === undefined || mapping.channelQuantity === null;
            const categoryRequired = platform === "EBAY" && !mapping.channelCategoryId;
            const looksSynced = mapping.syncStatus === "SYNCED" && !listingMissing && !priceMissing && !quantityMissing;

            return (
              <tr key={mapping._id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{product?.title || mapping.sku}</div>
                  <div className="font-mono text-xs text-slate-500">{product?.sku || mapping.sku}</div>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">{platformLabel(platform)}</td>
                <td className="px-6 py-4">{listingMissing ? "External listing missing" : product?.title || mapping.sku}</td>
                <td className="px-6 py-4 font-mono text-xs">{mapping.externalSku || mapping.sku}</td>
                <td className="px-6 py-4">{priceMissing ? "Price missing" : mapping.channelPrice}</td>
                <td className="px-6 py-4">{quantityMissing ? "Quantity missing" : mapping.channelQuantity}</td>
                <td className="px-6 py-4">{mapping.channelCurrency || "--"}</td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{looksSynced ? "Synced" : mapping.syncStatus}</div>
                  {categoryRequired && <div className="text-xs text-amber-700">Category required</div>}
                  {mapping.lastSyncError && <div className="max-w-xs text-xs text-red-600">{mapping.lastSyncError}</div>}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {mapping.lastSyncedAt ? formatDistanceToNow(new Date(mapping.lastSyncedAt), { addSuffix: true }) : "--"}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onSync(mapping)}>Sync</Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(mapping)} className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(mapping)} className="h-8 w-8 text-red-600">
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
