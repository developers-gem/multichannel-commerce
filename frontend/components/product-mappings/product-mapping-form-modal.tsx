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
import { ProductMapping } from "@/types/product-mapping";
import { useCreateProductMapping, useUpdateProductMapping } from "@/hooks/use-product-mappings";
import { useProducts } from "@/hooks/use-products";
import { useIntegrations } from "@/hooks/use-integrations";

const EMPTY_MAPPINGS: ProductMapping[] = [];

const productMappingSchema = z.object({
  productId: z.string().min(1, "Master Product is required"),
  channelPrice: z.string().optional().refine(
    (value) => !value || (Number.isFinite(Number(value)) && Number(value) >= 0),
    "Enter a valid channel price"
  ),
  channelQuantity: z.string().optional().refine(
    (value) => !value || (Number.isInteger(Number(value)) && Number(value) >= 0),
    "Enter a valid channel quantity"
  ),
  channelCurrency: z.string().optional().refine(
    (value) => !value?.trim() || /^[a-zA-Z]{3}$/.test(value.trim()),
    "Currency must be a 3-letter code"
  ),
  isActive: z.boolean(),
});

type ProductMappingFormValues = z.infer<typeof productMappingSchema>;
type ChannelConfiguration = {
  enabled: boolean;
  channelPrice: string;
  channelQuantity: string;
  channelCurrency: string;
};

interface ProductMappingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: ProductMapping | null;
  defaultProductId?: string;
  defaultIntegrationId?: string;
  existingMappings?: ProductMapping[];
}

function productIdOf(mapping: ProductMapping): string {
  return typeof mapping.productId === "object" ? mapping.productId._id : mapping.productId;
}

function integrationIdOf(mapping: ProductMapping): string {
  return typeof mapping.integrationId === "object" ? mapping.integrationId._id : mapping.integrationId;
}

