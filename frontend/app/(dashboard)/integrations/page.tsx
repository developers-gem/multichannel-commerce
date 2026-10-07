// "use client";

// import { Suspense, useCallback, useEffect, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Plus, Search } from "lucide-react";
// import { toast } from "sonner";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { CatalogImportSummary, Integration, PlatformType } from "@/types/integration";
// import { useIntegrations, useTestIntegrationConnection } from "@/hooks/use-integrations";
// import { useCatalogImport } from "@/hooks/use-catalog-import";
// import IntegrationTable from "@/components/integrations/integration-table";
// import IntegrationFormModal from "@/components/integrations/integration-form-modal";
// import IntegrationDeleteDialog from "@/components/integrations/integration-delete-dialog";
// import ImportResultModal from "@/components/integrations/import-result-modal";

// function ShopifyCallbackListener({ refetch }: { refetch: () => void }) {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   useEffect(() => {
//     const shopifySuccess = searchParams.get("shopify_success");
//     const store = searchParams.get("store");
//     const shopifySync = searchParams.get("shopify_sync");
//     const shopifyError = searchParams.get("shopify_error");

//     if (shopifySuccess === "true") {
//       toast.success(`Shopify store ${store ? `"${store}"` : ""} connected successfully!`);
//       if (shopifySync === "completed") {
//         toast.success("Shopify products synchronized successfully.");
//       } else if (shopifySync === "failed") {
//         toast.error("Shopify connected, but the initial product sync failed. Use Import Products to retry.");
//       }
//       refetch();
//       router.replace("/integrations");
//     } else if (shopifyError) {
//       toast.error(`Shopify OAuth failed: ${shopifyError}`);
//       router.replace("/integrations");
//     }
//   }, [searchParams, refetch, router]);

//   return null;
// }

// function ConnectQueryListener({
//   onOpenConnect,
// }: {
//   onOpenConnect: (platform: PlatformType) => void;
// }) {
//   const searchParams = useSearchParams();

//   useEffect(() => {
//     const connectParam = searchParams.get("connect") || searchParams.get("platform");
//     if (connectParam) {
//       const platformUpper = connectParam.toUpperCase();
//       if (["SHOPIFY", "EBAY", "CUSTOM_WEBSITE"].includes(platformUpper)) {
//         onOpenConnect(platformUpper as PlatformType);
//       }
//     }
//   }, [searchParams, onOpenConnect]);

//   return null;
// }

// export default function IntegrationsPage() {
//   const [search, setSearch] = useState("");

//   const [isFormModalOpen, setIsFormModalOpen] = useState(false);
//   const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
//   const [initialPlatform, setInitialPlatform] = useState<PlatformType | null>(null);

//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);

//   // Catalog Import Result Modal state
//   const [isResultModalOpen, setIsResultModalOpen] = useState(false);
//   const [importSummary, setImportSummary] = useState<CatalogImportSummary | null>(null);
//   const [importingId, setImportingId] = useState<string | null>(null);

//   // Test Connection loading state
//   const [testingId, setTestingId] = useState<string | null>(null);

//   const { data, isLoading, isError, error, refetch } = useIntegrations();
//   const importMutation = useCatalogImport();
//   const testConnectionMutation = useTestIntegrationConnection();

//   const handleOpenAddModal = () => {
//     setSelectedIntegration(null);
//     setInitialPlatform("SHOPIFY");
//     setIsFormModalOpen(true);
//   };

//   const handleOpenConnectForPlatform = useCallback((platform: PlatformType) => {
//     setSelectedIntegration(null);
//     setInitialPlatform(platform);
//     setIsFormModalOpen(true);
//   }, []);

//   const handleOpenEditModal = (integration: Integration) => {
//     setSelectedIntegration(integration);
//     setIsFormModalOpen(true);
//   };

//   const handleOpenDeleteModal = (integration: Integration) => {
//     setIntegrationToDelete(integration);
//     setIsDeleteModalOpen(true);
//   };

