import AppNavbar from "@/components/layout/app-navbar";
import AppSidebar from "@/components/layout/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <AppSidebar />

      <div className="flex flex-1 flex-col">
        <AppNavbar />

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}