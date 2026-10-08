// import { parse } from "csv-parse/sync";
// import Product from "../products/product.model";
// import { syncService } from "../sync/sync.service";
// import { SyncJobAction } from "../sync/sync.types";
// import { ApiError } from "../../utils/ApiError";
// import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
// import { ProductStatus } from "../../shared/enums/product-status.enum";
// import { csvRowSchema } from "./csv-import.validation";
// import { CsvImportSummary, CsvRowError } from "./csv-import.types";
// import { CSV_IMPORT_MESSAGES } from "./csv-import.messages";

// const REQUIRED_HEADERS = ["sku"];

// const getRecordValue = (record: Record<string, string>, ...keys: string[]): string | undefined => {
//   const normalizedKeys = keys.map((k) => k.toLowerCase().replace(/[\s_]/g, ""));
//   for (const key of Object.keys(record)) {
//     const normKey = key.toLowerCase().replace(/[\s_]/g, "");
//     if (normalizedKeys.includes(normKey)) {
//       const val = record[key];
//       if (val !== undefined && val !== null) {
//         return String(val).trim();
//       }
//     }
//   }
//   return undefined;
// };

// class CsvImportService {
//   async importProducts(fileBuffer: Buffer): Promise<CsvImportSummary> {
//     let records: Record<string, string>[];

//     try {
//       records = parse(fileBuffer, {
//         columns: true,
//         skip_empty_lines: true,
//         trim: true,
//         bom: true,
//         relax_column_count: true,
//       });
//     } catch (error: any) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         CSV_IMPORT_MESSAGES.MALFORMED_CSV
//       );
//     }

//     if (!records || records.length === 0) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         CSV_IMPORT_MESSAGES.EMPTY_CSV
//       );
//     }

//     // Header Validation: Ensure 'sku' header is present in the CSV
//     const firstRecordKeys = Object.keys(records[0] || {}).map((k) =>
//       k.toLowerCase().trim().replace(/[\s_]/g, "")
//     );
//     const missingHeaders = REQUIRED_HEADERS.filter(
//       (header) => !firstRecordKeys.includes(header)
//     );

//     if (missingHeaders.length > 0) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         `${CSV_IMPORT_MESSAGES.HEADER_MISSING}: ${missingHeaders.join(", ")}`
//       );
//     }

//     let created = 0;
//     let updated = 0;
//     let failed = 0;
//     const errors: CsvRowError[] = [];

//     // Process each CSV row independently
//     for (let index = 0; index < records.length; index++) {
//       const rowNumber = index + 2; // 1-indexed row number considering header row
//       const record = records[index];

//       // Extract & trim SKU
//       const rawSku = getRecordValue(record, "sku");

//       if (!rawSku) {
//         errors.push({
//           row: rowNumber,
//           sku: "",
//           message: "SKU is required",
//         });
//         failed++;
//         continue;
//       }

//       const skuUpper = rawSku.toUpperCase();

//       // Extract Title (Optional for CSV imports / updates)
//       const rawTitle = getRecordValue(record, "title");
//       const title = rawTitle !== undefined && rawTitle !== "" ? rawTitle : undefined;

//       // Extract Description, Brand, Category
//       const rawDescription = getRecordValue(record, "description");
//       const description = rawDescription !== undefined && rawDescription !== "" ? rawDescription : undefined;

//       const rawBrand = getRecordValue(record, "brand");
//       const brand = rawBrand !== undefined && rawBrand !== "" ? rawBrand : undefined;

//       const rawCategory = getRecordValue(record, "category");
//       const category = rawCategory !== undefined && rawCategory !== "" ? rawCategory : undefined;

//       // Cost and base price are separate Master Product fields.
//       const rawCostPrice = getRecordValue(record, "costprice", "cost");
//       let costPrice: number | undefined;

//       if (rawCostPrice !== undefined && rawCostPrice !== "") {
//         const parsedCostPrice = Number(rawCostPrice);
//         if (!Number.isFinite(parsedCostPrice) || parsedCostPrice < 0) {
//           errors.push({ row: rowNumber, sku: skuUpper, message: "Cost must be a valid non-negative number" });
//           failed++;
//           continue;
//         }
//         costPrice = parsedCostPrice;
//       }

//       const rawPrice = getRecordValue(record, "price", "baseprice");
//       let price: number | undefined = undefined;

//       if (rawPrice !== undefined && rawPrice !== "") {
//         const parsedPrice = Number(rawPrice);
//         if (isNaN(parsedPrice)) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Base price must be a valid number",
//           });
//           failed++;
//           continue;
//         }
//         if (parsedPrice < 0) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Base price cannot be negative",
//           });
//           failed++;
//           continue;
//         }
//         price = parsedPrice;
//       }

