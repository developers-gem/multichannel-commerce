"use client";

import { CheckCircle2, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { CsvImportSummary } from "@/types/csv-import";

interface CsvImportSummaryProps {
  summary: CsvImportSummary;
}

export default function CsvImportSummaryView({ summary }: CsvImportSummaryProps) {
  const cards = [
    {
      title: "Total Rows",
      value: summary.totalRows,
      icon: FileText,
      color: "bg-slate-50 text-slate-700 border-slate-200",
      iconBg: "bg-slate-100 text-slate-600",
    },
    {
      title: "Created",
      value: summary.created,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Updated",
      value: summary.updated,
      icon: RefreshCw,
      color: "bg-blue-50 text-blue-800 border-blue-200",
      iconBg: "bg-blue-100 text-blue-700",
    },
    {
      title: "Failed",
      value: summary.failed,
      icon: AlertCircle,
      color: summary.failed > 0
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-slate-50 text-slate-600 border-slate-200",
      iconBg: summary.failed > 0
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-md font-bold text-slate-800">Import Summary</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className={`flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm transition-all ${card.color}`}
            >
              <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-75">
                  {card.title}
                </p>
                <p className="text-2xl font-black">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
