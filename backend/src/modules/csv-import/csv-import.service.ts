import { parse } from "csv-parse/sync";
import Product from "../products/product.model";
import { productService } from "../products/product.service";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { ProductStatus } from "../../shared/enums/product-status.enum";
import { csvRowSchema } from "./csv-import.validation";
import { CsvImportSummary, CsvRowError } from "./csv-import.types";
import { CSV_IMPORT_MESSAGES } from "./csv-import.messages";

const REQUIRED_HEADERS = ["sku", "title", "price", "quantity"];

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

    // Header Validation: Ensure all required header keys are present in the CSV
    const firstRecordKeys = Object.keys(records[0] || {}).map((k) => k.toLowerCase().trim());
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
      const rawSku = (record.sku || record.SKU || "").trim();

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

      // Parse & construct row object
      const title = (record.title || record.Title || "").trim();
      const description = (record.description || record.Description || "").trim();
      const brand = (record.brand || record.Brand || "").trim();
      const category = (record.category || record.Category || "").trim();

      const priceRaw = record.price ?? record.Price;
      const priceNum = priceRaw !== undefined && priceRaw !== "" ? Number(priceRaw) : NaN;

      const qtyRaw = record.quantity ?? record.Quantity;
      const qtyNum = qtyRaw !== undefined && qtyRaw !== "" ? Number(qtyRaw) : NaN;

      const shipRaw = record.shippingCharge ?? record.ShippingCharge;
      const shipNum = shipRaw !== undefined && shipRaw !== "" ? Number(shipRaw) : 0;

      const rawStatus = (record.status || record.Status || "").trim().toUpperCase();
      let statusEnum: ProductStatus = ProductStatus.ACTIVE;

      if (rawStatus) {
        if (Object.values(ProductStatus).includes(rawStatus as ProductStatus)) {
          statusEnum = rawStatus as ProductStatus;
        } else {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: `Invalid status '${record.status}'. Allowed values: ACTIVE, INACTIVE, DRAFT`,
          });
          failed++;
          continue;
        }
      }

      const imagesRaw = record.images || record.Images || "";
      const imagesArr = imagesRaw
        ? imagesRaw
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean)
        : [];

      const rowPayload = {
        sku: skuUpper,
        title,
        description,
        brand,
        category,
        images: imagesArr,
        price: priceNum,
        quantity: qtyNum,
        shippingCharge: shipNum,
        status: statusEnum,
      };

      // Zod Validation for row numbers & string rules
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

      // Upsert master Product using existing Product logic
      try {
        const existingProduct = await Product.findOne({
          sku: skuUpper,
          isDeleted: false,
        });

        if (existingProduct) {
          await productService.update(existingProduct._id.toString(), {
            title: rowPayload.title,
            description: rowPayload.description,
            brand: rowPayload.brand,
            category: rowPayload.category,
            images: rowPayload.images,
            price: rowPayload.price,
            quantity: rowPayload.quantity,
            shippingCharge: rowPayload.shippingCharge,
            status: rowPayload.status,
          });
          updated++;
        } else {
          await productService.create(rowPayload);
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
