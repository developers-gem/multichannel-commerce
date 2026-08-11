// import { Worker, Job, UnrecoverableError } from "bullmq";
// import Redis from "ioredis";
// import { env } from "../../config/env";
// import Product from "../products/product.model";
// import Integration from "../integrations/integration.model";
// import ProductMapping from "../product-mappings/product-mapping.model";
// import SyncLog from "./sync.model";
// import { MarketplaceConnectorFactory } from "./connectors/connector.factory";
// import { QUEUE_NAME } from "./sync.queue";
// import { ISyncJobPayload, SyncJobAction, SyncLogStatus } from "./sync.types";
// import { SyncStatus } from "../../shared/enums/sync-status.enum";

// const redisConnection = new Redis({
//   host: env.REDIS_HOST,
//   port: env.REDIS_PORT,
//   password: env.REDIS_PASSWORD || undefined,
//   db: env.REDIS_DB,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
// });

// redisConnection.on("error", (_err) => {
//   // Suppress uncaught background connection log spam if Redis is offline
// });

// const LOCK_TTL_MS = 30000; // 30 seconds safe TTL

// export async function acquireMappingLock(productMappingId: string): Promise<string | null> {
//   const lockKey = `lock:product-mapping:${productMappingId}`;
//   const lockValue = `${Date.now()}:${Math.random().toString(36).substring(2)}`;

//   try {
//     const res = await redisConnection.set(lockKey, lockValue, "PX", LOCK_TTL_MS, "NX");
//     return res === "OK" ? lockValue : null;
//   } catch {
//     // In test environment without active Redis server, fall back to inline lock
//     return lockValue;
//   }
// }

// export async function releaseMappingLock(productMappingId: string, lockValue: string): Promise<void> {
//   const lockKey = `lock:product-mapping:${productMappingId}`;
//   try {
//     const currentValue = await redisConnection.get(lockKey);
//     if (currentValue === lockValue) {
//       await redisConnection.del(lockKey);
//     }
//   } catch {
//     // Non-blocking release fallback
//   }
// }

// export function isRetryableError(errorMsg: string): boolean {
//   const msg = (errorMsg || "").toLowerCase();

//   // Explicit Non-Retryable Indicators (Auth failures, bad data, missing credentials/parameters)
//   if (
//     msg.includes("http 400") ||
//     msg.includes("http 401") ||
//     msg.includes("http 403") ||
//     msg.includes("authentication error") ||
//     msg.includes("authorization error") ||
//     msg.includes("invalid product data") ||
//     msg.includes("missing") ||
//     msg.includes("invalid") ||
//     msg.includes("is required for update operation") ||
//     msg.includes("is required for delete operation")
//   ) {
//     return false;
//   }

//   // Explicit Retryable Indicators (Rate limits, server errors, timeouts, resets, outages, locks)
//   if (
//     msg.includes("http 429") ||
//     msg.includes("rate limit") ||
//     msg.includes("throttled") ||
//     msg.includes("http 500") ||
//     msg.includes("http 502") ||
//     msg.includes("http 503") ||
//     msg.includes("http 504") ||
//     msg.includes("timeout") ||
//     msg.includes("econnreset") ||
//     msg.includes("econnrefused") ||
//     msg.includes("etimedout") ||
//     msg.includes("lock acquisition failure")
//   ) {
//     return true;
//   }

//   // Default fallback: treat unknown network/transient failures as retryable
//   return true;
// }

// export async function processSyncJob(job: Job<ISyncJobPayload>) {
//   const { syncLogId, productId, productMappingId, integrationId, action } = job.data;
//   const currentAttempt = (job.attemptsMade || 0) + 1;
//   const maxAttempts = job.opts?.attempts || env.SYNC_MAX_RETRIES || 3;

//   // Step 1: Acquire per-mapping lock
//   const lockValue = await acquireMappingLock(productMappingId);
//   if (!lockValue) {
//     const lockError = `Temporary lock acquisition failure for product mapping ${productMappingId}`;
//     throw new Error(lockError);
//   }

