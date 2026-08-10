"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes } from "lucide-react";
import { sidebarItems, logoutItem } from "@/constants/sidebar";
import { cn } from "@/lib/utils";



export default function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const logout = useAuthStore((state) => state.logout);

    const handleLogout = () => {
        logout();

        localStorage.removeItem("token");

        router.replace("/login");
    };
    return (
        <aside className="hidden h-screen w-72 shrink-0 border-r bg-white lg:flex lg:flex-col">
            {/* Logo */}
            <div className="flex h-20 items-center gap-3 border-b px-6">
                <div className="rounded-xl bg-indigo-600 p-3 text-white">
                    <Boxes className="h-6 w-6" />
                </div>

                <div>
                    <h1 className="text-lg font-bold text-slate-900">
                        MultiChannel
                    </h1>

                    <p className="text-xs text-slate-500">
                        Commerce Platform
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 p-4">
                {sidebarItems.map((item) => {
                    const Icon = item.icon;

                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-indigo-600 text-white shadow-lg"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            <Icon className="h-5 w-5" />

                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            {/* Footer */}
            <div className="border-t p-4">
                <div className="mb-4 rounded-xl bg-slate-100 p-4">
                    <p className="font-semibold text-slate-800">
                        Admin
                    </p>

                    <p className="text-sm text-slate-500">
                        admin@multichannel.com
                    </p>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                    <logoutItem.icon className="h-5 w-5" />

                    {logoutItem.title}
                </button>
            </div>
        </aside>
    );
}