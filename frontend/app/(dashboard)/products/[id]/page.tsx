"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProduct } from "@/hooks/use-products";
import { useIntegrations } from "@/hooks/use-integrations";
import { useCreateProductMapping, useProductMappings, useUpdateProductMapping } from "@/hooks/use-product-mappings";
import { useTriggerSync } from "@/hooks/use-sync";
import { suggestEbayCategories, EbayCategorySuggestion } from "@/services/integration.service";
import { getChannelListings } from "@/services/product-mapping.service";
import ProductMappingFormModal from "@/components/product-mappings/product-mapping-form-modal";
import ProductPublishModal from "@/components/products/product-publish-modal";
import { ChannelListing, ProductMapping } from "@/types/product-mapping";
import { Integration } from "@/types/integration";
import { Product } from "@/types/product";

function integrationIdOf(mapping: ProductMapping): string {
  return typeof mapping.integrationId === "object" ? mapping.integrationId._id : mapping.integrationId;
}

function listingKey(listing: ChannelListing): string {
  return `${listing.externalProductId}::${listing.externalVariantId || ""}`;
}

function matchesQuery(listing: ChannelListing, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [listing.title, listing.externalSku, listing.externalProductId, listing.externalVariantId]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

function channelLabel(platform: string): string {
  return platform === "EBAY" ? "eBay" : "Shopify";
}

function formatCurrency(value: number, currency?: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const productId = String(params.id || "");
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const { data: productResponse, isLoading, isError, error } = useProduct(productId);
  const { data: integrationsData } = useIntegrations();
  const { data: mappingsData } = useProductMappings(productId);

  const product = productResponse?.data;
  const integrations = (integrationsData?.data || []).filter(
    (item) => item.isActive && (item.platform === "SHOPIFY" || item.platform === "EBAY")
  );
  const mappings = mappingsData?.data || [];

  if (isLoading) {
    return <div className="rounded-2xl border bg-white p-8 text-slate-500">Loading product...</div>;
  }
  if (isError || !product) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        {(error as Error)?.message || "Product not found"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/products" className="text-sm text-indigo-600">Back to products</Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{product.title}</h1>
        <p className="mt-1 text-slate-500">
          Master SKU: {product.sku}
        </p>
      </div>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Master Product</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">Cost</p>
            <p className="font-semibold text-slate-900">
              {product.costPrice !== undefined ? formatCurrency(product.costPrice, product.currency) : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Base Price</p>
            <p className="font-semibold text-slate-900">{formatCurrency(product.price, product.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Master Quantity</p>
            <p className="font-semibold text-slate-900">{product.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Shipping</p>
            <p className="font-semibold text-slate-900">{formatCurrency(product.shippingCharge || 0, product.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <p className="font-semibold text-slate-900">{product.status}</p>
          </div>
        </div>
        {(product.brand || product.category || product.description) && (
          <div className="mt-4 border-t pt-4 text-sm text-slate-600">
            {product.brand && <p>Brand: {product.brand}</p>}
            {product.category && <p>Category: {product.category}</p>}
            {product.description && <p className="mt-2 whitespace-pre-wrap">{product.description}</p>}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h2 className="text-xl font-semibold text-slate-900">Channels</h2>
          <p className="text-sm text-slate-500">
            Publish new listings with channel-specific values, or connect listings that already exist.
          </p>
          </div>
          <Button onClick={() => setIsPublishModalOpen(true)}>
            <span className="mr-2">+</span>
            Publish to Channels
          </Button>
        </div>
        {integrations.length === 0 && (
          <div className="rounded-2xl border bg-white p-5 text-sm text-slate-500">
            Connect a Shopify or eBay store before mapping this product.
          </div>
        )}
        {integrations.map((integration) => (
          <ChannelStoreCard
            key={integration._id}
            product={product}
            integration={integration}
            mapping={mappings.find((item) => integrationIdOf(item) === integration._id)}
          />
        ))}
      </section>
      <ProductPublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        product={product}
      />
    </div>
  );
}

function ChannelStoreCard({
  product,
  integration,
  mapping,
}: {
  product: Product;
  integration: Integration;
  mapping?: ProductMapping;
}) {
  const updateMapping = useUpdateProductMapping();
  const createMapping = useCreateProductMapping();
  const triggerSync = useTriggerSync();
  const [mode, setMode] = useState<"idle" | "connect">("idle");
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [price, setPrice] = useState(mapping?.channelPrice !== undefined ? String(mapping.channelPrice) : "");
  const [quantity, setQuantity] = useState(mapping?.channelQuantity !== undefined ? String(mapping.channelQuantity) : "");
  const [listings, setListings] = useState<ChannelListing[]>([]);
  const [listingsMessage, setListingsMessage] = useState("");
  const [listingsLoading, setListingsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [suggestions, setSuggestions] = useState<EbayCategorySuggestion[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);

  const label = channelLabel(integration.platform);
  const listingNoun = integration.platform === "EBAY" ? "Listing" : "Product";
  const selected = listings.find((listing) => listingKey(listing) === selectedKey);
  const visibleListings = listings.filter((listing) => matchesQuery(listing, query));
  const categoryMissing = integration.platform === "EBAY" && Boolean(mapping) && !mapping?.channelCategoryId;

  const openConnect = async () => {
    setMode("connect");
    setListingsLoading(true);
    setListingsMessage("");
    setSelectedKey("");
    try {
      const result = await getChannelListings(integration._id);
      const payload = result.data;
      const nextListings = Array.isArray(payload) ? payload : payload?.listings || [];
      setListings(nextListings);
      setListingsMessage(!Array.isArray(payload) && payload?.message ? payload.message : "");
    } catch (err: unknown) {
      setListings([]);
      setListingsMessage(err instanceof Error ? err.message : "Failed to load existing listings");
    } finally {
      setListingsLoading(false);
    }
  };

  const chooseListing = (listing: ChannelListing) => {
    setSelectedKey(listingKey(listing));
    setPrice(listing.channelPrice !== undefined && listing.channelPrice !== null ? String(listing.channelPrice) : "");
    setQuantity(listing.channelQuantity !== undefined && listing.channelQuantity !== null ? String(listing.channelQuantity) : "");
  };

  const connectListing = () => {
    if (!selected) return;
    createMapping.mutate(
      {
        productId: product._id,
        integrationId: integration._id,
        externalProductId: selected.externalProductId,
        externalVariantId: selected.externalVariantId || undefined,
        externalInventoryItemId: selected.externalInventoryItemId || undefined,
        externalSku: selected.externalSku || undefined,
        channelPrice: price === "" ? selected.channelPrice : Number(price),
        channelQuantity: quantity === "" ? selected.channelQuantity : Number(quantity),
        channelCurrency: selected.channelCurrency || product.currency || "USD",
        channelCategoryId: selected.channelCategoryId || undefined,
        channelCategoryName: selected.channelCategoryName || undefined,
      },
      {
        onSuccess: () => {
          setMode("idle");
          toast.success(`${label} listing connected. Its price and quantity stay on this store.`);
        },
        onError: (err: Error) => toast.error(err.message || "Failed to connect listing"),
      }
    );
  };

  const syncNow = () => {
    if (!mapping) return;
    triggerSync.mutate(
      { productMappingId: mapping._id, action: "UPDATE" },
      {
        onSuccess: () => toast.success(`Sync queued for ${label}.`),
        onError: (err: Error) => toast.error(err.message || `Failed to sync ${label}`),
      }
    );
  };

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900">{label}</h3>
        <p className="text-sm text-slate-500">Store: {integration.storeName}</p>
      </div>

      {mapping ? (
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            <p className="font-medium">Existing {label} {listingNoun}</p>
            <p className="text-xs text-slate-500">Store: {integration.storeName}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Status</p>
              <p className="font-medium text-slate-900">{mapping.syncStatus || "PENDING"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Channel Price</p>
              <p className="font-medium text-slate-900">
                {mapping.channelPrice !== undefined ? formatCurrency(mapping.channelPrice, mapping.channelCurrency || product.currency) : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Channel Quantity</p>
              <p className="font-medium text-slate-900">{mapping.channelQuantity ?? "--"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Channel SKU</p>
              <p className="font-mono text-sm text-slate-900">{mapping.externalSku || product.sku}</p>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-slate-500">External Listing ID</p>
              <p className="font-mono text-sm text-slate-900">{mapping.externalProductId || "Being created"}</p>
            </div>
          </div>
          {mapping.syncStatus === "FAILED" && (
            <p className="text-sm text-red-600">{mapping.lastSyncError || "Sync failed"}</p>
          )}
          {!mapping.externalProductId && (
            <p className="text-sm text-amber-700">External listing is still being created.</p>
          )}
          {categoryMissing && <p className="text-sm text-amber-700">Action required: eBay category missing</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={syncNow} disabled={triggerSync.isPending || !mapping.externalProductId}>Sync Now</Button>
            <Button variant="outline" onClick={() => setIsMappingModalOpen(true)}>Manage Mapping</Button>
            {categoryMissing && (
              <Button variant="outline" onClick={() => setSetupOpen((open) => !open)}>Complete eBay Setup</Button>
            )}
          </div>
          {setupOpen && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input value={categoryQuery} onChange={(event) => setCategoryQuery(event.target.value)} placeholder="Search eBay categories" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const result = await suggestEbayCategories(categoryQuery || product.title, integration._id);
                      setSuggestions(result.data?.suggestions || []);
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : "Category search failed");
                    }
                  }}
                >
                  Search
                </Button>
              </div>
              {suggestions.length > 0 && (
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  defaultValue=""
                  onChange={(event) => {
                    const chosen = suggestions.find((item) => item.categoryId === event.target.value);
                    if (!chosen || !mapping) return;
                    updateMapping.mutate(
                      { id: mapping._id, payload: { channelCategoryId: chosen.categoryId, channelCategoryName: chosen.categoryName } },
                      {
                        onSuccess: () => {
                          setSetupOpen(false);
                          toast.success(`eBay category set to ${chosen.categoryName}`);
                        },
                        onError: (err: Error) => toast.error(err.message),
                      }
                    );
                  }}
                >
                  <option value="">Select a leaf category</option>
                  {suggestions.map((item) => (
                    <option key={item.categoryId} value={item.categoryId}>{item.categoryPath || item.categoryName}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={openConnect}>Connect Existing {label} {listingNoun}</Button>
            </div>
          )}

          {mode === "connect" && (
            <div className="space-y-3">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, SKU, or external ID" />
              {listingsLoading && <p className="text-sm text-slate-500">Loading existing listings for {integration.storeName}...</p>}
              {listingsMessage && <p className="text-sm text-amber-700">{listingsMessage}</p>}
              {!listingsLoading && listings.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">No existing listings found on this channel.</p>
                </div>
              )}
              {!listingsLoading && visibleListings.length > 0 && (
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={selectedKey}
                  onChange={(event) => {
                    const listing = listings.find((item) => listingKey(item) === event.target.value);
                    if (listing) chooseListing(listing);
                  }}
                >
                  <option value="">Select an existing channel listing</option>
                  {visibleListings.map((listing) => (
                    <option key={listingKey(listing)} value={listingKey(listing)}>
                      {listing.title} — {listing.externalSku || listing.externalProductId}
                    </option>
                  ))}
                </select>
              )}
              {selected && (
                <div className="grid max-w-md grid-cols-2 gap-3">
                  <Input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Channel price" />
                  <Input type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Channel quantity" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={connectListing} disabled={!selected || createMapping.isPending}>Connect</Button>
                <Button variant="outline" onClick={() => setMode("idle")}>Cancel</Button>
              </div>
            </div>
          )}

        </div>
      )}
      {mapping && (
        <ProductMappingFormModal
          isOpen={isMappingModalOpen}
          onClose={() => setIsMappingModalOpen(false)}
          initialData={mapping}
          defaultProductId={product._id}
          defaultIntegrationId={integration._id}
        />
      )}
    </div>
  );
}