//       const rawCurrency = getRecordValue(record, "currency");
//       let currency: string | undefined;
//       if (rawCurrency !== undefined && rawCurrency !== "") {
//         currency = rawCurrency.toUpperCase();
//         if (!/^[A-Z]{3}$/.test(currency)) {
//           errors.push({ row: rowNumber, sku: skuUpper, message: "Currency must be a 3-letter code" });
//           failed++;
//           continue;
//         }
//       }

//       // Extract Quantity (supports quantity, qty column headers)
//       const rawQty = getRecordValue(record, "quantity", "qty");
//       let quantity: number | undefined = undefined;

//       if (rawQty !== undefined && rawQty !== "") {
//         const parsedQty = Number(rawQty);
//         if (isNaN(parsedQty)) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Quantity must be a valid number",
//           });
//           failed++;
//           continue;
//         }
//         if (parsedQty < 0) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Quantity cannot be negative",
//           });
//           failed++;
//           continue;
//         }
//         if (!Number.isInteger(parsedQty)) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Quantity must be an integer",
//           });
//           failed++;
//           continue;
//         }
//         quantity = parsedQty;
//       }

//       // Extract Shipping Charge
//       const rawShip = getRecordValue(record, "shippingcharge", "shipping");
//       let shippingCharge: number | undefined = undefined;

//       if (rawShip !== undefined && rawShip !== "") {
//         const parsedShip = Number(rawShip);
//         if (isNaN(parsedShip) || parsedShip < 0) {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: "Shipping charge must be a valid non-negative number",
//           });
//           failed++;
//           continue;
//         }
//         shippingCharge = parsedShip;
//       }

//       // Extract Status
//       const rawStatus = getRecordValue(record, "status");
//       let status: ProductStatus | undefined = undefined;

//       if (rawStatus !== undefined && rawStatus !== "") {
//         const statusUpper = rawStatus.toUpperCase();
//         if (Object.values(ProductStatus).includes(statusUpper as ProductStatus)) {
//           status = statusUpper as ProductStatus;
//         } else {
//           errors.push({
//             row: rowNumber,
//             sku: skuUpper,
//             message: `Invalid status '${rawStatus}'. Allowed values: ACTIVE, INACTIVE, DRAFT`,
//           });
//           failed++;
//           continue;
//         }
//       }

//       // Extract Images
//       const rawImages = getRecordValue(record, "images", "image");
//       let images: string[] | undefined = undefined;
//       if (rawImages !== undefined && rawImages !== "") {
//         images = rawImages
//           .split(",")
//           .map((url) => url.trim())
//           .filter(Boolean);
//       }

//       // Payload for Zod Validation
//       const rowPayload = {
//         sku: skuUpper,
//         title,
//         description,
//         brand,
//         category,
//         images,
//         costPrice,
//         price,
//         currency,
//         quantity,
//         shippingCharge,
//         status,
//       };

//       const validation = csvRowSchema.safeParse(rowPayload);

//       if (!validation.success) {
//         const issueMsg = validation.error.issues
//           .map((issue) => issue.message)
//           .join("; ");

//         errors.push({
//           row: rowNumber,
//           sku: skuUpper,
//           message: issueMsg,
//         });
//         failed++;
//         continue;
//       }

//       // Upsert by the unique SKU index so concurrent imports cannot insert duplicates.
//       try {
//         if (!title) {
//           const existingProduct = await Product.exists({ sku: skuUpper });
//           if (!existingProduct) {
//             errors.push({ row: rowNumber, sku: skuUpper, message: "Title is required to create a new product" });
//             failed++;
//             continue;
//           }
//         }

//         const updatePayload: Record<string, unknown> = { isDeleted: false };
//         if (title !== undefined) updatePayload.title = title;
//         if (description !== undefined) updatePayload.description = description;
//         if (brand !== undefined) updatePayload.brand = brand;
//         if (category !== undefined) updatePayload.category = category;
//         if (images !== undefined) updatePayload.images = images;
//         if (costPrice !== undefined) updatePayload.costPrice = costPrice;
//         if (price !== undefined) updatePayload.price = price;
//         if (currency !== undefined) updatePayload.currency = currency;
//         if (quantity !== undefined) updatePayload.quantity = quantity;
//         if (shippingCharge !== undefined) updatePayload.shippingCharge = shippingCharge;
//         if (status !== undefined) updatePayload.status = status;

