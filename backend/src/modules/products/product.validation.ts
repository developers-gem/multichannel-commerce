import { z } from "zod";

import { ProductStatus } from "../../shared/enums/product-status.enum";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

export const createProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required"),

  title: z
    .string()
    .trim()
    .min(1, "Title is required"),

  description: z
    .string()
    .optional(),

  brand: z
    .string()
    .optional(),

  category: z
    .string()
    .optional(),

  images: z
    .array(z.string())
    .optional(),

  costPrice: z
    .number()
    .min(0, "Cost price cannot be negative")
    .optional(),

  price: z
    .number()
    .min(0, "Price cannot be negative"),

  currency: z.string().trim().length(3).toUpperCase().optional(),

  quantity: z
    .number()
    .min(0, "Quantity cannot be negative"),

  inventoryMode: z
    .enum(["INDEPENDENT", "SHARED"])
    .optional(),

  shippingCharge: z

    .number()
    .min(0, "Shipping charge cannot be negative")
    .optional(),

  status: z
    .nativeEnum(ProductStatus)
    .optional(),

  syncStatus: z
    .nativeEnum(SyncStatus)
    .optional(),
});

export const updateProductSchema =
  createProductSchema
    .omit({
      sku: true,
    })
    .partial();