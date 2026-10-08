"use client";

import {
    Boxes,
    Package,
    RefreshCw,
    Link2,
} from "lucide-react";

import StatCard from "@/components/dashboard/stat-card";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import IntegrationStatus from "@/components/dashboard/integration-status";
import { useIntegrations } from "@/hooks/use-integrations";
import { useSyncDashboardSummary, useSyncLogs } from "@/hooks/use-sync";
import { formatDistanceToNow } from "date-fns";


export default function DashboardPage() {

        const { data: integrationsResponse } = useIntegrations();
        const { data: summaryResponse } = useSyncDashboardSummary();
        const { data: latestSyncResponse } = useSyncLogs({ limit: 1, status: "COMPLETED" });

        const marketplaceIntegrations = (integrationsResponse?.data || []).filter(
                (integration) => integration.platform === "SHOPIFY" || integration.platform === "EBAY"
        );
        const activeIntegrations = marketplaceIntegrations.filter((integration) => integration.isActive).length;
        const summary = summaryResponse?.data?.summaryMetrics;
        const latestSync = latestSyncResponse?.data?.logs?.[0];
        const lastSyncDate = latestSync?.completedAt || latestSync?.updatedAt || latestSync?.createdAt;
        const lastSync = lastSyncDate
                ? formatDistanceToNow(new Date(lastSyncDate), { addSuffix: true })
                : "--";
        const pendingSync = (summary?.pendingSyncJobs ?? 0) + (summary?.processingSyncJobs ?? 0);


    return (
        <div className="space-y-8">
            {/* Header */}

            <div>
                <h1 className="text-3xl font-bold">
                    Dashboard
                </h1>

                <p className="mt-2 text-slate-500">
                    Welcome back 👋
                </p>
            </div>

            {/* Cards */}

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    title="Connected Channels"
                    value={activeIntegrations}
                    subtitle="Shopify and eBay"
                    icon={Link2}
                    color="bg-blue-100 text-blue-600"
                />

                <StatCard
                    title="Master Products"
                    value={summary?.totalMasterProducts ?? "--"}
                    subtitle="In catalog"
                    icon={Package}
                    color="bg-green-100 text-green-600"
                />

                <StatCard
                    title="Pending Sync"
                    value={pendingSync}
                    subtitle={`${summary?.pendingSyncJobs ?? 0} pending · ${summary?.processingSyncJobs ?? 0} processing`}
                    icon={RefreshCw}
                    color="bg-orange-100 text-orange-600"
                />

                <StatCard
                    title="Last Sync"
                    value={lastSync}
                    subtitle="Latest Integration"
                    icon={Boxes}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            {/* Widgets */}

           <div className="grid gap-6 lg:grid-cols-2">
  <IntegrationStatus />

  <div className="space-y-6">
    <RecentActivity />
    <QuickActions />
  </div>
</div>
        </div>
    );
}