"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product, ProductStatus } from "@/types/product";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-products";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.number().min(0, "Cost must be >= 0").optional(),
  price: z
    .number({ message: "Base price is required" })
    .min(0, "Base price must be >= 0"),
  quantity: z
    .number({ message: "Master quantity is required" })
    .min(0, "Master quantity must be >= 0"),
  shippingCharge: z.number().min(0, "Shipping charge must be >= 0").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"] as const),
  images: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Product | null;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  initialData,
}: ProductFormModalProps) {
  const isEditing = Boolean(initialData);
  const queryClient = useQueryClient();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: "",
      title: "",
      description: "",
      brand: "",
      category: "",
      costPrice: 0,
      price: 0,
      quantity: 0,
      shippingCharge: 0,
      status: "ACTIVE",
      images: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        sku: initialData.sku,
        title: initialData.title,
        description: initialData.description || "",
        brand: initialData.brand || "",
        category: initialData.category || "",
        costPrice: initialData.costPrice ?? 0,
        price: initialData.price,
        quantity: initialData.quantity,
        shippingCharge: initialData.shippingCharge || 0,
        status: initialData.status,
        images: initialData.images?.join(", ") || "",
      });
      return;
    }

    reset({
      sku: "",
      title: "",
      description: "",
      brand: "",
      category: "",
      costPrice: 0,
      price: 0,
      quantity: 0,
      shippingCharge: 0,
      status: "ACTIVE",
      images: "",
    });
  }, [initialData, reset]);

  if (!isOpen) return null;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (values: ProductFormValues) => {
    const imageUrls = values.images
      ? values.images
          .split(",")
          .map((img) => img.trim())
          .filter(Boolean)
      : [];

    const payloadData = {
      title: values.title,
      description: values.description,
      brand: values.brand,
      category: values.category,
      costPrice: Number(values.costPrice ?? 0),
      price: Number(values.price),
      quantity: Number(values.quantity),
      shippingCharge: Number(values.shippingCharge || 0),
      status: values.status as ProductStatus,
      images: imageUrls,
    };

    if (isEditing && initialData) {
      try {
        await updateMutation.mutateAsync({
          id: initialData._id,
          payload: payloadData,
        });
        onClose();
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["products"] }),
          queryClient.invalidateQueries({ queryKey: ["product-mappings"] }),
          queryClient.invalidateQueries({ queryKey: ["sync-logs"] }),
        ]);
        toast.success("Product updated.");
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Failed to update product");
      }
      return;
    }

    createMutation.mutate(
      {
        ...payloadData,
        sku: values.sku.trim().toUpperCase(),
      },
      {
        onSuccess: () => {
          toast.success("Product created.");
          onClose();
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to create product");
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? "Edit Master Product" : "Add New Master Product"}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">
                Master SKU {isEditing && <span className="text-xs text-slate-400">(Read-only)</span>}
              </Label>
              <Input
                id="sku"
                placeholder="e.g. NIKE-AIR-001"
                disabled={isEditing}
                className={
                  isEditing
                    ? "bg-slate-100 cursor-not-allowed font-mono text-sm"
                    : "font-mono uppercase"
                }
                {...register("sku")}
              />
              {isEditing ? (
                <p className="mt-1 text-xs text-slate-500">
                  SKU is the master product identity and cannot be changed from this form.
                </p>
              ) : errors.sku ? (
                <p className="mt-1 text-xs text-red-500">{errors.sku.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g. Nike Air Max 270" {...register("title")} />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" placeholder="e.g. Nike" {...register("brand")} />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input id="category" placeholder="e.g. Footwear" {...register("category")} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="costPrice">Cost</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("costPrice", { valueAsNumber: true })}
              />
              {errors.costPrice && (
                <p className="mt-1 text-xs text-red-500">{errors.costPrice.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price">Base Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Master Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                {...register("quantity", { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-red-500">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Product Status</Label>
              <select
                id="status"
                className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                {...register("status")}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="DRAFT">DRAFT</option>
              </select>
            </div>

            <div>
              <Label htmlFor="shippingCharge">Shipping Charge</Label>
              <Input
                id="shippingCharge"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("shippingCharge", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Product details..."
              {...register("description")}
            />
          </div>

          <div>
            <Label htmlFor="images">Images</Label>
            <Input
              id="images"
              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
              {...register("images")}
            />
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
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
