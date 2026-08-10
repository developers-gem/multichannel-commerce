import { Worker, Job } from "bullmq";
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

const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on("error", (_err) => {
  // Suppress uncaught background connection log spam if Redis is offline
});

export async function processSyncJob(job: Job<ISyncJobPayload>) {
  const { syncLogId, productId, productMappingId, integrationId, action } = job.data;
  const currentAttempt = (job.attemptsMade || 0) + 1;
  const maxAttempts = job.opts?.attempts || env.SYNC_MAX_RETRIES || 3;

  // 1. Fetch fresh DB records (Avoid stale data in Redis)
  const product = await Product.findOne({ _id: productId, isDeleted: false });
  const mapping = await ProductMapping.findOne({ _id: productMappingId, isDeleted: false });
  const integration = await Integration.findOne({ _id: integrationId });

  // 2. Validate records exist
  if (!product) {
    const errorMsg = `Master product ${productId} not found or deleted`;
    await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!mapping) {
    const errorMsg = `Product mapping ${productMappingId} not found or deleted`;
    await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, error: errorMsg });
    throw new Error(errorMsg);
  }

  if (!integration || !integration.isActive) {
    const errorMsg = `Integration ${integrationId} is inactive or missing`;
    await SyncLog.findByIdAndUpdate(syncLogId, { status: SyncLogStatus.FAILED, error: errorMsg });
    throw new Error(errorMsg);
  }

  // 3. Update SyncLog status to PROCESSING
  await SyncLog.findByIdAndUpdate(syncLogId, {
    status: SyncLogStatus.PROCESSING,
    attempts: currentAttempt,
    maxAttempts,
    startedAt: new Date(),
  });

  // 4. Resolve marketplace connector
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

  // 5. Execute action against connector
  let result;
  if (action === SyncJobAction.CREATE) {
    result = await connector.createProduct(syncPayload);
  } else if (action === SyncJobAction.DELETE) {
    result = await connector.deleteProduct(syncPayload);
  } else {
    result = await connector.updateProduct(syncPayload);
  }

  // 6. Handle connector response
  if (!result.success) {
    const errorMsg = result.error || "Marketplace API sync failed";
    await SyncLog.findByIdAndUpdate(syncLogId, {
      status: SyncLogStatus.FAILED,
      completedAt: new Date(),
      error: errorMsg,
    });
    await ProductMapping.findByIdAndUpdate(productMappingId, {
      syncStatus: SyncStatus.FAILED,
      lastSyncError: errorMsg,
    });
    throw new Error(errorMsg);
  }

  // 7. On SUCCESS: Update SyncLog & ProductMapping
  await SyncLog.findByIdAndUpdate(syncLogId, {
    status: SyncLogStatus.COMPLETED,
    completedAt: new Date(),
    error: "",
  });

  const updateMappingData: Record<string, unknown> = {
    syncStatus: SyncStatus.SYNCED,
    lastSyncedAt: new Date(),
    lastSyncError: "",
  };

  if (result.externalProductId) {
    updateMappingData.externalProductId = result.externalProductId;
  }
  if (result.externalVariantId) {
    updateMappingData.externalVariantId = result.externalVariantId;
  }
  if (result.externalSku) {
    updateMappingData.externalSku = result.externalSku;
  }

  await ProductMapping.findByIdAndUpdate(productMappingId, updateMappingData);

  return result;
}

export const productSyncWorker = new Worker<ISyncJobPayload>(
  QUEUE_NAME,
  processSyncJob,
  {
    connection: redisConnection,
    concurrency: env.SYNC_CONCURRENCY || 5,
  }
);

// Worker Event Listeners for Error & Failure Tracking
productSyncWorker.on("failed", async (job, err) => {
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
