"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductMapping } from "@/types/product-mapping";
import { useProductMappings } from "@/hooks/use-product-mappings";
import ProductMappingTable from "@/components/product-mappings/product-mapping-table";
import ProductMappingFormModal from "@/components/product-mappings/product-mapping-form-modal";
import ProductMappingDeleteDialog from "@/components/product-mappings/product-mapping-delete-dialog";

export default function ProductMappingsPage() {
  const [search, setSearch] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<ProductMapping | null>(
    null
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<ProductMapping | null>(
    null
  );

  const { data, isLoading, isError, error } = useProductMappings();

  const handleOpenAddModal = () => {
    setSelectedMapping(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (mapping: ProductMapping) => {
    setSelectedMapping(mapping);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (mapping: ProductMapping) => {
    setMappingToDelete(mapping);
    setIsDeleteModalOpen(true);
  };

  const allMappings = data?.data || [];

  const filteredMappings = allMappings.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();

    const skuMatch = item.sku.toLowerCase().includes(query);
    const extIdMatch = item.externalProductId.toLowerCase().includes(query);
    const extSkuMatch = item.externalSku?.toLowerCase().includes(query) || false;

    const productTitle =
      typeof item.productId === "object" ? item.productId.title.toLowerCase() : "";
    const titleMatch = productTitle.includes(query);

    const storeName =
      typeof item.integrationId === "object"
        ? item.integrationId.storeName.toLowerCase()
        : "";
    const storeMatch = storeName.includes(query);

    return skuMatch || extIdMatch || extSkuMatch || titleMatch || storeMatch;
  });

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Product Mappings
          </h1>
          <p className="mt-1 text-slate-500">
            Connect master product catalog SKUs to external marketplace channel listings
          </p>
        </div>

        <Button onClick={handleOpenAddModal} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Mapping
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by SKU, title, store, or external ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Failed to load product mappings:{" "}
          {(error as Error)?.message || "Unknown error"}
        </div>
      )}

      {/* Table */}
      <ProductMappingTable
        mappings={filteredMappings}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      {/* Add / Edit Modal */}
      <ProductMappingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={selectedMapping}
      />

      {/* Delete Dialog */}
      <ProductMappingDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        mapping={mappingToDelete}
      />
    </div>
  );
}
