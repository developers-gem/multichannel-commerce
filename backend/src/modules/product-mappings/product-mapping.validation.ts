import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const createProductMappingSchema = z.object({
  productId: objectIdSchema,

  integrationId: objectIdSchema,

  externalProductId: z
    .string()
    .trim()
    .min(1, "External Product ID is required"),

  externalVariantId: z.string().trim().optional(),

  externalSku: z.string().trim().optional(),

  isActive: z.boolean().optional(),
});

export const updateProductMappingSchema = z.object({
  externalProductId: z
    .string()
    .trim()
    .min(1, "External Product ID cannot be empty")
    .optional(),

  externalVariantId: z.string().trim().optional(),

  externalSku: z.string().trim().optional(),

  isActive: z.boolean().optional(),
});
