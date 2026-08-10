"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CsvRowError } from "@/types/csv-import";

interface CsvImportErrorsProps {
  errors: CsvRowError[];
}

export default function CsvImportErrorsTable({ errors }: CsvImportErrorsProps) {
  if (!errors || errors.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 shadow-sm">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <p className="text-sm font-medium">
          All rows were processed successfully without any validation or import errors!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-md font-bold text-slate-900">
          Row-Level Error Report ({errors.length} {errors.length === 1 ? "Error" : "Errors"})
        </h3>
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="min-w-[650px] w-full text-left text-sm text-slate-600">
          <thead className="bg-red-50/70 text-xs uppercase font-semibold text-red-700 border-b border-red-100">
            <tr>
              <th className="px-6 py-3.5 w-24">Row</th>
              <th className="px-6 py-3.5 w-48">SKU</th>
              <th className="px-6 py-3.5">Error Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errors.map((err, index) => (
              <tr key={index} className="hover:bg-red-50/30 transition-colors">
                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-700">
                  {err.row}
                </td>
                <td className="px-6 py-3.5 font-mono text-xs font-bold text-slate-900">
                  {err.sku || "--"}
                </td>
                <td className="px-6 py-3.5 text-xs text-red-600 font-medium">
                  {err.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