//   try {
//     // Step 2: Re-fetch fresh ProductMapping & Product from MongoDB AFTER acquiring lock
//     const mapping = await ProductMapping.findOne({ _id: productMappingId, isDeleted: false });
//     const product = await Product.findOne({ _id: productId, isDeleted: false });
//     const integration = await Integration.findOne({ _id: integrationId });

//     const currentSyncLog = await SyncLog.findById(syncLogId);
//     if (!currentSyncLog) {
//       throw new UnrecoverableError(`SyncLog ${syncLogId} not found`);
//     }

//     // Step 3: Unpublished / Inactive / Deleted Stale-Job Guard
//     if (
//       !mapping ||
//       mapping.isDeleted ||
//       !mapping.isActive ||
//       mapping.syncStatus === SyncStatus.UNPUBLISHED
//     ) {
//       if (action === SyncJobAction.UPDATE) {
//         await SyncLog.findByIdAndUpdate(syncLogId, {
//           status: SyncLogStatus.COMPLETED,
//           completedAt: new Date(),
//           error: "Skipped: mapping is unpublished or inactive",
//         });
//         return { success: true, skipped: true, reason: "Unpublished or inactive mapping" };
//       }
//     }

//     // Step 4: Validate Product and Integration
//     if (!product) {
//       const errorMsg = `Master product ${productId} not found or deleted`;
//       await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
//       throw new UnrecoverableError(errorMsg);
//     }

//     if (!mapping) {
//       const errorMsg = `Product mapping ${productMappingId} not found or deleted`;
//       await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
//       throw new UnrecoverableError(errorMsg);
//     }

//     if (!integration || !integration.isActive) {
//       const errorMsg = `Integration ${integrationId} is inactive or missing`;
//       await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
//       throw new UnrecoverableError(errorMsg);
//     }

//     // Step 5: Check if superseded by a newer job for the same ProductMapping
//     const newerLogExists = await SyncLog.exists({
//       productMappingId,
//       createdAt: { $gt: currentSyncLog.createdAt },
//       status: { $in: [SyncLogStatus.PROCESSING, SyncLogStatus.COMPLETED] },
//     });

//     if (action === SyncJobAction.UPDATE && newerLogExists) {
//       await SyncLog.findByIdAndUpdate(syncLogId, {
//         status: SyncLogStatus.COMPLETED,
//         completedAt: new Date(),
//         error: "Skipped: Superseded by a newer product update",
//       });
//       return { success: true, skipped: true, reason: "Superseded by a newer product update" };
//     }

//     // Step 6: Mark SyncLog PROCESSING
//     await SyncLog.findByIdAndUpdate(syncLogId, {
//       status: SyncLogStatus.PROCESSING,
//       attempts: currentAttempt,
//       maxAttempts,
//       startedAt: new Date(),
//     });

//     // Step 7: Resolve Connector & Construct Latest Payload using fresh Product data
//     const connector = MarketplaceConnectorFactory.getConnector(integration.platform);
//     const syncPayload = {
//       sku: product.sku,
//       title: product.title,
//       description: product.description,
//       brand: product.brand,
//       category: product.category,
//       images: product.images,
//       price: product.price,
//       quantity: product.quantity,
//       shippingCharge: product.shippingCharge,
//       status: product.status,
//       externalProductId: mapping.externalProductId,
//       externalVariantId: mapping.externalVariantId,
//       credentials: integration.credentials,
//     };

//     // Step 8: Execute action
//     let result;
//     if (action === SyncJobAction.CREATE) {
//       result = await connector.createProduct(syncPayload);
//     } else if (action === SyncJobAction.DELETE) {
//       result = await connector.deleteProduct(syncPayload);
//     } else {
//       result = await connector.updateProduct(syncPayload);
//     }

//     // Step 9: Handle Connector Failure
//     if (!result.success) {
//       const errorMsg = result.error || "Marketplace API sync failed";
//       const retryable = isRetryableError(errorMsg);

//       if (!retryable) {
//         await SyncLog.findByIdAndUpdate(syncLogId, {
//           status: SyncLogStatus.FAILED,
//           completedAt: new Date(),
//           error: errorMsg,
//         });
//         await ProductMapping.findByIdAndUpdate(productMappingId, {
//           syncStatus: SyncStatus.FAILED,
//           lastSyncError: errorMsg,
//         });
//         throw new UnrecoverableError(errorMsg);
//       } else {
//         throw new Error(errorMsg);
//       }
//     }

