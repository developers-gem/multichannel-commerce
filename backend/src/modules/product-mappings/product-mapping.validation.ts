import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

const optionalText = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().optional()
);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return value;
}, z.number().min(0).optional());

const optionalCurrency = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  if (value === null) return undefined;
  return value;
}, z.string().trim().length(3, "Currency must be a 3-letter code").toUpperCase().optional());

export const createProductMappingSchema = z.object({
  productId: objectIdSchema,

  integrationId: objectIdSchema,

  externalProductId: optionalText,

  externalVariantId: optionalText,

  externalInventoryItemId: optionalText,

  externalSku: optionalText,

  channelPrice: optionalNumber,

  channelQuantity: optionalNumber,

  channelCurrency: optionalCurrency,

  channelCategoryId: optionalText,

  channelCategoryName: optionalText,

  shippingCost: z.number().min(0, "Shipping cost cannot be negative").optional(),

  platformFeePercentage: z.number().min(0, "Fee percentage cannot be negative").optional(),

  fixedFee: z.number().min(0, "Fixed fee cannot be negative").optional(),

  isActive: z.boolean().optional(),
});

export const updateProductMappingSchema = z.object({
  externalProductId: optionalText,

  externalVariantId: optionalText,

  externalInventoryItemId: optionalText,

  externalSku: optionalText,

  channelPrice: optionalNumber,

  channelQuantity: optionalNumber,

  channelCurrency: optionalCurrency,

  channelCategoryId: optionalText,

  channelCategoryName: optionalText,

  shippingCost: z.number().min(0, "Shipping cost cannot be negative").optional(),

  platformFeePercentage: z.number().min(0, "Fee percentage cannot be negative").optional(),

  fixedFee: z.number().min(0, "Fixed fee cannot be negative").optional(),

  isActive: z.boolean().optional(),
});