export default function ProductMappingFormModal({
  isOpen,
  onClose,
  initialData,
  defaultProductId,
  defaultIntegrationId,
  existingMappings = EMPTY_MAPPINGS,
}: ProductMappingFormModalProps) {
  const isEditing = Boolean(initialData);
  const createMutation = useCreateProductMapping();
  const updateMutation = useUpdateProductMapping();

  const { data: productsData, isLoading: isLoadingProducts } = useProducts(1, 100);
  const { data: integrationsData, isLoading: isLoadingIntegrations } = useIntegrations();
  const activeIntegrations = (integrationsData?.data || []).filter(
    (integration) => integration.isActive &&
      (integration.platform === "SHOPIFY" || integration.platform === "EBAY") &&
      (!defaultIntegrationId || integration._id === defaultIntegrationId)
  );
  const activeIntegrationKey = activeIntegrations.map((integration) => integration._id).join("|");

  const masterProduct = initialData && typeof initialData.productId === "object"
    ? initialData.productId
    : productsData?.data?.products.find((product) => product._id === initialData?.productId);
  const channelIntegration = initialData && typeof initialData.integrationId === "object"
    ? initialData.integrationId
    : integrationsData?.data.find((integration) => integration._id === initialData?.integrationId);

  const [channelConfigurations, setChannelConfigurations] = useState<Record<string, ChannelConfiguration>>({});
  const [configurationProductId, setConfigurationProductId] = useState("");
  const [isCreatingMappings, setIsCreatingMappings] = useState(false);

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
      channelPrice: "",
      channelQuantity: "",
      channelCurrency: "",
      isActive: true,
    },
  });

  const selectedProductId = watch("productId");
  const mappingsForProduct = existingMappings.filter((mapping) => productIdOf(mapping) === selectedProductId);
  const existingMappingKey = mappingsForProduct.map(integrationIdOf).sort().join("|");
  const availableIntegrations = activeIntegrations.filter(
    (integration) => !mappingsForProduct.some((mapping) => integrationIdOf(mapping) === integration._id)
  );
  const canAddMapping = availableIntegrations.some((integration) => channelConfigurations[integration._id]?.enabled);

  useEffect(() => {
    if (initialData) {
      const productId = productIdOf(initialData);
      const product = typeof initialData.productId === "object" ? initialData.productId : undefined;
      reset({
        productId,
        channelPrice: String(initialData.channelPrice ?? product?.price ?? ""),
        channelQuantity: String(initialData.channelQuantity ?? product?.quantity ?? ""),
        channelCurrency: initialData.channelCurrency || "",
        isActive: initialData.isActive ?? true,
      });
    } else {
      reset({
        productId: defaultProductId || "",
        channelPrice: "",
        channelQuantity: "",
        channelCurrency: "",
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen, defaultProductId]);

  useEffect(() => {
    if (!isOpen || isEditing || !selectedProductId) {
      setChannelConfigurations({});
      setConfigurationProductId("");
      return;
    }

    const product = productsData?.data?.products.find((item) => item._id === selectedProductId);
    if (!product || isLoadingIntegrations) return;

    setChannelConfigurations((current) => {
      const reuseValues = configurationProductId === selectedProductId;
      return Object.fromEntries(activeIntegrations.map((integration) => {
        const existingMapping = mappingsForProduct.find((mapping) => integrationIdOf(mapping) === integration._id);
        const previous = reuseValues ? current[integration._id] : undefined;
        return [integration._id, {
          enabled: !existingMapping && (previous?.enabled ?? true),
          channelPrice: previous?.channelPrice ?? String(existingMapping?.channelPrice ?? product.price),
          channelQuantity: previous?.channelQuantity ?? String(existingMapping?.channelQuantity ?? product.quantity),
          channelCurrency: previous?.channelCurrency ?? existingMapping?.channelCurrency ?? product.currency ?? "",
        }];
      }));
    });
    setConfigurationProductId(selectedProductId);
  }, [
    isOpen,
    isEditing,
    isLoadingIntegrations,
    selectedProductId,
    productsData,
    activeIntegrationKey,
    existingMappingKey,
  ]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending || isCreatingMappings;
  const updateChannelConfiguration = (integrationId: string, patch: Partial<ChannelConfiguration>) => {
    setChannelConfigurations((current) => ({
      ...current,
      [integrationId]: { ...current[integrationId], ...patch },
    }));
  };

  const onSubmit = async (values: ProductMappingFormValues) => {
    if (isEditing && initialData) {
      if (!values.channelPrice?.trim() || !values.channelQuantity?.trim()) {
        toast.error("Channel price and quantity are required.");
        return;
      }
      updateMutation.mutate(
        {
          id: initialData._id,
          payload: {
            channelPrice: Number(values.channelPrice),
            channelQuantity: Number(values.channelQuantity),
            channelCurrency: values.channelCurrency?.trim().toUpperCase() || undefined,
            isActive: values.isActive,
          },
        },
        {
          onSuccess: () => {
            toast.success("Product mapping updated successfully");
            onClose();
          },
          onError: (error: Error) => toast.error(error.message || "Failed to update product mapping"),
        }
      );
      return;
    }

    const configuredIntegrations = activeIntegrations.filter((integration) => {
      const config = channelConfigurations[integration._id];
      return config?.enabled && !mappingsForProduct.some((mapping) => integrationIdOf(mapping) === integration._id);
    });

    if (!configuredIntegrations.length) {
      toast.error("Enable at least one connected channel to add a mapping.");
      return;
    }

    const invalidIntegration = configuredIntegrations.find((integration) => {
      const config = channelConfigurations[integration._id];
      const price = Number(config.channelPrice);
      const quantity = Number(config.channelQuantity);
      const currencyValid = !config.channelCurrency.trim() || /^[a-zA-Z]{3}$/.test(config.channelCurrency.trim());
      return !config.channelPrice.trim() || !Number.isFinite(price) || price < 0 ||
        !config.channelQuantity.trim() || !Number.isInteger(quantity) || quantity < 0 || !currencyValid;
    });

    if (invalidIntegration) {
      toast.error(`Enter valid price, quantity, and currency for ${invalidIntegration.platform}.`);
      return;
    }

    setIsCreatingMappings(true);
    const results = await Promise.allSettled(configuredIntegrations.map((integration) => {
      const config = channelConfigurations[integration._id];
      return createMutation.mutateAsync({
        productId: values.productId,
        integrationId: integration._id,
        channelPrice: Number(config.channelPrice),
        channelQuantity: Number(config.channelQuantity),
        channelCurrency: config.channelCurrency.trim().toUpperCase() || undefined,
        isActive: true,
      });
    }));
    setIsCreatingMappings(false);

    const succeededIntegrationIds = results.flatMap((result, index) =>
      result.status === "fulfilled" ? [configuredIntegrations[index]._id] : []
    );
    const failures = results.filter((result) => result.status === "rejected");
    if (succeededIntegrationIds.length) {
      setChannelConfigurations((current) => Object.fromEntries(
        Object.entries(current).map(([integrationId, config]) => [
          integrationId,
          succeededIntegrationIds.includes(integrationId) ? { ...config, enabled: false } : config,
        ])
      ));
    }
    if (failures.length) {
      const reason = failures[0].reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      toast.error(`${succeededIntegrationIds.length} mapping(s) added; ${failures.length} could not be added. ${message}`);
      return;
    }

    toast.success(`${succeededIntegrationIds.length} product mapping(s) added.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
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
          {isEditing && initialData ? (
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">Master Product</p>
                <p className="font-medium text-slate-900">
                  {masterProduct ? `${masterProduct.title} (${masterProduct.sku})` : initialData.sku}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Sales Channel</p>
                <p className="font-medium text-slate-900">
                  {channelIntegration ? `${channelIntegration.platform} — ${channelIntegration.storeName}` : "Connected store"}
                </p>
              </div>
            </div>
          ) : !defaultProductId ? (
            <div>
              <Label htmlFor="productId">Master Product</Label>
              {isLoadingProducts ? (
                <div className="mt-1 flex h-10 items-center px-3 text-sm text-slate-400">Loading products...</div>
              ) : (
                <select
                  id="productId"
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  {...register("productId")}
                >
                  <option value="">-- Select Master Product --</option>
                  {productsData?.data?.products?.map((product) => (
                    <option key={product._id} value={product._id}>{product.sku} — {product.title}</option>
                  ))}
                </select>
              )}
              {errors.productId && <p className="mt-1 text-xs text-red-500">{errors.productId.message}</p>}
            </div>
          ) : null}

          {isEditing ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="channelPrice">Channel Price</Label>
                  <Input id="channelPrice" type="number" min="0" step="0.01" {...register("channelPrice")} />
                  {errors.channelPrice && <p className="mt-1 text-xs text-red-500">{errors.channelPrice.message}</p>}
                </div>
                <div>
                  <Label htmlFor="channelQuantity">Channel Quantity</Label>
                  <Input id="channelQuantity" type="number" min="0" step="1" {...register("channelQuantity")} />
                  {errors.channelQuantity && <p className="mt-1 text-xs text-red-500">{errors.channelQuantity.message}</p>}
                </div>
                <div>
                  <Label htmlFor="channelCurrency">Currency</Label>
                  <Input id="channelCurrency" maxLength={3} placeholder="USD" {...register("channelCurrency")} />
                  {errors.channelCurrency && <p className="mt-1 text-xs text-red-500">{errors.channelCurrency.message}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  {...register("isActive")}
                />
                <Label htmlFor="isActive" className="cursor-pointer">Enable Sync</Label>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {isLoadingIntegrations ? (
                <div className="py-4 text-sm text-slate-400">Loading connected channels...</div>
              ) : activeIntegrations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                  Connect a Shopify or eBay account before adding product mappings.
                </div>
              ) : !selectedProductId ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                  Select a Master Product to configure its connected channels.
                </div>
              ) : availableIntegrations.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-slate-500">
                  All connected Shopify and eBay channels already have mappings for this Master Product. Edit their values from the Channel Mappings table.
                </div>
              ) : (
                availableIntegrations.map((integration) => {
                  const configuration = channelConfigurations[integration._id];
                  if (!configuration) return null;

                  const channelName = integration.platform === "SHOPIFY" ? "Shopify" : "eBay";
                  return (
                    <section key={integration._id} className="rounded-lg border p-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-slate-900">{integration.platform}</h3>
                        <p className="text-sm text-slate-500">Store: {integration.storeName}</p>
                      </div>
                      <>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`channelPrice-${integration._id}`}>Channel Price</Label>
                              <Input
                                id={`channelPrice-${integration._id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={configuration.channelPrice}
                                onChange={(event) => updateChannelConfiguration(integration._id, { channelPrice: event.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`channelQuantity-${integration._id}`}>Channel Quantity</Label>
                              <Input
                                id={`channelQuantity-${integration._id}`}
                                type="number"
                                min="0"
                                step="1"
                                value={configuration.channelQuantity}
                                onChange={(event) => updateChannelConfiguration(integration._id, { channelQuantity: event.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`channelCurrency-${integration._id}`}>Currency</Label>
                              <Input
                                id={`channelCurrency-${integration._id}`}
                                maxLength={3}
                                placeholder="USD"
                                value={configuration.channelCurrency}
                                onChange={(event) => updateChannelConfiguration(integration._id, { channelCurrency: event.target.value })}
                              />
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3">
                            <input
                              id={`enableSync-${integration._id}`}
                              type="checkbox"
                              checked={configuration.enabled}
                              onChange={(event) => updateChannelConfiguration(integration._id, { enabled: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                            />
                            <Label htmlFor={`enableSync-${integration._id}`} className="cursor-pointer">
                              Enable {channelName} Sync
                            </Label>
                          </div>
                      </>
                    </section>
                  );
                })
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && !canAddMapping)}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isCreatingMappings ? "Adding mappings..." : "Saving..."}
                </>
              ) : isEditing ? (
                "Save Mapping"
              ) : (
                "Add Mapping"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
