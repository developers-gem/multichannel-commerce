import {
  LayoutDashboard,
  Link2,
  Package,
  GitCompare,
  FileSpreadsheet,
  RefreshCw,
  Settings,
  LogOut,
} from "lucide-react";

export const sidebarItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Integrations",
    href: "/integrations",
    icon: Link2,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "Product Mappings",
    href: "/product-mappings",
    icon: GitCompare,
  },
  {
    title: "CSV Import",
    href: "/csv-import",
    icon: FileSpreadsheet,
  },
  {
    title: "Sync Queue",
    href: "/sync-queue",
    icon: RefreshCw,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export const logoutItem = {
  title: "Logout",
  href: "/login",
  icon: LogOut,
};