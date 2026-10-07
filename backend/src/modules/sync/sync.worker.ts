import { Worker, Job, UnrecoverableError } from "bullmq";
import { env } from "../../config/env";
import Product from "../products/product.model";
import Integration from "../integrations/integration.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import SyncLog from "./sync.model";
import { MarketplaceConnectorFactory } from "./connectors/connector.factory";
import { QUEUE_NAME, redisConnection } from "./sync.queue";
import { ISyncJobPayload, SyncJobAction, SyncLogStatus } from "./sync.types";
import { SyncStatus } from "../../shared/enums/sync-status.enum";
import { resolveChannelPrice, resolveChannelQuantity } from "./channel-values";

const LOCK_TTL_MS = 30000; // 30 seconds safe TTL

export async function acquireMappingLock(productMappingId: string): Promise<string | null> {
  const lockKey = `lock:product-mapping:${productMappingId}`;
  const lockValue = `${Date.now()}:${Math.random().toString(36).substring(2)}`;

  try {
    const res = await redisConnection?.set(lockKey, lockValue, "PX", LOCK_TTL_MS, "NX");
    return res === "OK" ? lockValue : null;
  } catch {
    // In test environment without active Redis server, fall back to inline lock
    return lockValue;
  }
}

export async function releaseMappingLock(productMappingId: string, lockValue: string): Promise<void> {
  const lockKey = `lock:product-mapping:${productMappingId}`;
  try {
    const currentValue = await redisConnection?.get(lockKey);
    if (currentValue === lockValue) {
      await redisConnection?.del(lockKey);
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
  console.log(
  `[SYNC WORKER] Processing job=${job.id} mapping=${productMappingId} platform action=${action} syncLog=${syncLogId}`
);
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
    const product = await Product.findOne({
      _id: productId,
      ...(action === SyncJobAction.DELETE ? {} : { isDeleted: false }),
    });
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

    // Step 5: Check if superseded by a newer UPDATE job for the same ProductMapping
    const newerLogExists = await SyncLog.exists({
      productMappingId,
      action: SyncJobAction.UPDATE,
      createdAt: { $gt: currentSyncLog.createdAt },
      _id: { $ne: currentSyncLog._id },
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
       // Step 6: Mark SyncLog PROCESSING
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: SyncLogStatus.PROCESSING,
      attempts: currentAttempt,
      maxAttempts,
      startedAt: new Date(),
    });

    // Step 7: Resolve Connector & Construct Latest Payload
    // using fresh Product and ProductMapping data
    const connector = MarketplaceConnectorFactory.getConnector(
      integration.platform
    );

    const syncPayload = {
      sku: product.sku,
      title: product.title,
      description: product.description,
      brand: product.brand,
      category: product.category,
      images: product.images,

      // IMPORTANT:
      // Use channel-specific values from the mapping.
      price: resolveChannelPrice(mapping.channelPrice, product.price),
      currency: mapping.channelCurrency || product.currency || undefined,
      quantity: resolveChannelQuantity(
        mapping.channelQuantity,
        product.quantity
      ),

      shippingCharge: product.shippingCharge,
      status: product.status,

      // Existing marketplace listing IDs
      externalProductId: mapping.externalProductId,
      externalVariantId: mapping.externalVariantId,
      externalInventoryItemId: mapping.externalInventoryItemId,

      storeUrl: integration.storeUrl,
      integrationId: integration._id.toString(),

      channelCategoryId: mapping.channelCategoryId || undefined,
      channelCategoryName: mapping.channelCategoryName || undefined,
      channelAspects: mapping.channelAspects || undefined,

      credentials: {
        ...integration.credentials,
        storeUrl: integration.storeUrl,
        ...(mapping.channelCategoryId
          ? { categoryId: mapping.channelCategoryId }
          : {}),
      },
    };

    // DEBUG: This log must come AFTER syncPayload is created.
    console.log(
      `[SYNC WORKER] Calling connector platform=${integration.platform} ` +
        `mapping=${productMappingId} ` +
        `price=${syncPayload.price} ` +
        `quantity=${syncPayload.quantity} ` +
        `externalProductId=${syncPayload.externalProductId} ` +
        `externalVariantId=${syncPayload.externalVariantId}`
    );

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
          ...(result.externalProductId ? { externalId: result.externalProductId } : {}),
        });
        await ProductMapping.findByIdAndUpdate(productMappingId, {
          syncStatus: SyncStatus.FAILED,
          lastSyncError: errorMsg,
          ...(result.categoryId ? { channelCategoryId: result.categoryId } : {}),
          ...(result.categoryName ? { channelCategoryName: result.categoryName } : {}),
          ...(result.missingAspects ? { missingAspects: result.missingAspects } : {}),
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
      ...(result.externalProductId ? { externalId: result.externalProductId } : {}),
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
      if (result.externalInventoryItemId) {
        updateMappingData.externalInventoryItemId = result.externalInventoryItemId;
      }
      if (result.categoryId) updateMappingData.channelCategoryId = result.categoryId;
      if (result.categoryName) updateMappingData.channelCategoryName = result.categoryName;
      if (result.aspects) updateMappingData.channelAspects = result.aspects;
      updateMappingData.missingAspects = [];
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
        autorun: false,
      }
    )
  : null;

let workerStarted = false;
export function startProductSyncWorker(): void {
  if (!productSyncWorker || workerStarted) return;
  workerStarted = true;
  void productSyncWorker.run().catch((error) => {
    workerStarted = false;
    console.error("Product sync worker stopped unexpectedly:", error);
  });
}

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