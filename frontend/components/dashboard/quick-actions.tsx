import Link from "next/link";
import {
  Link2,
  Package,
  RefreshCw,
  Upload,
} from "lucide-react";

const actions = [
  {
    title: "Add Integration",
    href: "/integrations",
    icon: Link2,
  },
  {
    title: "Import CSV",
    href: "/csv-import",
    icon: Upload,
  },
  {
    title: "Add Product",
    href: "/products",
    icon: Package,
  },
  {
    title: "Sync All",
    href: "/sync-queue",
    icon: RefreshCw,
  },
];

export default function QuickActions() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.title}
              href={action.href}
              className="rounded-xl border p-5 transition hover:bg-slate-50"
            >
              <Icon className="mb-3 h-8 w-8 text-indigo-600" />

              <p className="font-medium">
                {action.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}