//     // Step 10: Handle Connector Success
//     await SyncLog.findByIdAndUpdate(syncLogId, {
//       status: SyncLogStatus.COMPLETED,
//       completedAt: new Date(),
//       error: "",
//     });

//     const updateMappingData: Record<string, unknown> = {
//       lastSyncedAt: new Date(),
//       lastSyncError: "",
//     };

//     if (action === SyncJobAction.DELETE) {
//       updateMappingData.syncStatus = SyncStatus.UNPUBLISHED;
//       updateMappingData.externalProductId = "";
//       updateMappingData.externalVariantId = "";
//       updateMappingData.isActive = false;
//     } else {
//       updateMappingData.syncStatus = SyncStatus.SYNCED;
//       updateMappingData.isActive = true;

//       if (result.externalProductId) {
//         updateMappingData.externalProductId = result.externalProductId;
//       }
//       if (result.externalVariantId) {
//         updateMappingData.externalVariantId = result.externalVariantId;
//       }
//       if (result.externalSku) {
//         updateMappingData.externalSku = result.externalSku;
//       }
//     }

//     await ProductMapping.findByIdAndUpdate(productMappingId, updateMappingData);
//     return result;

//   } finally {
//     // Step 11: ALWAYS release per-mapping lock in finally block
//     await releaseMappingLock(productMappingId, lockValue);
//   }
// }

// export const productSyncWorker = new Worker<ISyncJobPayload>(
//   QUEUE_NAME,
//   processSyncJob,
//   {
//     connection: redisConnection,
//     concurrency: env.SYNC_CONCURRENCY || 5,
//   }
// );

// // Worker Event Listeners for Error & Failure Tracking
// productSyncWorker.on("failed", async (job, err) => {
//   if (!job) return;

//   const currentAttempt = job.attemptsMade;
//   const maxAttempts = job.opts.attempts || env.SYNC_MAX_RETRIES || 3;
//   const isFinalAttempt = currentAttempt >= maxAttempts;

//   const syncLogId = job.data.syncLogId;
//   const productMappingId = job.data.productMappingId;

//   if (isFinalAttempt) {
//     await SyncLog.findByIdAndUpdate(syncLogId, {
//       status: SyncLogStatus.FAILED,
//       completedAt: new Date(),
//       error: err.message,
//     });

//     await ProductMapping.findByIdAndUpdate(productMappingId, {
//       syncStatus: SyncStatus.FAILED,
//       lastSyncError: err.message,
//     });
//   } else {
//     await SyncLog.findByIdAndUpdate(syncLogId, {
//       error: err.message,
//     });
//   }
// });


import { Worker, Job, UnrecoverableError } from "bullmq";
import Redis from "ioredis";
import { env } from "../../config/env";
import Product from "../products/product.model";
import Integration from "../integrations/integration.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import SyncLog from "./sync.model";
import { MarketplaceConnectorFactory } from "./connectors/connector.factory";
import { QUEUE_NAME } from "./sync.queue";
import { ISyncJobPayload, SyncJobAction, SyncLogStatus } from "./sync.types";
import { SyncStatus } from "../../shared/enums/sync-status.enum";

// Use REDIS_URL from Render or construct fallback for local development
const redisUrl = process.env.REDIS_URL || `redis://${env.REDIS_HOST || 'localhost'}:${env.REDIS_PORT || 6379}`;

