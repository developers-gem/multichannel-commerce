"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CsvImportSummary } from "@/types/csv-import";
import { useUploadCsv } from "@/hooks/use-csv-import";
import { downloadSampleCsv } from "@/services/csv-import.service";
import CsvUpload from "@/components/csv-import/csv-upload";
import CsvImportSummaryView from "@/components/csv-import/csv-import-summary";
import CsvImportErrorsTable from "@/components/csv-import/csv-import-errors";

export default function CsvImportPage() {
  const [importSummary, setImportSummary] = useState<CsvImportSummary | null>(null);
  const uploadMutation = useUploadCsv();

  const handleUploadFile = (file: File) => {
    setImportSummary(null);

    uploadMutation.mutate(file, {
      onSuccess: (response) => {
        const summary = response.data;
        setImportSummary(summary);

        if (summary.failed === 0) {
          toast.success(
            `Import completed! Created ${summary.created}, Updated ${summary.updated} products.`
          );
        } else {
          toast.warning(
            `Import completed with ${summary.failed} errors. Created ${summary.created}, Updated ${summary.updated}.`
          );
        }
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to upload and import CSV file");
      },
    });
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-6 overflow-x-hidden">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">CSV Import</h1>
        <p className="mt-1 text-slate-500">
          Import or update Master Products using a CSV file.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
        <CsvUpload
          onUpload={handleUploadFile}
          onDownloadSample={downloadSampleCsv}
          isLoading={uploadMutation.isPending}
        />
      </div>

      {/* Import Result Section */}
      {importSummary && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">
            <CsvImportSummaryView summary={importSummary} />
            <CsvImportErrorsTable errors={importSummary.errors} />
          </div>
        </div>
      )}
    </div>
  );
}