//   const handleTestConnection = (integration: Integration) => {
//     setTestingId(integration._id);
//     toast.info(`Testing connection to ${integration.storeName}...`);

//     testConnectionMutation.mutate(integration._id, {
//       onSuccess: (res) => {
//         setTestingId(null);
//         if (res.success) {
//           toast.success(res.message || `Connection to ${integration.storeName} is healthy!`);
//         } else {
//           toast.error(res.message || `Connection to ${integration.storeName} failed.`);
//         }
//       },
//       onError: (err: Error) => {
//         setTestingId(null);
//         toast.error(err.message || `Failed to test connection to ${integration.storeName}`);
//       },
//     });
//   };

//   const handleImportProducts = (integration: Integration) => {
//     setImportingId(integration._id);
//     toast.info(`Importing catalog products from ${integration.storeName}...`);

//     importMutation.mutate(integration._id, {
//       onSuccess: (res) => {
//         setImportingId(null);
//         if (res?.data) {
//           setImportSummary(res.data);
//           setIsResultModalOpen(true);
//           toast.success(`Catalog import completed for ${integration.storeName}`);
//         }
//       },
//       onError: (err: Error) => {
//         setImportingId(null);
//         toast.error(err.message || `Failed to import catalog from ${integration.storeName}`);
//       },
//     });
//   };

//   const allIntegrations = data?.data || [];

//   const filteredIntegrations = allIntegrations.filter((item) => {
//     if (!search.trim()) return true;
//     const query = search.toLowerCase();

//     const storeMatch = item.storeName.toLowerCase().includes(query);
//     const platformMatch = item.platform.toLowerCase().includes(query);
//     const urlMatch = item.storeUrl.toLowerCase().includes(query);

//     return storeMatch || platformMatch || urlMatch;
//   });

//   return (
//     <div className="space-y-6">
//       <Suspense fallback={null}>
//         <ShopifyCallbackListener refetch={refetch} />
//         <ConnectQueryListener onOpenConnect={handleOpenConnectForPlatform} />
//       </Suspense>

//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold text-slate-900">
//             Integrations
//           </h1>
//           <p className="mt-1 text-slate-500">
//             Manage connected marketplace accounts and sales channels
//           </p>
//         </div>

//         <Button onClick={handleOpenAddModal} className="shrink-0">
//           <Plus className="mr-2 h-4 w-4" />
//           Connect Channel
//         </Button>
//       </div>

//       {/* Controls Bar */}
//       <div className="flex items-center gap-4">
//         <div className="relative flex-1 max-w-md">
//           <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//           <Input
//             placeholder="Search by store name, platform, or URL..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="pl-10 h-11 bg-white"
//           />
//         </div>
//       </div>

//       {/* Error state */}
//       {isError && (
//         <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
//           Failed to load integrations:{" "}
//           {(error as Error)?.message || "Unknown error"}
//         </div>
//       )}

//       {/* Integration Table */}
//       <IntegrationTable
//         integrations={filteredIntegrations}
//         isLoading={isLoading}
//         importingId={importingId}
//         testingId={testingId}
//         onEdit={handleOpenEditModal}
//         onDelete={handleOpenDeleteModal}
//         onImportProducts={handleImportProducts}
//         onTestConnection={handleTestConnection}
//       />

//       {/* Form Modal */}
//       <IntegrationFormModal
//         isOpen={isFormModalOpen}
//         onClose={() => setIsFormModalOpen(false)}
//         initialData={selectedIntegration}
//         initialPlatform={initialPlatform}
//       />

//       {/* Delete Dialog */}
//       <IntegrationDeleteDialog
//         isOpen={isDeleteModalOpen}
//         onClose={() => setIsDeleteModalOpen(false)}
//         integration={integrationToDelete}
//       />

//       {/* Import Result Summary Modal */}
//       <ImportResultModal
//         isOpen={isResultModalOpen}
//         onClose={() => setIsResultModalOpen(false)}
//         summary={importSummary}
//       />
//     </div>
//   );
// }
// "use client";

