"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/types/product";
import { useProducts } from "@/hooks/use-products";
import ProductTable from "@/components/products/product-table";
import ProductFormModal from "@/components/products/product-form-modal";
import ProductDeleteDialog from "@/components/products/product-delete-dialog";
import ProductSyncModal from "@/components/products/product-sync-modal";
import ProductPublishModal from "@/components/products/product-publish-modal";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [productToSync, setProductToSync] = useState<Product | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [productToPublish, setProductToPublish] = useState<Product | null>(null);

  const { data, isLoading, isError, error } = useProducts(page, limit, search);

  const handleOpenAddModal = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleOpenSyncModal = (product: Product) => {
    setProductToSync(product);
    setIsSyncModalOpen(true);
  };

  const handleOpenPublishModal = (product: Product) => {
    setProductToPublish(product);
    setIsPublishModalOpen(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="mt-1 text-slate-500">
            Manage your master product catalog across all sales channels
          </p>
        </div>

        <Button onClick={handleOpenAddModal} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by SKU or title..."
            value={search}
            onChange={handleSearchChange}
            className="pl-10 h-11 bg-white"
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Failed to load products: {(error as Error)?.message || "Unknown error"}
        </div>
      )}

      {/* Product Table */}
      <ProductTable
        products={data?.data.products || []}
        pagination={data?.data.pagination}
        isLoading={isLoading}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        onSyncDetails={handleOpenSyncModal}
        onPublish={handleOpenPublishModal}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Add / Edit Form Modal */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={selectedProduct}
      />

      {/* Delete Confirmation Dialog */}
      <ProductDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        product={productToDelete}
      />

      {/* Per-Product Channel Sync Modal */}
      <ProductSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        product={productToSync}
        onPublishToChannels={handleOpenPublishModal}
      />

      {/* Product Channel Publishing Modal */}
      <ProductPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        product={productToPublish}
      />
    </div>
  );
}
