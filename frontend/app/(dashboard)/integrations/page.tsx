"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogImportSummary, Integration } from "@/types/integration";
import { useIntegrations, useTestIntegrationConnection } from "@/hooks/use-integrations";
import { useCatalogImport } from "@/hooks/use-catalog-import";
import IntegrationTable from "@/components/integrations/integration-table";
import IntegrationFormModal from "@/components/integrations/integration-form-modal";
import IntegrationDeleteDialog from "@/components/integrations/integration-delete-dialog";
import ImportResultModal from "@/components/integrations/import-result-modal";

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);

  // Catalog Import Result Modal state
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<CatalogImportSummary | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Test Connection loading state
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useIntegrations();
  const importMutation = useCatalogImport();
  const testConnectionMutation = useTestIntegrationConnection();

  const handleOpenAddModal = () => {
    setSelectedIntegration(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (integration: Integration) => {
    setSelectedIntegration(integration);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (integration: Integration) => {
    setIntegrationToDelete(integration);
    setIsDeleteModalOpen(true);
  };

  const handleTestConnection = (integration: Integration) => {
    setTestingId(integration._id);
    toast.info(`Testing connection to ${integration.storeName}...`);

    testConnectionMutation.mutate(integration._id, {
      onSuccess: (res) => {
        setTestingId(null);
        if (res.success) {
          toast.success(res.message || `Connection to ${integration.storeName} is healthy!`);
        } else {
          toast.error(res.message || `Connection to ${integration.storeName} failed.`);
        }
      },
      onError: (err: Error) => {
        setTestingId(null);
        toast.error(err.message || `Failed to test connection to ${integration.storeName}`);
      },
    });
  };

  const handleImportProducts = (integration: Integration) => {
    setImportingId(integration._id);
    toast.info(`Importing catalog products from ${integration.storeName}...`);

    importMutation.mutate(integration._id, {
      onSuccess: (res) => {
        setImportingId(null);
        if (res?.data) {
          setImportSummary(res.data);
          setIsResultModalOpen(true);
          toast.success(`Catalog import completed for ${integration.storeName}`);
        }
      },
      onError: (err: Error) => {
        setImportingId(null);
        toast.error(err.message || `Failed to import catalog from ${integration.storeName}`);
      },
    });
  };

  const allIntegrations = data?.data || [];

  const filteredIntegrations = allIntegrations.filter((item) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();

    const storeMatch = item.storeName.toLowerCase().includes(query);
    const platformMatch = item.platform.toLowerCase().includes(query);
    const urlMatch = item.storeUrl.toLowerCase().includes(query);

    return storeMatch || platformMatch || urlMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Integrations
          </h1>
          <p className="mt-1 text-slate-500">
            Manage connected marketplace accounts and sales channels
          </p>
        </div>

        <Button onClick={handleOpenAddModal} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Connect Channel
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by store name, platform, or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          Failed to load integrations:{" "}
          {(error as Error)?.message || "Unknown error"}
        </div>
      )}

      {/* Integration Table */}
      <IntegrationTable
        integrations={filteredIntegrations}
        isLoading={isLoading}
        importingId={importingId}
        testingId={testingId}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        onImportProducts={handleImportProducts}
        onTestConnection={handleTestConnection}
      />

      {/* Form Modal */}
      <IntegrationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={selectedIntegration}
      />

      {/* Delete Dialog */}
      <IntegrationDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        integration={integrationToDelete}
      />

      {/* Import Result Summary Modal */}
      <ImportResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        summary={importSummary}
      />
    </div>
  );
}
