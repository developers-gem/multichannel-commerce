import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "bg-indigo-100 text-indigo-600",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>

          <h2 className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}