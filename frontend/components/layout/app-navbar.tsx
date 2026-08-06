"use client";

import { Bell, Menu, Moon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function AppNavbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b bg-white px-6">
      {/* Left */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <Input
            placeholder="Search..."
            className="w-80 pl-10"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Theme */}
        <Button
          variant="ghost"
          size="icon"
        >
          <Moon className="h-5 w-5" />
        </Button>

        {/* Notification */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* User */}
        <div className="flex items-center gap-3 rounded-xl border bg-slate-50 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "A"}
          </div>

          <div className="hidden md:block">
            <p className="text-sm font-semibold">
              {user?.name ?? "Admin"}
            </p>

            <p className="text-xs text-slate-500">
              {user?.email ?? "admin@multichannel.com"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}