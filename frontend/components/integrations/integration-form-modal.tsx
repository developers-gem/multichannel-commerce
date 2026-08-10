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
import { Integration, PlatformType } from "@/types/integration";
import { useCreateIntegration, useUpdateIntegration } from "@/hooks/use-integrations";

const integrationSchema = z.object({
  platform: z.enum(["SHOPIFY", "EBAY", "CUSTOM_WEBSITE"] as const),
  storeName: z.string().min(2, "Store name must be at least 2 characters"),
  storeUrl: z.string().min(3, "Store URL or Base URL is required"),

  // Platform-specific credentials
  accessToken: z.string().optional(),
  apiKey: z.string().optional(),

  // eBay Policy IDs & Details
  marketplaceId: z.string().optional(),
  currency: z.string().optional(),
  fulfillmentPolicyId: z.string().optional(),
  paymentPolicyId: z.string().optional(),
  returnPolicyId: z.string().optional(),
  merchantLocationKey: z.string().optional(),

  isActive: z.boolean(),
});

type IntegrationFormValues = z.infer<typeof integrationSchema>;

interface IntegrationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Integration | null;
}

export default function IntegrationFormModal({
  isOpen,
  onClose,
  initialData,
}: IntegrationFormModalProps) {
  const isEditing = Boolean(initialData);

  const createMutation = useCreateIntegration();
  const updateMutation = useUpdateIntegration();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IntegrationFormValues>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      platform: "SHOPIFY",
      storeName: "",
      storeUrl: "",
      accessToken: "",
      apiKey: "",
      marketplaceId: "EBAY_US",
      currency: "USD",
      fulfillmentPolicyId: "",
      paymentPolicyId: "",
      returnPolicyId: "",
      merchantLocationKey: "DEFAULT",
      isActive: true,
    },
  });

  const selectedPlatform = watch("platform");

  useEffect(() => {
    if (initialData) {
      reset({
        platform: (initialData.platform as PlatformType) || "SHOPIFY",
        storeName: initialData.storeName || "",
        storeUrl: initialData.storeUrl || "",
        accessToken: "",
        apiKey: "",
        marketplaceId: "EBAY_US",
        currency: "USD",
        fulfillmentPolicyId: "",
        paymentPolicyId: "",
        returnPolicyId: "",
        merchantLocationKey: "DEFAULT",
        isActive: initialData.isActive ?? true,
      });
    } else {
      reset({
        platform: "SHOPIFY",
        storeName: "",
        storeUrl: "",
        accessToken: "",
        apiKey: "",
        marketplaceId: "EBAY_US",
        currency: "USD",
        fulfillmentPolicyId: "",
        paymentPolicyId: "",
        returnPolicyId: "",
        merchantLocationKey: "DEFAULT",
        isActive: true,
      });
    }
  }, [initialData, reset, isOpen]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: IntegrationFormValues) => {
    // Normalize URL format
    let cleanUrl = values.storeUrl.trim();
    if (values.platform === "SHOPIFY") {
      cleanUrl = cleanUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    }

    const credentialsObj: Record<string, unknown> = {};

    if (values.platform === "SHOPIFY") {
      if (values.accessToken) {
        credentialsObj.accessToken = values.accessToken.trim();
      }
    } else if (values.platform === "EBAY") {
      if (values.accessToken) credentialsObj.accessToken = values.accessToken.trim();
      credentialsObj.marketplaceId = values.marketplaceId || "EBAY_US";
      credentialsObj.currency = values.currency || "USD";
      if (values.fulfillmentPolicyId) credentialsObj.fulfillmentPolicyId = values.fulfillmentPolicyId.trim();
      if (values.paymentPolicyId) credentialsObj.paymentPolicyId = values.paymentPolicyId.trim();
      if (values.returnPolicyId) credentialsObj.returnPolicyId = values.returnPolicyId.trim();
      credentialsObj.merchantLocationKey = values.merchantLocationKey || "DEFAULT";
    } else if (values.platform === "CUSTOM_WEBSITE") {
      credentialsObj.baseUrl = cleanUrl;
      if (values.apiKey) credentialsObj.apiKey = values.apiKey.trim();
    }

    if (isEditing && initialData) {
      updateMutation.mutate(
        {
          id: initialData._id,
          payload: {
            platform: values.platform as PlatformType,
            storeName: values.storeName,
            storeUrl: cleanUrl,
            ...(Object.keys(credentialsObj).length > 0 ? { credentials: credentialsObj } : {}),
            isActive: values.isActive,
          },
        },
        {
          onSuccess: () => {
            toast.success("Integration updated successfully");
            onClose();
          },
          onError: (error: Error) => {
            toast.error(error.message || "Failed to update integration");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          platform: values.platform as PlatformType,
          storeName: values.storeName,
          storeUrl: cleanUrl,
          credentials: credentialsObj,
        },
        {
          onSuccess: () => {
            toast.success("Integration connected successfully");
            onClose();
          },
          onError: (error: Error) => {
            toast.error(error.message || "Failed to connect integration");
          },
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? "Edit Integration Channel" : "Connect Store Channel"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {/* Platform */}
          <div>
            <Label htmlFor="platform">Sales Channel Platform</Label>
            <select
              id="platform"
              disabled={isEditing}
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60"
              {...register("platform")}
            >
              <option value="SHOPIFY">Shopify</option>
              <option value="EBAY">eBay</option>
              <option value="CUSTOM_WEBSITE">Custom Website</option>
            </select>
          </div>

          {/* Store Name */}
          <div>
            <Label htmlFor="storeName">Store / Account Name</Label>
            <Input
              id="storeName"
              placeholder="e.g. Shopify Store A"
              {...register("storeName")}
            />
            {errors.storeName && (
              <p className="mt-1 text-xs text-red-500">{errors.storeName.message}</p>
            )}
          </div>

          {/* Store URL */}
          <div>
            <Label htmlFor="storeUrl">
              {selectedPlatform === "SHOPIFY"
                ? "Store Domain (e.g. store.myshopify.com)"
                : selectedPlatform === "CUSTOM_WEBSITE"
                ? "Base API URL (e.g. https://mycustomsite.com)"
                : "Store / Seller Profile URL"}
            </Label>
            <Input
              id="storeUrl"
              placeholder={
                selectedPlatform === "SHOPIFY"
                  ? "my-store.myshopify.com"
                  : selectedPlatform === "CUSTOM_WEBSITE"
                  ? "https://mycustomsite.com"
                  : "https://ebay.com/usr/seller-account"
              }
              {...register("storeUrl")}
            />
            {errors.storeUrl && (
              <p className="mt-1 text-xs text-red-500">{errors.storeUrl.message}</p>
            )}
          </div>

          {/* Shopify Credential Form */}
          {selectedPlatform === "SHOPIFY" && (
            <div>
              <Label htmlFor="accessToken">Admin GraphQL Access Token</Label>
              <Input
                id="accessToken"
                type="password"
                placeholder={isEditing ? "Leave blank to keep existing access token" : "shpat_xxxxxxxxxxxxxxxx"}
                {...register("accessToken")}
              />
              <p className="mt-1 text-xs text-slate-500">
                Sensitive Admin API access token for Shopify Admin GraphQL API.
              </p>
            </div>
          )}

          {/* eBay Credential Form */}
          {selectedPlatform === "EBAY" && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                eBay Seller API Configuration
              </h4>

              <div>
                <Label htmlFor="accessToken">OAuth Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder={isEditing ? "Leave blank to keep existing OAuth token" : "v^1.1#ebay_oauth_token..."}
                  {...register("accessToken")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="marketplaceId">Marketplace ID</Label>
                  <Input id="marketplaceId" placeholder="EBAY_US" {...register("marketplaceId")} />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" placeholder="USD" {...register("currency")} />
                </div>
              </div>

              <div>
                <Label htmlFor="fulfillmentPolicyId">Fulfillment Policy ID</Label>
                <Input id="fulfillmentPolicyId" placeholder="POL-123456" {...register("fulfillmentPolicyId")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="paymentPolicyId">Payment Policy ID</Label>
                  <Input id="paymentPolicyId" placeholder="PAY-123456" {...register("paymentPolicyId")} />
                </div>
                <div>
                  <Label htmlFor="returnPolicyId">Return Policy ID</Label>
                  <Input id="returnPolicyId" placeholder="RET-123456" {...register("returnPolicyId")} />
                </div>
              </div>
            </div>
          )}

          {/* Custom Website Credential Form */}
          {selectedPlatform === "CUSTOM_WEBSITE" && (
            <div className="pt-2 border-t space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Custom Website Authentication
              </h4>
              <div>
                <Label htmlFor="apiKey">API Key / Access Token</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={isEditing ? "Leave blank to keep existing key" : "KEY_xxxxxxxxxxxxxxxx"}
                  {...register("apiKey")}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Sent as X-API-Key and Authorization Bearer headers for custom REST sync API.
                </p>
              </div>
            </div>
          )}

          {/* Active Checkbox */}
          {isEditing && (
            <div className="flex items-center gap-3 pt-2">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                {...register("isActive")}
              />
              <Label htmlFor="isActive" className="cursor-pointer font-medium">
                Channel Active / Connected
              </Label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : isEditing ? (
                "Update Channel"
              ) : (
                "Connect Store"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
