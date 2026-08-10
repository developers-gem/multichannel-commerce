"use client";

import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ListFilter,
} from "lucide-react";
import { SyncLog } from "@/types/sync";

interface SyncSummaryCardsProps {
  logs: SyncLog[];
  totalFromPagination: number;
}

export default function SyncSummaryCards({
  logs,
  totalFromPagination,
}: SyncSummaryCardsProps) {
  const pendingCount = logs.filter((l) => l.status === "PENDING").length;
  const processingCount = logs.filter((l) => l.status === "PROCESSING").length;
  const completedCount = logs.filter((l) => l.status === "COMPLETED").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  const cards = [
    {
      title: "Total Jobs",
      value: totalFromPagination || logs.length,
      icon: ListFilter,
      color: "bg-slate-50 text-slate-800 border-slate-200",
      iconBg: "bg-slate-100 text-slate-600",
    },
    {
      title: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "bg-amber-50 text-amber-800 border-amber-200",
      iconBg: "bg-amber-100 text-amber-700",
    },
    {
      title: "Processing",
      value: processingCount,
      icon: Loader2,
      iconAnimate: processingCount > 0,
      color: "bg-blue-50 text-blue-800 border-blue-200",
      iconBg: "bg-blue-100 text-blue-700",
    },
    {
      title: "Completed",
      value: completedCount,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Failed",
      value: failedCount,
      icon: AlertTriangle,
      color: failedCount > 0
        ? "bg-red-50 text-red-800 border-red-200"
        : "bg-slate-50 text-slate-600 border-slate-200",
      iconBg: failedCount > 0
        ? "bg-red-100 text-red-700"
        : "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`flex items-center gap-3.5 rounded-2xl border p-4 shadow-sm transition-all ${card.color}`}
          >
            <div className={`rounded-xl p-2.5 ${card.iconBg}`}>
              <Icon
                className={`h-5 w-5 ${card.iconAnimate ? "animate-spin" : ""}`}
              />
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
  );
}