// import { Suspense, useCallback, useEffect, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import { Plus, Search } from "lucide-react";
// import { toast } from "sonner";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { CatalogImportSummary, Integration, PlatformType } from "@/types/integration";
// import { useIntegrations, useTestIntegrationConnection } from "@/hooks/use-integrations";
// import { useCatalogImport } from "@/hooks/use-catalog-import";
// import IntegrationTable from "@/components/integrations/integration-table";
// import IntegrationFormModal from "@/components/integrations/integration-form-modal";
// import IntegrationDeleteDialog from "@/components/integrations/integration-delete-dialog";
// import ImportResultModal from "@/components/integrations/import-result-modal";
// import { initiateEbayAuthorize } from "@/services/integration.service";

// function ShopifyCallbackListener({ refetch }: { refetch: () => void }) {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   useEffect(() => {
//     const shopifySuccess = searchParams.get("shopify_success");
//     const store = searchParams.get("store");
//     const shopifySync = searchParams.get("shopify_sync");
//     const shopifyError = searchParams.get("shopify_error");

//     if (shopifySuccess === "true") {
//       toast.success(`Shopify store ${store ? `"${store}"` : ""} connected successfully!`);
//       if (shopifySync === "completed") {
//         toast.success("Shopify products synchronized successfully.");
//       } else if (shopifySync === "failed") {
//         toast.error("Shopify connected, but the initial product sync failed. Use Import Products to retry.");
//       }
//       refetch();
//       router.replace("/integrations");
//     } else if (shopifyError) {
//       toast.error(`Shopify OAuth failed: ${shopifyError}`);
//       router.replace("/integrations");
//     }
//   }, [searchParams, refetch, router]);

//   return null;
// }

// function EbayCallbackListener({ refetch }: { refetch: () => void }) {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   useEffect(() => {
//     const ebaySuccess = searchParams.get("ebay_success");
//     const ebayError = searchParams.get("ebay_error");
//     const ebaySync = searchParams.get("ebay_sync");
//     const ebaySetup = searchParams.get("ebay_setup");

//     if (ebaySuccess === "true") {
//       toast.success("eBay store connected successfully!");
//       if (ebaySync === "completed") toast.success("eBay listings synchronized successfully.");
//       if (ebaySync === "failed") toast.error("eBay connected, but listing synchronization failed. Use Import Products to retry.");
//       if (ebaySetup === "configuration_pending") toast.warning("eBay connected, but seller policies or inventory location need configuration before publishing new listings.");
//       refetch();
//       router.replace("/integrations");
//     } else if (ebayError) {
//       toast.error(`eBay OAuth failed: ${ebayError}`);
//       router.replace("/integrations");
//     }
//   }, [searchParams, refetch, router]);

//   return null;
// }

// function ConnectQueryListener({
//   onOpenConnect,
// }: {
//   onOpenConnect: (platform: PlatformType) => void;
// }) {
//   const searchParams = useSearchParams();

//   useEffect(() => {
//     const connectParam = searchParams.get("connect") || searchParams.get("platform");
//     if (connectParam) {
//       const platformUpper = connectParam.toUpperCase();
//       if (["SHOPIFY", "EBAY", "CUSTOM_WEBSITE"].includes(platformUpper)) {
//         onOpenConnect(platformUpper as PlatformType);
//       }
//     }
//   }, [searchParams, onOpenConnect]);

//   return null;
// }

// export default function IntegrationsPage() {
//   const [search, setSearch] = useState("");

//   const [isFormModalOpen, setIsFormModalOpen] = useState(false);
//   const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
//   const [initialPlatform, setInitialPlatform] = useState<PlatformType | null>(null);

//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);

//   // Catalog Import Result Modal state
//   const [isResultModalOpen, setIsResultModalOpen] = useState(false);
//   const [importSummary, setImportSummary] = useState<CatalogImportSummary | null>(null);
//   const [importingId, setImportingId] = useState<string | null>(null);

//   // Test Connection loading state
//   const [testingId, setTestingId] = useState<string | null>(null);