const redisConnection = new Redis(redisUrl, {
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB || 0,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (_err) => {
  // Suppress uncaught background connection log spam if Redis is offline
});

const LOCK_TTL_MS = 30000; // 30 seconds safe TTL

export async function acquireMappingLock(productMappingId: string): Promise<string | null> {
  const lockKey = `lock:product-mapping:${productMappingId}`;
  const lockValue = `${Date.now()}:${Math.random().toString(36).substring(2)}`;

  try {
    const res = await redisConnection.set(lockKey, lockValue, "PX", LOCK_TTL_MS, "NX");
    return res === "OK" ? lockValue : null;
  } catch {
    // In test environment without active Redis server, fall back to inline lock
    return lockValue;
  }
}

export async function releaseMappingLock(productMappingId: string, lockValue: string): Promise<void> {
  const lockKey = `lock:product-mapping:${productMappingId}`;
  try {
    const currentValue = await redisConnection.get(lockKey);
    if (currentValue === lockValue) {
      await redisConnection.del(lockKey);
    }
  } catch {
    // Non-blocking release fallback
  }
}

export function isRetryableError(errorMsg: string): boolean {
  const msg = (errorMsg || "").toLowerCase();

  // Explicit Non-Retryable Indicators (Auth failures, bad data, missing credentials/parameters)
  if (
    msg.includes("http 400") ||
    msg.includes("http 401") ||
    msg.includes("http 403") ||
    msg.includes("authentication error") ||
    msg.includes("authorization error") ||
    msg.includes("invalid product data") ||
    msg.includes("missing") ||
    msg.includes("invalid") ||
    msg.includes("is required for update operation") ||
    msg.includes("is required for delete operation")
  ) {
    return false;
  }

  // Explicit Retryable Indicators (Rate limits, server errors, timeouts, resets, outages, locks)
  if (
    msg.includes("http 429") ||
    msg.includes("rate limit") ||
    msg.includes("throttled") ||
    msg.includes("http 500") ||
    msg.includes("http 502") ||
    msg.includes("http 503") ||
    msg.includes("http 504") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("lock acquisition failure")
  ) {
    return true;
  }

  // Default fallback: treat unknown network/transient failures as retryable
  return true;
}

export async function processSyncJob(job: Job<ISyncJobPayload>) {
  const { syncLogId, productId, productMappingId, integrationId, action } = job.data;
  const currentAttempt = (job.attemptsMade || 0) + 1;
  const maxAttempts = job.opts?.attempts || env.SYNC_MAX_RETRIES || 3;

  // Step 1: Acquire per-mapping lock
  const lockValue = await acquireMappingLock(productMappingId);
  if (!lockValue) {
    const lockError = `Temporary lock acquisition failure for product mapping ${productMappingId}`;
    throw new Error(lockError);
  }

  try {
    // Step 2: Re-fetch fresh ProductMapping & Product from MongoDB AFTER acquiring lock
    const mapping = await ProductMapping.findOne({ _id: productMappingId, isDeleted: false });
    const product = await Product.findOne({ _id: productId, isDeleted: false });
    const integration = await Integration.findOne({ _id: integrationId });

    const currentSyncLog = await SyncLog.findById(syncLogId);
    if (!currentSyncLog) {
      throw new UnrecoverableError(`SyncLog ${syncLogId} not found`);
    }

    // Step 3: Unpublished / Inactive / Deleted Stale-Job Guard
    if (
      !mapping ||
      mapping.isDeleted ||
      !mapping.isActive ||
      mapping.syncStatus === SyncStatus.UNPUBLISHED
    ) {
      if (action === SyncJobAction.UPDATE) {
        await SyncLog.findByIdAndUpdate(syncLogId, {
          status: SyncLogStatus.COMPLETED,
          completedAt: new Date(),
          error: "Skipped: mapping is unpublished or inactive",
        });
        return { success: true, skipped: true, reason: "Unpublished or inactive mapping" };
      }
    }

    // Step 4: Validate Product and Integration
    if (!product) {
      const errorMsg = `Master product ${productId} not found or deleted`;
      await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
      throw new UnrecoverableError(errorMsg);
    }

    if (!mapping) {
      const errorMsg = `Product mapping ${productMappingId} not found or deleted`;
      await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
      throw new UnrecoverableError(errorMsg);
    }

    if (!integration || !integration.isActive) {
      const errorMsg = `Integration ${integrationId} is inactive or missing`;
      await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, completedAt: new Date(), error: errorMsg });
      throw new UnrecoverableError(errorMsg);
    }

    // Step 5: Check if superseded by a newer job for the same ProductMapping
    const newerLogExists = await SyncLog.exists({
      productMappingId,
      createdAt: { $gt: currentSyncLog.createdAt },
      status: { $in: [SyncLogStatus.PROCESSING, SyncLogStatus.COMPLETED] },
    });

    if (action === SyncJobAction.UPDATE && newerLogExists) {
      await SyncLog.findByIdAndUpdate(syncLogId, {
        status: SyncLogStatus.COMPLETED,
        completedAt: new Date(),
        error: "Skipped: Superseded by a newer product update",
      });
      return { success: true, skipped: true, reason: "Superseded by a newer product update" };
    }

    // Step 6: Mark SyncLog PROCESSING
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: SyncLogStatus.PROCESSING,
      attempts: currentAttempt,
      maxAttempts,
      startedAt: new Date(),
    });

    // Step 7: Resolve Connector & Construct Latest Payload using fresh Product data
    const connector = MarketplaceConnectorFactory.getConnector(integration.platform);
    const syncPayload = {
      sku: product.sku,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      images: product.images,
      price: product.price,
      quantity: product.quantity,
      shippingCharge: product.shippingCharge,
      status: product.status,
      externalProductId: mapping.externalProductId,
      externalVariantId: mapping.externalVariantId,
      credentials: integration.credentials,
    };

    // Step 8: Execute action
    let result;
    if (action === SyncJobAction.CREATE) {
      result = await connector.createProduct(syncPayload);
    } else if (action === SyncJobAction.DELETE) {
      result = await connector.deleteProduct(syncPayload);
    } else {
      result = await connector.updateProduct(syncPayload);
    }

    // Step 9: Handle Connector Failure
    if (!result.success) {
      const errorMsg = result.error || "Marketplace API sync failed";
      const retryable = isRetryableError(errorMsg);

      if (!retryable) {
        await SyncLog.findByIdAndUpdate(syncLogId, {
          status: SyncLogStatus.FAILED,
          completedAt: new Date(),
          error: errorMsg,
        });
        await ProductMapping.findByIdAndUpdate(productMappingId, {
          syncStatus: SyncStatus.FAILED,
          lastSyncError: errorMsg,
        });
        throw new UnrecoverableError(errorMsg);
      } else {
        throw new Error(errorMsg);
      }
    }

    // Step 10: Handle Connector Success
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: SyncLogStatus.COMPLETED,
      completedAt: new Date(),
      error: "",
    });

    const updateMappingData: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      lastSyncError: "",
    };

    if (action === SyncJobAction.DELETE) {
      updateMappingData.syncStatus = SyncStatus.UNPUBLISHED;
      updateMappingData.externalProductId = "";
      updateMappingData.externalVariantId = "";
      updateMappingData.isActive = false;
    } else {
      updateMappingData.syncStatus = SyncStatus.SYNCED;
      updateMappingData.isActive = true;

      if (result.externalProductId) {
        updateMappingData.externalProductId = result.externalProductId;
      }
      if (result.externalVariantId) {
        updateMappingData.externalVariantId = result.externalVariantId;
      }
      if (result.externalSku) {
        updateMappingData.externalSku = result.externalSku;
      }
    }

    await ProductMapping.findByIdAndUpdate(productMappingId, updateMappingData);
    return result;

  } finally {
    // Step 11: ALWAYS release per-mapping lock in finally block
    await releaseMappingLock(productMappingId, lockValue);
  }
}

export const productSyncWorker = redisConnection
  ? new Worker<ISyncJobPayload>(
      QUEUE_NAME,
      processSyncJob,
      {
        connection: redisConnection,
        concurrency: env.SYNC_CONCURRENCY || 5,
      }
    )
  : null;

// Worker Event Listeners for Error & Failure Tracking
productSyncWorker?.on("failed", async (job, err) => {
  if (!job) return;

  const currentAttempt = job.attemptsMade;
  const maxAttempts = job.opts.attempts || env.SYNC_MAX_RETRIES || 3;
  const isFinalAttempt = currentAttempt >= maxAttempts;

  const syncLogId = job.data.syncLogId;
  const productMappingId = job.data.productMappingId;

  if (isFinalAttempt) {
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: SyncLogStatus.FAILED,
      completedAt: new Date(),
      error: err.message,
    });

    await ProductMapping.findByIdAndUpdate(productMappingId, {
      syncStatus: SyncStatus.FAILED,
      lastSyncError: err.message,
    });
  } else {
    await SyncLog.findByIdAndUpdate(syncLogId, {
      error: err.message,
    });
  }
});