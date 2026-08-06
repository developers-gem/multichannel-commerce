import {
  CheckCircle2,
  FileSpreadsheet,
  Package,
  RefreshCcw,
} from "lucide-react";

const activities = [
  {
    title: "CSV Uploaded",
    icon: FileSpreadsheet,
  },
  {
    title: "120 Products Updated",
    icon: Package,
  },
  {
    title: "Shopify Sync Completed",
    icon: RefreshCcw,
  },
];

export default function RecentActivity() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {activities.map((activity) => {
          const Icon = activity.icon;

          return (
            <div
              key={activity.title}
              className="flex items-center gap-3"
            >
              <div className="rounded-full bg-green-100 p-2">
                <Icon className="h-4 w-4 text-green-600" />
              </div>

              <span className="text-sm">
                {activity.title}
              </span>

              <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
            </div>
          );
        })}
      </div>
    </div>
  );
}