//   const { data, isLoading, isError, error, refetch } = useIntegrations();
//   const importMutation = useCatalogImport();
//   const testConnectionMutation = useTestIntegrationConnection();

//   const handleOpenAddModal = () => {
//     setSelectedIntegration(null);
//     setInitialPlatform("SHOPIFY");
//     setIsFormModalOpen(true);
//   };

//   const handleOpenConnectForPlatform = useCallback(async (platform: PlatformType) => {
//     if (platform === "EBAY") {
//       try {
//         toast.info("Connecting to eBay...");
//         const res = await initiateEbayAuthorize();
//         if (res.success && res.data?.authUrl) {
//           window.location.href = res.data.authUrl;
//           return;
//         }
//       } catch (err: unknown) {
//         toast.error(err instanceof Error ? err.message : "Failed to start eBay connection");
//       }
//       return;
//     }

//     setSelectedIntegration(null);
//     setInitialPlatform(platform);
//     setIsFormModalOpen(true);
//   }, []);

//   const handleOpenEditModal = (integration: Integration) => {
//     setSelectedIntegration(integration);
//     setIsFormModalOpen(true);
//   };

//   const handleOpenDeleteModal = (integration: Integration) => {
//     setIntegrationToDelete(integration);
//     setIsDeleteModalOpen(true);
//   };

//   const handleTestConnection = (integration: Integration) => {
//     setTestingId(integration._id);
//     toast.info(`Testing connection to ${integration.storeName}...`);

//     testConnectionMutation.mutate(integration._id, {
//       onSuccess: (res) => {
//         setTestingId(null);
//         if (res.success) {
//           toast.success(res.message || `Connection to ${integration.storeName} is healthy!`);
//         } else {
//           toast.error(res.message || `Connection to ${integration.storeName} failed.`);
//         }
//       },
//       onError: (err: Error) => {
//         setTestingId(null);
//         toast.error(err.message || `Failed to test connection to ${integration.storeName}`);
//       },
//     });
//   };

//   const handleImportProducts = (integration: Integration) => {
//     setImportingId(integration._id);
//     toast.info(`Importing catalog products from ${integration.storeName}...`);

//     importMutation.mutate(integration._id, {
//       onSuccess: (res) => {
//         setImportingId(null);
//         if (res?.data) {
//           setImportSummary(res.data);
//           setIsResultModalOpen(true);
//           toast.success(`Catalog import completed for ${integration.storeName}`);
//         }
//       },
//       onError: (err: Error) => {
//         setImportingId(null);
//         toast.error(err.message || `Failed to import catalog from ${integration.storeName}`);
//       },
//     });
//   };

//   const allIntegrations = data?.data || [];

//   const filteredIntegrations = allIntegrations.filter((item) => {
//     if (!search.trim()) return true;
//     const query = search.toLowerCase();

//     const storeMatch = item.storeName.toLowerCase().includes(query);
//     const platformMatch = item.platform.toLowerCase().includes(query);
//     const urlMatch = item.storeUrl.toLowerCase().includes(query);

//     return storeMatch || platformMatch || urlMatch;
//   });

//   return (
//     <div className="space-y-6">
//       <Suspense fallback={null}>
//         <ShopifyCallbackListener refetch={refetch} />
//         <EbayCallbackListener refetch={refetch} />
//         <ConnectQueryListener onOpenConnect={handleOpenConnectForPlatform} />
//       </Suspense>

//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-3xl font-bold text-slate-900">
//             Integrations
//           </h1>
//           <p className="mt-1 text-slate-500">
//             Manage connected marketplace accounts and sales channels
//           </p>
//         </div>

//         <Button onClick={handleOpenAddModal} className="shrink-0">
//           <Plus className="mr-2 h-4 w-4" />
//           Connect Channel
//         </Button>
//       </div>

//       {/* Controls Bar */}
//       <div className="flex items-center gap-4">
//         <div className="relative flex-1 max-w-md">
//           <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//           <Input
//             placeholder="Search by store name, platform, or URL..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="pl-10 h-11 bg-white"
//           />
//         </div>
//       </div>