//         const result = await Product.updateOne(
//           { sku: skuUpper },
//           {
//             $set: updatePayload,
//             ...(title ? { $setOnInsert: { sku: skuUpper } } : {}),
//           },
//           {
//             upsert: Boolean(title),
//             runValidators: true,
//             setDefaultsOnInsert: true,
//           }
//         );

//         if (!result.matchedCount && !result.upsertedCount) {
//           throw new Error("Product could not be found or created for this SKU");
//         }

//         const product = await Product.findOne({ sku: skuUpper }).select("_id").lean();
//         if (!product) throw new Error("Product could not be loaded after CSV upsert");

//         if (result.upsertedCount > 0) {
//           created++;
//         } else {
//           updated++;
//           await syncService.enqueueSyncJobsForProduct(product._id.toString(), SyncJobAction.UPDATE);
//         }
//       } catch (err: any) {
//         if (err?.code === 11000 && title) {
//           try {
//             const retryResult = await Product.updateOne(
//               { sku: skuUpper },
//               { $set: { isDeleted: false, ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}), ...(brand !== undefined ? { brand } : {}), ...(category !== undefined ? { category } : {}), ...(images !== undefined ? { images } : {}), ...(costPrice !== undefined ? { costPrice } : {}), ...(price !== undefined ? { price } : {}), ...(currency !== undefined ? { currency } : {}), ...(quantity !== undefined ? { quantity } : {}), ...(shippingCharge !== undefined ? { shippingCharge } : {}), ...(status !== undefined ? { status } : {}) } },
//               { upsert: false, runValidators: true }
//             );
//             if (retryResult.matchedCount > 0) {
//               const existingProduct = await Product.findOne({ sku: skuUpper }).select("_id").lean();
//               if (!existingProduct) throw err;
//               updated++;
//               await syncService.enqueueSyncJobsForProduct(existingProduct._id.toString(), SyncJobAction.UPDATE);
//               continue;
//             }
//           } catch (retryError: any) {
//             err = retryError;
//           }
//         }
//         errors.push({
//           row: rowNumber,
//           sku: skuUpper,
//           message: err.message || "Failed to process product row",
//         });
//         failed++;
//       }
//     }

//     return {
//       totalRows: records.length,
//       created,
//       updated,
//       failed,
//       errors,
//     };
//   }
// }

