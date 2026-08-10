import AppNavbar from "@/components/layout/app-navbar";
import AppSidebar from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100 overflow-x-hidden">
      <AppSidebar />

      <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
        <AppNavbar />

        <main className="flex-1 p-6 min-w-0 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}