//       {/* Error state */}
//       {isError && (
//         <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
//           Failed to load integrations:{" "}
//           {(error as Error)?.message || "Unknown error"}
//         </div>
//       )}

//       {/* Integration Table */}
//       <IntegrationTable
//         integrations={filteredIntegrations}
//         isLoading={isLoading}
//         importingId={importingId}
//         testingId={testingId}
//         onEdit={handleOpenEditModal}
//         onDelete={handleOpenDeleteModal}
//         onImportProducts={handleImportProducts}
//         onTestConnection={handleTestConnection}
//       />

//       {/* Form Modal */}
//       <IntegrationFormModal
//         isOpen={isFormModalOpen}
//         onClose={() => setIsFormModalOpen(false)}
//         initialData={selectedIntegration}
//         initialPlatform={initialPlatform}
//       />

//       {/* Delete Dialog */}
//       <IntegrationDeleteDialog
//         isOpen={isDeleteModalOpen}
//         onClose={() => setIsDeleteModalOpen(false)}
//         integration={integrationToDelete}
//       />

//       {/* Import Result Summary Modal */}
//       <ImportResultModal
//         isOpen={isResultModalOpen}
//         onClose={() => setIsResultModalOpen(false)}
//         summary={importSummary}
//       />
//     </div>
//   );
// }
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CatalogImportSummary, Integration, PlatformType } from "@/types/integration";
import { useIntegrations, useTestIntegrationConnection } from "@/hooks/use-integrations";
import { useCatalogImport } from "@/hooks/use-catalog-import";
import IntegrationTable from "@/components/integrations/integration-table";
import IntegrationFormModal from "@/components/integrations/integration-form-modal";
import IntegrationDeleteDialog from "@/components/integrations/integration-delete-dialog";
import ImportResultModal from "@/components/integrations/import-result-modal";
import { initiateEbayAuthorize } from "@/services/integration.service";

function ShopifyCallbackListener({ refetch }: { refetch: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const shopifySuccess = searchParams.get("shopify_success");
    const store = searchParams.get("store");
    const shopifySync = searchParams.get("shopify_sync");
    const shopifyError = searchParams.get("shopify_error");

    if (shopifySuccess === "true") {
      toast.success(`Shopify store ${store ? `"${store}"` : ""} connected successfully!`);
      if (shopifySync === "completed") {
        toast.success("Shopify products synchronized successfully.");
      } else if (shopifySync === "failed") {
        toast.error("Shopify connected, but the initial product sync failed. Use Import Products to retry.");
      }
      refetch();
      router.replace("/integrations");
    } else if (shopifyError) {
      toast.error(`Shopify OAuth failed: ${shopifyError}`);
      router.replace("/integrations");
    }
  }, [searchParams, refetch, router]);

  return null;
}

function EbayCallbackListener({ refetch }: { refetch: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const ebaySuccess = searchParams.get("ebay_success");
    const ebayError = searchParams.get("ebay_error");
    const ebaySync = searchParams.get("ebay_sync");
    const ebaySetup = searchParams.get("ebay_setup");

    if (ebaySuccess === "true") {
      toast.success("eBay store connected successfully!");
      if (ebaySync === "completed") toast.success("eBay listings synchronized successfully.");
      if (ebaySync === "failed") toast.error("eBay connected, but listing synchronization failed. Use Import Products to retry.");
      if (ebaySetup === "configuration_pending") toast.warning("eBay connected, but seller policies or inventory location need configuration before publishing new listings.");
      refetch();
      router.replace("/integrations");
    } else if (ebayError) {
      toast.error(`eBay OAuth failed: ${ebayError}`);
      router.replace("/integrations");
    }
  }, [searchParams, refetch, router]);

  return null;
}

function ConnectQueryListener({
  onOpenConnect,
}: {
  onOpenConnect: (platform: PlatformType) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const connectParam = searchParams.get("connect") || searchParams.get("platform");
    if (connectParam) {
      const platformUpper = connectParam.toUpperCase();
      if (["SHOPIFY", "EBAY", "CUSTOM_WEBSITE"].includes(platformUpper)) {
        onOpenConnect(platformUpper as PlatformType);
      }
    }
  }, [searchParams, onOpenConnect]);

  return null;
}

