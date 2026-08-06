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


export default function DashboardPage() {

    const { data } = useIntegrations();

    const totalIntegrations = data?.data.length ?? 0;

    const activeIntegrations =
        data?.data.filter((item) => item.isActive).length ?? 0;

    const lastSync =
        data?.data[0]?.updatedAt
            ? new Date(data.data[0].updatedAt).toLocaleString()
            : "--";


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
                    title="Integrations"
                    value={activeIntegrations}
                    subtitle={`${totalIntegrations} Total`}
                    icon={Link2}
                    color="bg-blue-100 text-blue-600"
                />

                <StatCard
                    title="Products"
                    value={520}
                    subtitle="Active"
                    icon={Package}
                    color="bg-green-100 text-green-600"
                />

                <StatCard
                    title="Pending Sync"
                    value={18}
                    subtitle="Needs Attention"
                    icon={RefreshCw}
                    color="bg-orange-100 text-orange-600"
                />

                <StatCard
                    title="Last Sync"
                    value="5 mins"
                    subtitle="Successful"
                    icon={Boxes}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            {/* Widgets */}

            <div className="grid gap-6 lg:grid-cols-2">
                <RecentActivity />

                <QuickActions />
            </div>
        </div>
    );
}