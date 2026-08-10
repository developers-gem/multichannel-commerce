import multer from "multer";
import { z } from "zod";
import { ProductStatus } from "../../shared/enums/product-status.enum";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { CSV_IMPORT_MESSAGES } from "./csv-import.messages";

// Multer memory storage configuration (5MB limit, CSV only)
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const isCsvMime =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "text/plain";
    const isCsvExt = file.originalname.toLowerCase().endsWith(".csv");

    if (isCsvMime || isCsvExt) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          CSV_IMPORT_MESSAGES.INVALID_FILE_TYPE
        )
      );
    }
  },
});

// Zod Schema for single CSV row validation
export const csvRowSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  price: z
    .number()
    .min(0, "Price cannot be negative"),
  quantity: z
    .number()
    .min(0, "Quantity cannot be negative")
    .refine((val) => Number.isInteger(val), {
      message: "Quantity must be an integer",
    }),
  shippingCharge: z
    .number()
    .min(0, "Shipping charge cannot be negative")
    .optional(),
  status: z.nativeEnum(ProductStatus).optional(),
});

export type CsvRowInput = z.infer<typeof csvRowSchema>;