export default function IntegrationsPage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [initialPlatform, setInitialPlatform] = useState<PlatformType | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState<Integration | null>(null);

  // Catalog Import Result Modal state
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [importSummary, setImportSummary] = useState<CatalogImportSummary | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  // Test Connection loading state
  const [testingId, setTestingId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useIntegrations();
  const importMutation = useCatalogImport();
  const testConnectionMutation = useTestIntegrationConnection();

  const handleOpenAddModal = () => {
    setSelectedIntegration(null);
    setInitialPlatform("SHOPIFY");
    setIsFormModalOpen(true);
  };

  const handleOpenConnectForPlatform = useCallback(async (platform: PlatformType) => {
    if (platform === "EBAY") {
      try {
        toast.info("Connecting to eBay...");
        const res = await initiateEbayAuthorize();
        if (res.success && res.data?.authUrl) {
          window.location.href = res.data.authUrl;
          return;
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to start eBay connection");
      }
      return;
    }

    setSelectedIntegration(null);
    setInitialPlatform(platform);
    setIsFormModalOpen(true);
  }, []);

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
    // Platform Dropdown Filter Check
    if (platformFilter !== "ALL" && item.platform.toUpperCase() !== platformFilter.toUpperCase()) {
      return false;
    }

    if (!search.trim()) return true;
    const query = search.toLowerCase();

    const storeMatch = item.storeName.toLowerCase().includes(query);
    const platformMatch = item.platform.toLowerCase().includes(query);
    const urlMatch = item.storeUrl.toLowerCase().includes(query);

    return storeMatch || platformMatch || urlMatch;
  });

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ShopifyCallbackListener refetch={refetch} />
        <EbayCallbackListener refetch={refetch} />
        <ConnectQueryListener onOpenConnect={handleOpenConnectForPlatform} />
      </Suspense>

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

        <div className="flex shrink-0 gap-2">
          <Button onClick={handleOpenAddModal} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Connect Channel
          </Button>
        </div>
      </div>

      {/* Controls Bar (Search + Platform Filter Dropdown) */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by store name, platform, or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 bg-white"
          />
        </div>

        {/* Custom Rounded Platform Filter Dropdown */}
<div className="relative w-full sm:w-48">
  <details className="group relative">
    <summary className="flex h-11 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm cursor-pointer list-none focus:outline-none focus:ring-2 focus:ring-indigo-600">
      <span>
        {platformFilter === "ALL" && "All Platforms"}
        {platformFilter === "SHOPIFY" && "Shopify"}
        {platformFilter === "EBAY" && "eBay"}
      </span>
      <span className="transition-transform group-open:rotate-180">▼</span>
    </summary>

    {/* Dropdown Menu Items with rounded styling */}
    <div className="absolute left-0 right-0 mt-2 z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg p-1 space-y-1">
      <button
        type="button"
        onClick={() => {
          setPlatformFilter("ALL");
          // Close details element trick
          (document.activeElement as HTMLElement)?.blur();
        }}
        className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors ${
          platformFilter === "ALL" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-700 hover:bg-slate-50 cursor:pointer"
        }`}
      >
        All Platforms
      </button>

      <button
        type="button"
        onClick={() => {
          setPlatformFilter("SHOPIFY");
          (document.activeElement as HTMLElement)?.blur();
        }}
        className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors ${
          platformFilter === "SHOPIFY" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-700 hover:bg-slate-50 cursor:pointer"
        }`}
      >
        Shopify
      </button>

      <button
        type="button"
        onClick={() => {
          setPlatformFilter("EBAY");
          (document.activeElement as HTMLElement)?.blur();
        }}
        className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors ${
          platformFilter === "EBAY" ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-slate-700 hover:bg-slate-50 cursor:pointer"
        }`}
      >
        eBay
      </button>
    </div>
  </details>
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
        initialPlatform={initialPlatform}
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