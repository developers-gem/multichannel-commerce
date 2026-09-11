"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Package,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CsvImportSummary } from "@/types/csv-import";
import { useUploadCsv } from "@/hooks/use-csv-import";
import { downloadSampleCsv } from "@/services/csv-import.service";
import CsvUpload from "@/components/csv-import/csv-upload";
import CsvImportSummaryView from "@/components/csv-import/csv-import-summary";
import CsvImportErrorsTable from "@/components/csv-import/csv-import-errors";

export default function CsvImportPage() {
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null);
  const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<number>(0);
  const uploadMutation = useUploadCsv();
  const router = useRouter();

  const handleUploadFile = (file: File) => {
    setImportSummary(null);
    setLastUploadedFile(file.name);

    uploadMutation.mutate(file, {
      onSuccess: (response) => {
        const summary = response.data;
        setImportSummary(summary);

        if (summary.failed === 0) {
          toast.success(
            `Import completed! Created ${summary.created.toLocaleString()}, Updated ${summary.updated.toLocaleString()} products.`
          );
        } else {
          toast.warning(
            `Import completed with ${summary.failed.toLocaleString()} errors. Created ${summary.created.toLocaleString()}, Updated ${summary.updated.toLocaleString()}.`
          );
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to upload and import CSV file");
      },
    });
  };

  const handleResetImport = () => {
    setImportSummary(null);
    setLastUploadedFile(null);
    setUploadKey((prev) => prev + 1);
  };

  const handleViewProducts = () => {
    router.push("/products");
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">CSV Import</h1>
        <p className="mt-1 text-slate-500">
          Bulk create or update Master Products using a CSV file.
        </p>
      </div>

      {/* Conceptual Master Product Workflow Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs sm:text-sm text-indigo-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold">Master Product Catalog Workflow</p>
            <p className="text-indigo-800/80 text-xs mt-0.5">
              CSV data updates your central Master Products. Once imported, connect them to your sales channels (Shopify, eBay, Custom Website) under Product Mappings to sync live catalog updates.
            </p>
          </div>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <CsvUpload
          key={uploadKey}
          onUpload={handleUploadFile}
          onDownloadSample={downloadSampleCsv}
          isLoading={uploadMutation.isPending}
        />
      </div>

      {/* Import Result Section */}
      {importSummary && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
            {/* Status Header Banner */}
            <div
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border p-5 ${
                importSummary.failed === 0
                  ? "border-emerald-200 bg-emerald-50/60 text-emerald-950"
                  : "border-amber-200 bg-amber-50/60 text-amber-950"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`rounded-xl p-2.5 shrink-0 ${
                    importSummary.failed === 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {importSummary.failed === 0 ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {importSummary.failed === 0
                      ? "Import Completed Successfully"
                      : "Import Completed with Errors"}
                  </h3>
                  <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                    {importSummary.totalRows.toLocaleString()} rows processed:{" "}
                    <span className="font-semibold">{importSummary.updated.toLocaleString()} products updated</span>,{" "}
                    <span className="font-semibold">{importSummary.created.toLocaleString()} products created</span>
                    {importSummary.failed > 0 && (
                      <>, <span className="font-semibold text-red-700">{importSummary.failed.toLocaleString()} failed</span></>
                    )}.
                  </p>
                  {lastUploadedFile && (
                    <p className="text-xs opacity-75 mt-1 font-mono">
                      File: {lastUploadedFile}
                    </p>
                  )}
                </div>
              </div>

              {/* Next Actions */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
                <Button
                  onClick={handleViewProducts}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
                >
                  <Package className="mr-2 h-4 w-4" />
                  View Master Products
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetImport}
                  className="w-full sm:w-auto text-slate-700 border-slate-300 hover:bg-slate-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Import Another CSV
                </Button>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <CsvImportSummaryView summary={importSummary} />

            {/* Detailed Row Errors Table */}
            <CsvImportErrorsTable errors={importSummary.errors} />
          </div>
        </div>
      )}
    </div>
  );
}
