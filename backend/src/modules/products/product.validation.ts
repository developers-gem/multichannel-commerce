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

  price: z
    .number()
    .min(0, "Price cannot be negative"),

  quantity: z
    .number()
    .min(0, "Quantity cannot be negative"),

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