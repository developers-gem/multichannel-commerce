import {
  ShoppingBag,
  Store,
  BarChart3,
  Boxes,
  Truck,
} from "lucide-react";

export default function MarketplaceShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 lg:flex">
      {/* Background Blur */}
      <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="relative flex w-full flex-col justify-between p-14 text-white">
        {/* Logo */}
        <div>
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-3">
              <Boxes className="h-7 w-7" />
            </div>

            <div>
              <h2 className="text-3xl font-bold">
                MultiChannel Commerce
              </h2>

              <p className="text-sm text-slate-300">
                Commerce Management Platform
              </p>
            </div>
          </div>

          <h1 className="max-w-xl text-5xl font-bold leading-tight">
            Manage all your channels from one platform.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Connect marketplaces, synchronize inventory,
            process orders and manage products effortlessly.
          </p>
        </div>

        {/* Marketplace Icons */}
        <div className="flex items-center justify-center py-16">
          <div className="relative flex h-72 w-72 items-center justify-center rounded-full border border-indigo-400/20">

            <div className="rounded-3xl bg-white/10 p-8 backdrop-blur">
              <BarChart3 className="h-16 w-16 text-white" />
            </div>

            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-2xl bg-white p-4 shadow-xl">
              <ShoppingBag className="h-8 w-8 text-orange-500" />
            </div>

            <div className="absolute bottom-0 left-0 rounded-2xl bg-white p-4 shadow-xl">
              <Store className="h-8 w-8 text-green-600" />
            </div>

            <div className="absolute bottom-0 right-0 rounded-2xl bg-white p-4 shadow-xl">
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur">
          <p className="text-slate-200">
            "MultiChannel Commerce reduced our order
            management time by 60%."
          </p>

          <div className="mt-5">
            <h4 className="font-semibold">John Smith</h4>
            <p className="text-sm text-slate-400">
              CEO • Fashion Store
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}