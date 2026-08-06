import { ReactNode } from "react";
import MarketplaceShowcase from "./marketplace-showcase";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        <MarketplaceShowcase />

        <section className="flex items-center justify-center p-8 lg:p-14">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}