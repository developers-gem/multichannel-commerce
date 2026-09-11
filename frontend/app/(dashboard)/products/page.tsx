"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Layers, ArrowRight, Plug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/types/product";
import { useProducts } from "@/hooks/use-products";
import { useIntegrations } from "@/hooks/use-integrations";
import ProductTable from "@/components/products/product-table";
import ProductFormModal from "@/components/products/product-form-modal";
import ProductDeleteDialog from "@/components/products/product-delete-dialog";
import ProductSyncModal from "@/components/products/product-sync-modal";
import ProductPublishModal from "@/components/products/product-publish-modal";

export default function ProductsPage() {
  const router = useRouter();

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
  const { data: integrationsData, isLoading: isIntegrationsLoading } = useIntegrations();

  const integrationsList = integrationsData?.data || [];
  const activeIntegrations = integrationsList.filter((i) => i.isActive);
  const hasIntegrations = activeIntegrations.length > 0;

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

      {/* Contextual Next Step Banner */}
      {!isIntegrationsLoading && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-indigo-950 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 shrink-0 mt-0.5">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-950">
                Your Master Products are ready.
              </h3>
              <p className="text-xs sm:text-sm text-indigo-800/90 mt-0.5">
                {hasIntegrations
                  ? "Next step: Map your Master Products to your connected sales channels so price, quantity, and other changes can be synchronized."
                  : "Connect a sales channel to start syncing your products."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            {hasIntegrations ? (
              <Button
                onClick={() => router.push("/product-mappings")}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
              >
                Go to Product Mappings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => router.push("/integrations?connect=SHOPIFY")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs"
                >
                  <Plug className="mr-1.5 h-3.5 w-3.5" />
                  Connect Shopify
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/integrations?connect=EBAY")}
                  className="text-slate-800 border-slate-300 hover:bg-white text-xs"
                >
                  <Plug className="mr-1.5 h-3.5 w-3.5" />
                  Connect eBay
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/integrations?connect=CUSTOM_WEBSITE")}
                  className="text-slate-800 border-slate-300 hover:bg-white text-xs"
                >
                  <Plug className="mr-1.5 h-3.5 w-3.5" />
                  Connect Custom Website
                </Button>
              </>
            )}
          </div>
        </div>
      )}

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
