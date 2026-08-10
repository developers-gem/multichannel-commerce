"use client";

import { Edit2, Trash2, Package, Image as ImageIcon, ChevronLeft, ChevronRight, Layers, RefreshCw, Send } from "lucide-react";
import { Product, ProductsPagination } from "@/types/product";
import { Button } from "@/components/ui/button";

interface ProductTableProps {
  products: Product[];
  pagination?: ProductsPagination;
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onSyncDetails: (product: Product) => void;
  onPublish: (product: Product) => void;
  onPageChange: (newPage: number) => void;
}

export default function ProductTable({
  products,
  pagination,
  isLoading,
  onEdit,
  onDelete,
  onSyncDetails,
  onPublish,
  onPageChange,
}: ProductTableProps) {
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

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center shadow-sm">
        <div className="rounded-full bg-slate-100 p-4 text-slate-400 mb-4">
          <Package className="h-10 w-10" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Master Products Found</h3>
        <p className="mt-1 text-sm text-slate-500 max-w-sm">
          No master catalog products match your criteria or none have been created yet. Click "Add Product" above to create your first product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="w-full max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-[1050px] w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b">
            <tr>
              <th className="px-6 py-4">Image</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Quantity</th>
              <th className="px-6 py-4">Shipping</th>
              <th className="px-6 py-4">Channels</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {products.map((product) => {
              const hasImage = product.images && product.images.length > 0 && product.images[0];
              const mappingCount = product.mappingCount ?? 0;

              return (
                <tr key={product._id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Image */}
                  <td className="px-6 py-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border bg-slate-100 flex items-center justify-center">
                      {hasImage ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-6 py-4 font-mono font-bold text-indigo-900">
                    {product.sku}
                  </td>

                  {/* Title */}
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{product.title}</div>
                    {product.brand && (
                      <div className="text-xs text-slate-400">{product.brand}</div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4 text-slate-500">
                    {product.category || "--"}
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 font-bold text-slate-900">
                    ${product.price.toFixed(2)}
                  </td>

                  {/* Quantity */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        product.quantity > 10
                          ? "bg-slate-100 text-slate-700"
                          : product.quantity > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {product.quantity > 0 ? `${product.quantity} in stock` : "Out of Stock"}
                    </span>
                  </td>

                  {/* Shipping Charge */}
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                    ${(product.shippingCharge || 0).toFixed(2)}
                  </td>

                  {/* Connected Channels Badge */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onSyncDetails(product)}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all hover:opacity-90 ${
                        mappingCount > 0
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                          : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                      }`}
                      title="Click to view & trigger channel synchronization"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {mappingCount} {mappingCount === 1 ? "Channel" : "Channels"}
                    </button>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                        product.status === "ACTIVE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : product.status === "DRAFT"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPublish(product)}
                        title="Publish to Channels"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Send className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSyncDetails(product)}
                        title="View & Sync Channel Status"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(product)}
                        title="Edit Master Product"
                        className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(product)}
                        title="Delete Master Product"
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

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Showing page <span className="font-semibold text-slate-800">{pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> (Total{" "}
            <span className="font-semibold text-slate-800">{pagination.total}</span> products)
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
