"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChannelListing, ProductMapping } from "@/types/product-mapping";
import { useCreateProductMapping, useUpdateProductMapping } from "@/hooks/use-product-mappings";
import { getChannelListings } from "@/services/product-mapping.service";
import { useProducts } from "@/hooks/use-products";
import { useIntegrations } from "@/hooks/use-integrations";

const productMappingSchema = z.object({
  productId: z.string().min(1, "Master Product is required"),
  integrationId: z.string().min(1, "Integration Store is required"),
  externalProductId: z.string().optional(),
  externalVariantId: z.string().optional(),
  externalSku: z.string().optional(),
  channelPrice: z.string().optional(),
  channelQuantity: z.string().optional(),
  channelCurrency: z.string().optional(),
  channelCategoryId: z.string().optional(),
  channelCategoryName: z.string().optional(),
  categoryQuery: z.string().optional(),
  isActive: z.boolean(),
});

type ProductMappingFormValues = z.infer<typeof productMappingSchema>;

function listingKey(listing: ChannelListing): string {
  return `${listing.externalProductId}::${listing.externalVariantId || ""}`;
}

interface ProductMappingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ProductMapping | null;
}

export default function ProductMappingFormModal({
  isOpen,
  onClose,
  initialData,
}: ProductMappingFormModalProps) {
  const isEditing = Boolean(initialData);

  const createMutation = useCreateProductMapping();
  const updateMutation = useUpdateProductMapping();

  const { data: productsData, isLoading: isLoadingProducts } = useProducts(1, 100);
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useIntegrations();

  const activeIntegrations =
    integrationsData?.data.filter((item) => item.isActive) || [];

  const [listings, setListings] = useState<ChannelListing[]>([]);
  const [listingQuery, setListingQuery] = useState("");
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState("");
  const [selectedListingKey, setSelectedListingKey] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductMappingFormValues>({
    resolver: zodResolver(productMappingSchema),
    defaultValues: {
      productId: "",
      integrationId: "",
      externalProductId: "",
      externalVariantId: "",
      externalSku: "",
      channelPrice: "",
      channelQuantity: "",
      channelCurrency: "",
      channelCategoryId: "",
      channelCategoryName: "",
      categoryQuery: "",
      isActive: true,
    },
  });

  const integrationId = watch("integrationId");

  useEffect(() => {
    if (initialData) {
      const prodId =
        typeof initialData.productId === "object"
          ? initialData.productId._id
          : initialData.productId;
      const intId =
        typeof initialData.integrationId === "object"
          ? initialData.integrationId._id
          : initialData.integrationId;

      reset({
        productId: prodId || "",
        integrationId: intId || "",
        externalProductId: initialData.externalProductId || "",
        externalVariantId: initialData.externalVariantId || "",
        externalSku: initialData.externalSku || "",
        channelPrice: initialData.channelPrice !== undefined ? String(initialData.channelPrice) : "",
        channelQuantity: initialData.channelQuantity !== undefined ? String(initialData.channelQuantity) : "",
        channelCurrency: initialData.channelCurrency || "",
        channelCategoryId: initialData.channelCategoryId || "",
        channelCategoryName: initialData.channelCategoryName || "",
        categoryQuery: initialData.channelCategoryName || "",
        isActive: initialData.isActive ?? true,
      });
    } else {
      reset({
        productId: "",
        integrationId: "",
        externalProductId: "",
        externalVariantId: "",
        externalSku: "",
        channelPrice: "",
        channelQuantity: "",
        channelCurrency: "",
        channelCategoryId: "",
        channelCategoryName: "",
        categoryQuery: "",
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  useEffect(() => {
    if (!isOpen || isEditing || !integrationId) {
      setListings([]);
      setListingsError("");
      setListingQuery("");
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    setListingsError("");
    setSelectedListingKey("");
    setListingQuery("");
    getChannelListings(integrationId)
      .then((result) => {
        if (cancelled) return;
        const payload = result.data;
        const nextListings = Array.isArray(payload) ? payload : payload?.listings || [];
        setListings(nextListings);
        if (!Array.isArray(payload) && payload?.message) setListingsError(payload.message);
      })
      .catch((err: unknown) => {
        if (!cancelled) setListingsError(err instanceof Error ? err.message : "Failed to load channel listings");
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [integrationId, isOpen, isEditing]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const listingFields = (values: ProductMappingFormValues) => ({
    externalProductId: values.externalProductId,
    externalVariantId: values.externalVariantId,
    externalSku: values.externalSku || undefined,
    externalInventoryItemId: selectedListing?.externalInventoryItemId || undefined,
    channelPrice: values.channelPrice === "" || values.channelPrice === undefined ? undefined : Number(values.channelPrice),
    channelQuantity: values.channelQuantity === "" || values.channelQuantity === undefined ? undefined : Number(values.channelQuantity),
    channelCurrency: values.channelCurrency || undefined,
    channelCategoryId: values.channelCategoryId || undefined,
    channelCategoryName: values.channelCategoryName || undefined,
    isActive: values.isActive,
  });

  const selectedListing = listings.find((listing) => listingKey(listing) === selectedListingKey);

  const applyListing = (listing: ChannelListing) => {
    setSelectedListingKey(listingKey(listing));
    setValue("externalProductId", listing.externalProductId || "");
    setValue("externalVariantId", listing.externalVariantId || "");
    setValue("externalSku", listing.externalSku || "");
    setValue("channelPrice", listing.channelPrice !== undefined && listing.channelPrice !== null ? String(listing.channelPrice) : "");
    setValue("channelQuantity", listing.channelQuantity !== undefined && listing.channelQuantity !== null ? String(listing.channelQuantity) : "");
    setValue("channelCurrency", listing.channelCurrency || "");
    setValue("channelCategoryId", listing.channelCategoryId || "");
    setValue("channelCategoryName", listing.channelCategoryName || "");
  };

  const onSubmit = (values: ProductMappingFormValues) => {
    if (!isEditing && !values.externalProductId) {
      setListingsError("Select an existing channel listing before connecting it.");
      return;
    }
    if (isEditing && initialData) {
      updateMutation.mutate(
        {
          id: initialData._id,
          payload: listingFields(values),
        },
        {
          onSuccess: () => {
            toast.success("Product mapping updated successfully");
            onClose();
          },
          onError: (error: Error) => {
            toast.error(error.message || "Failed to update product mapping");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          productId: values.productId,
          integrationId: values.integrationId,
          ...listingFields(values),
        },
        {
          onSuccess: () => {
            toast.success("Product mapping created successfully");
            onClose();
          },
          onError: (error: Error) => {
            toast.error(error.message || "Failed to create product mapping");
          },
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? "Edit channel connection" : "Connect Existing Listing"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {/* Master Product Selection */}
          <div>
            <Label htmlFor="productId">
              Master Product {isEditing && <span className="text-xs text-slate-400">(Read-only)</span>}
            </Label>

            {isLoadingProducts ? (
              <div className="mt-1 flex h-10 items-center px-3 text-sm text-slate-400">
                Loading products...
              </div>
            ) : (
              <select
                id="productId"
                disabled={isEditing}
                className={`mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                  isEditing ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""
                }`}
                {...register("productId")}
              >
                <option value="">-- Select Master Product --</option>
                {productsData?.data?.products?.map((prod) => (
                  <option key={prod._id} value={prod._id}>
                    {prod.sku} — {prod.title}
                  </option>
                ))}
              </select>
            )}

            {errors.productId && (
              <p className="mt-1 text-xs text-red-500">{errors.productId.message}</p>
            )}
          </div>

          {/* Integration Store Selection */}
          <div>
            <Label htmlFor="integrationId">
              Integration Channel {isEditing && <span className="text-xs text-slate-400">(Read-only)</span>}
            </Label>

            {isLoadingIntegrations ? (
              <div className="mt-1 flex h-10 items-center px-3 text-sm text-slate-400">
                Loading integrations...
              </div>
            ) : (
              <select
                id="integrationId"
                disabled={isEditing}
                className={`mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                  isEditing ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""
                }`}
                {...register("integrationId")}
              >
                <option value="">-- Select Integration Channel --</option>
                {activeIntegrations.map((store) => (
                  <option key={store._id} value={store._id}>
                    {store.platform} — {store.storeName}
                  </option>
                ))}
              </select>
            )}

            {errors.integrationId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.integrationId.message}
              </p>
            )}
          </div>

          {!isEditing && (
            <div>
              <Label htmlFor="channelListing">Existing Channel Listing</Label>
              <Input
                className="mt-1"
                value={listingQuery}
                onChange={(event) => setListingQuery(event.target.value)}
                placeholder="Search by title, SKU, or external ID"
                disabled={!integrationId || listingsLoading}
              />
              {listingsLoading ? (
                <div className="mt-1 flex h-10 items-center px-3 text-sm text-slate-400">Loading existing listings...</div>
              ) : (
                <select
                  id="channelListing"
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedListingKey}
                  onChange={(event) => {
                    const listing = listings.find((item) => listingKey(item) === event.target.value);
                    if (listing) applyListing(listing);
                  }}
                >
                  <option value="">-- Select an existing channel listing --</option>
                  {listings
                    .filter((listing) => {
                      const query = listingQuery.trim().toLowerCase();
                      if (!query) return true;
                      return [listing.title, listing.externalSku, listing.externalProductId, listing.externalVariantId]
                        .filter(Boolean)
                        .some((value) => String(value).toLowerCase().includes(query));
                    })
                    .map((listing) => (
                    <option key={listingKey(listing)} value={listingKey(listing)}>
                      {listing.title} — {listing.externalSku || listing.externalProductId}
                    </option>
                  ))}
                </select>
              )}
              {listingsError && <p className="mt-1 text-xs text-red-500">{listingsError}</p>}
              {!listingsLoading && integrationId && listings.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">No existing listings found on this channel.</p>
              )}
            </div>
          )}

          {(selectedListing || isEditing) && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 space-y-1">
              <div>Product ID: {watch("externalProductId") || "--"}</div>
              <div>Variant ID: {watch("externalVariantId") || "--"}</div>
              <div>SKU: {watch("externalSku") || "--"}</div>
              <div>Currency: {watch("channelCurrency") || "--"}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="channelPrice">Channel price</Label>
              <Input id="channelPrice" type="number" min="0" step="0.01" {...register("channelPrice")} />
            </div>
            <div>
              <Label htmlFor="channelQuantity">Channel quantity</Label>
              <Input id="channelQuantity" type="number" min="0" step="1" {...register("channelQuantity")} />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3 pt-2">
            <input
              id="isActive"
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              {...register("isActive")}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Enable Sync for this Channel Mapping
            </Label>
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Save"
              ) : (
                "Connect Existing Listing"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
