"use client";

import { Loader2 } from "lucide-react";
import { useIntegrations } from "@/hooks/use-integrations";

export default function IntegrationStatus() {
  const { data, isLoading, isError } = useIntegrations();

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-red-500">
          Failed to load integrations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-xl font-semibold">
        Integration Status
      </h2>

      <div className="space-y-4">
        {data?.data.map((integration) => (
          <div
            key={integration._id}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <div>
              <p className="font-semibold">
                {integration.platform}
              </p>

              <p className="text-sm text-slate-500">
                {integration.storeName}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                integration.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {integration.isActive
                ? "Connected"
                : "Disconnected"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}