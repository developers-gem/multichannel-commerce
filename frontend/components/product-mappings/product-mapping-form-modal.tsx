"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductMapping } from "@/types/product-mapping";
import { useCreateProductMapping, useUpdateProductMapping } from "@/hooks/use-product-mappings";
import { useProducts } from "@/hooks/use-products";
import { useIntegrations } from "@/hooks/use-integrations";

const productMappingSchema = z.object({
  productId: z.string().min(1, "Master Product is required"),
  integrationId: z.string().min(1, "Integration Store is required"),
  externalProductId: z.string().min(1, "External Product ID is required"),
  externalVariantId: z.string().optional(),
  externalSku: z.string().optional(),
  isActive: z.boolean(),
});

type ProductMappingFormValues = z.infer<typeof productMappingSchema>;

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductMappingFormValues>({
    resolver: zodResolver(productMappingSchema),
    defaultValues: {
      productId: "",
      integrationId: "",
      externalProductId: "",
      externalVariantId: "",
      externalSku: "",
      isActive: true,
    },
  });

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
        isActive: initialData.isActive ?? true,
      });
    } else {
      reset({
        productId: "",
        integrationId: "",
        externalProductId: "",
        externalVariantId: "",
        externalSku: "",
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: ProductMappingFormValues) => {
    if (isEditing && initialData) {
      updateMutation.mutate(
        {
          id: initialData._id,
          payload: {
            externalProductId: values.externalProductId,
            externalVariantId: values.externalVariantId,
            externalSku: values.externalSku,
            isActive: values.isActive,
          },
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
          externalProductId: values.externalProductId,
          externalVariantId: values.externalVariantId,
          externalSku: values.externalSku,
          isActive: values.isActive,
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
            {isEditing ? "Edit Product Mapping" : "Add Product Mapping"}
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

          {/* External Product ID */}
          <div>
            <Label htmlFor="externalProductId">External Product ID</Label>
            <Input
              id="externalProductId"
              placeholder="e.g. 7849201934 or PROD-998"
              {...register("externalProductId")}
            />
            {errors.externalProductId && (
              <p className="mt-1 text-xs text-red-500">
                {errors.externalProductId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* External Variant ID */}
            <div>
              <Label htmlFor="externalVariantId">External Variant ID (Optional)</Label>
              <Input
                id="externalVariantId"
                placeholder="e.g. 439019283"
                {...register("externalVariantId")}
              />
            </div>

            {/* External SKU */}
            <div>
              <Label htmlFor="externalSku">External SKU (Optional)</Label>
              <Input
                id="externalSku"
                placeholder="e.g. SHOPIFY-SKU-01"
                {...register("externalSku")}
              />
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
                "Update Mapping"
              ) : (
                "Create Mapping"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