// export const csvImportService = new CsvImportService();
import { parse } from "csv-parse/sync";
import Product from "../products/product.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import { productService } from "../products/product.service";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { ProductStatus } from "../../shared/enums/product-status.enum";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
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
  async importProducts(fileBuffer: Buffer, userId?: string): Promise<CsvImportSummary> {
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

      // Extract Price (supports price, baseprice, sellingprice, retailprice)
      const rawPrice = getRecordValue(record, "price", "baseprice", "sellingprice", "retailprice");
      let price: number | undefined = undefined;

      if (rawPrice !== undefined && rawPrice !== "") {
        const parsedPrice = Number(rawPrice);
        if (isNaN(parsedPrice)) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Price must be a valid number",
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

      // Extract Cost / CostPrice (supports cost, costprice, buyingprice)
      const rawCost = getRecordValue(record, "cost", "costprice", "buyingprice");
      let costPrice: number | undefined = undefined;

      if (rawCost !== undefined && rawCost !== "") {
        const parsedCost = Number(rawCost);
        if (isNaN(parsedCost)) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Cost must be a valid number",
          });
          failed++;
          continue;
        }
        if (parsedCost < 0) {
          errors.push({
            row: rowNumber,
            sku: skuUpper,
            message: "Cost cannot be negative",
          });
          failed++;
          continue;
        }
        costPrice = parsedCost;
      }

      // If price was not specified in the CSV, but cost was specified, fallback price to costPrice
      if (price === undefined && costPrice !== undefined) {
        price = costPrice;
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
        costPrice,
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
        // Step 1: Check if product already exists with this SKU (including soft-deleted products)
        const existingProduct = await Product.findOne({
          sku: skuUpper,
        });

        if (existingProduct) {
          // Construct update payload with ONLY the fields supplied in CSV
          const updatePayload: Record<string, any> = {
            isDeleted: false, // Restore if soft-deleted (Requirement 9)
          };

          if (title !== undefined) updatePayload.title = title;
          if (description !== undefined) updatePayload.description = description;
          if (brand !== undefined) updatePayload.brand = brand;
          if (category !== undefined) updatePayload.category = category;
          if (images !== undefined) updatePayload.images = images;
          if (price !== undefined) updatePayload.price = price;
          if (costPrice !== undefined) updatePayload.costPrice = costPrice;
          if (quantity !== undefined) updatePayload.quantity = quantity;
          if (shippingCharge !== undefined) updatePayload.shippingCharge = shippingCharge;
          if (status !== undefined) updatePayload.status = status;
          if (userId && !existingProduct.userId) updatePayload.userId = userId;

          const updatedProduct = await Product.findOneAndUpdate(
            { _id: existingProduct._id },
            { $set: updatePayload },
            {
              new: true,
              runValidators: true,
            }
          );

          if (!updatedProduct) {
            throw new Error("Failed to update existing product");
          }

          // Keep active channel mappings aligned with updated price/quantity
          const mappingUpdates: Record<string, any> = {};
          if (price !== undefined) mappingUpdates.channelPrice = price;
          if (quantity !== undefined) mappingUpdates.channelQuantity = quantity;
          if (Object.keys(mappingUpdates).length > 0) {
            await ProductMapping.updateMany(
              { productId: updatedProduct._id, isDeleted: false },
              { $set: mappingUpdates }
            );
          }

          updated++;
        } else {
          // Step 2: Creating a brand-new product requires Title
          if (!title) {
            errors.push({
              row: rowNumber,
              sku: skuUpper,
              message: "Title is required to create a new product",
            });
            failed++;
            continue;
          }

          // Atomic upsert on SKU to guarantee idempotency and avoid E11000 duplicate key errors
          const setDoc: Record<string, any> = {
            isDeleted: false,
          };
          if (title !== undefined) setDoc.title = title;
          if (description !== undefined) setDoc.description = description;
          if (brand !== undefined) setDoc.brand = brand;
          if (category !== undefined) setDoc.category = category;
          if (images !== undefined) setDoc.images = images;
          if (price !== undefined) setDoc.price = price;
          if (costPrice !== undefined) setDoc.costPrice = costPrice;
          if (quantity !== undefined) setDoc.quantity = quantity;
          if (shippingCharge !== undefined) setDoc.shippingCharge = shippingCharge;
          if (status !== undefined) setDoc.status = status;
          if (userId) setDoc.userId = userId;

          const setOnInsertDoc: Record<string, any> = {
            sku: skuUpper,
            syncStatus: SyncStatus.PENDING,
            inventoryMode: "INDEPENDENT",
          };
          if (description === undefined) setOnInsertDoc.description = "";
          if (brand === undefined) setOnInsertDoc.brand = "";
          if (category === undefined) setOnInsertDoc.category = "";
          if (images === undefined) setOnInsertDoc.images = [];
          if (price === undefined) setOnInsertDoc.price = 0;
          if (costPrice === undefined) setOnInsertDoc.costPrice = 0;
          if (quantity === undefined) setOnInsertDoc.quantity = 0;
          if (shippingCharge === undefined) setOnInsertDoc.shippingCharge = 0;
          if (status === undefined) setOnInsertDoc.status = ProductStatus.ACTIVE;

          const upsertResult = await Product.findOneAndUpdate(
            { sku: skuUpper },
            {
              $setOnInsert: setOnInsertDoc,
              $set: setDoc,
            },
            {
              upsert: true,
              new: true,
              includeResultMetadata: true,
              runValidators: true,
            }
          );

          const wasExisting = upsertResult?.lastErrorObject?.updatedExisting === true;
          if (wasExisting) {
            updated++;
          } else {
            created++;
          }
        }
      } catch (err: any) {
        // Handle concurrent race where another thread inserted the SKU simultaneously
        if (err.code === 11000) {
          try {
            const fallbackUpdate: Record<string, any> = { isDeleted: false };
            if (title !== undefined) fallbackUpdate.title = title;
            if (description !== undefined) fallbackUpdate.description = description;
            if (brand !== undefined) fallbackUpdate.brand = brand;
            if (category !== undefined) fallbackUpdate.category = category;
            if (images !== undefined) fallbackUpdate.images = images;
            if (price !== undefined) fallbackUpdate.price = price;
            if (costPrice !== undefined) fallbackUpdate.costPrice = costPrice;
            if (quantity !== undefined) fallbackUpdate.quantity = quantity;
            if (shippingCharge !== undefined) fallbackUpdate.shippingCharge = shippingCharge;
            if (status !== undefined) fallbackUpdate.status = status;

            const recoveredProduct = await Product.findOneAndUpdate(
              { sku: skuUpper },
              { $set: fallbackUpdate },
              { new: true, runValidators: true }
            );

            if (recoveredProduct) {
              updated++;
              continue;
            }
          } catch (retryErr) {
            // fall through to error handling
          }
        }

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