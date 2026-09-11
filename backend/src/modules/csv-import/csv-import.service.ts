import { parse } from "csv-parse/sync";
import Product from "../products/product.model";
import { productService } from "../products/product.service";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { ProductStatus } from "../../shared/enums/product-status.enum";
import { csvRowSchema } from "./csv-import.validation";
import { CsvImportSummary, CsvRowError } from "./csv-import.types";
import { CSV_IMPORT_MESSAGES } from "./csv-import.messages";

const REQUIRED_HEADERS = ["sku"];

const getRecordValue = (record: Record<string, string>, ...keys: string[]): string | undefined => {
  const normalizedKeys = keys.map((k) => k.toLowerCase().replace(/[\s_]/g, ""));
  for (const key of Object.keys(record)) {
    const normKey = key.toLowerCase().replace(/[\s_]/g, "");
    if (normalizedKeys.includes(normKey)) {
      const val = record[key];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return undefined;
};

class CsvImportService {
  async importProducts(fileBuffer: Buffer): Promise<CsvImportSummary> {
    let records: Record<string, string>[];

    try {
      records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
        relax_column_count: true,
      });
    } catch (error: any) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        CSV_IMPORT_MESSAGES.MALFORMED_CSV
      );
    }

    if (!records || records.length === 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        CSV_IMPORT_MESSAGES.EMPTY_CSV
      );
    }

    // Header Validation: Ensure 'sku' header is present in the CSV
    const firstRecordKeys = Object.keys(records[0] || {}).map((k) =>
      k.toLowerCase().trim().replace(/[\s_]/g, "")
    );
    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !firstRecordKeys.includes(header)
    );

    if (missingHeaders.length > 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `${CSV_IMPORT_MESSAGES.HEADER_MISSING}: ${missingHeaders.join(", ")}`
      );
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: CsvRowError[] = [];
    const seenSkusInCsv = new Set<string>();

    // Process each CSV row independently
    for (let index = 0; index < records.length; index++) {
      const rowNumber = index + 2; // 1-indexed row number considering header row
      const record = records[index];

      // Extract & trim SKU
      const rawSku = getRecordValue(record, "sku");

      if (!rawSku) {
        errors.push({
          row: rowNumber,
          sku: "",
          message: "SKU is required",
        });
        failed++;
        continue;
      }

      const skuUpper = rawSku.toUpperCase();

      // Check duplicate SKU inside the same CSV file
      if (seenSkusInCsv.has(skuUpper)) {
        errors.push({
          row: rowNumber,
          sku: skuUpper,
          message: "Duplicate SKU found in CSV file",
        });
        failed++;
        continue;
      }

      seenSkusInCsv.add(skuUpper);

      // Extract Title (Optional for CSV imports / updates)
      const rawTitle = getRecordValue(record, "title");
      const title = rawTitle !== undefined && rawTitle !== "" ? rawTitle : undefined;

      // Extract Description, Brand, Category
      const rawDescription = getRecordValue(record, "description");
      const description = rawDescription !== undefined && rawDescription !== "" ? rawDescription : undefined;

      const rawBrand = getRecordValue(record, "brand");
      const brand = rawBrand !== undefined && rawBrand !== "" ? rawBrand : undefined;

      const rawCategory = getRecordValue(record, "category");
      const category = rawCategory !== undefined && rawCategory !== "" ? rawCategory : undefined;

      // Extract Price / Cost (supports price, cost, costprice column headers)
      const rawPrice = getRecordValue(record, "price", "cost", "costprice");
      let price: number | undefined = undefined;

      if (rawPrice !== undefined && rawPrice !== "") {
        const parsedPrice = Number(rawPrice);
        if (isNaN(parsedPrice)) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Cost/Price must be a valid number",
          });
          failed++;
          continue;
        }
        if (parsedPrice < 0) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Price cannot be negative",
          });
          failed++;
          continue;
        }
        price = parsedPrice;
      }

      // Extract Quantity (supports quantity, qty column headers)
      const rawQty = getRecordValue(record, "quantity", "qty");
      let quantity: number | undefined = undefined;

      if (rawQty !== undefined && rawQty !== "") {
        const parsedQty = Number(rawQty);
        if (isNaN(parsedQty)) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Quantity must be a valid number",
          });
          failed++;
          continue;
        }
        if (parsedQty < 0) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Quantity cannot be negative",
          });
          failed++;
          continue;
        }
        if (!Number.isInteger(parsedQty)) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Quantity must be an integer",
          });
          failed++;
          continue;
        }
        quantity = parsedQty;
      }

      // Extract Shipping Charge
      const rawShip = getRecordValue(record, "shippingcharge", "shipping");
      let shippingCharge: number | undefined = undefined;

      if (rawShip !== undefined && rawShip !== "") {
        const parsedShip = Number(rawShip);
        if (isNaN(parsedShip) || parsedShip < 0) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Shipping charge must be a valid non-negative number",
          });
          failed++;
          continue;
        }
        shippingCharge = parsedShip;
      }

      // Extract Status
      const rawStatus = getRecordValue(record, "status");
      let status: ProductStatus | undefined = undefined;

      if (rawStatus !== undefined && rawStatus !== "") {
        const statusUpper = rawStatus.toUpperCase();
        if (Object.values(ProductStatus).includes(statusUpper as ProductStatus)) {
          status = statusUpper as ProductStatus;
        } else {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: `Invalid status '${rawStatus}'. Allowed values: ACTIVE, INACTIVE, DRAFT`,
          });
          failed++;
          continue;
        }
      }

      // Extract Images
      const rawImages = getRecordValue(record, "images", "image");
      let images: string[] | undefined = undefined;
      if (rawImages !== undefined && rawImages !== "") {
        images = rawImages
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean);
      }

      // Payload for Zod Validation
      const rowPayload = {
        sku: skuUpper,
        title,
        description,
        brand,
        category,
        images,
        price,
        quantity,
        shippingCharge,
        status,
      };

      const validation = csvRowSchema.safeParse(rowPayload);

      if (!validation.success) {
        const issueMsg = validation.error.issues
          .map((issue) => issue.message)
          .join("; ");

        errors.push({
          row: rowNumber,
          sku: skuUpper,
          message: issueMsg,
        });
        failed++;
        continue;
      }

      // Upsert product by SKU
      try {
        const existingProduct = await Product.findOne({
          sku: skuUpper,
          isDeleted: false,
        });

        if (existingProduct) {
          // Construct update payload with ONLY the fields supplied in CSV
          const updatePayload: Record<string, any> = {};

          if (title !== undefined) updatePayload.title = title;
          if (description !== undefined) updatePayload.description = description;
          if (brand !== undefined) updatePayload.brand = brand;
          if (category !== undefined) updatePayload.category = category;
          if (images !== undefined) updatePayload.images = images;
          if (price !== undefined) updatePayload.price = price;
          if (quantity !== undefined) updatePayload.quantity = quantity;
          if (shippingCharge !== undefined) updatePayload.shippingCharge = shippingCharge;
          if (status !== undefined) updatePayload.status = status;

          await productService.update(existingProduct._id.toString(), updatePayload);
          updated++;
        } else {
          // Creating a brand-new product requires Title
          if (!title) {
            errors.push({
              row: rowNumber,
              sku: skuUpper,
              message: "Title is required to create a new product",
            });
            failed++;
            continue;
          }

          const createPayload = {
            sku: skuUpper,
            title,
            description: description ?? "",
            brand: brand ?? "",
            category: category ?? "",
            images: images ?? [],
            price: price ?? 0,
            quantity: quantity ?? 0,
            shippingCharge: shippingCharge ?? 0,
            status: status ?? ProductStatus.ACTIVE,
          };

          await productService.create(createPayload);
          created++;
        }
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          sku: skuUpper,
          message: err.message || "Failed to process product row",
        });
        failed++;
      }
    }

    return {
      totalRows: records.length,
      created,
      updated,
      failed,
      errors,
    };
  }
}

export const csvImportService = new CsvImportService();
