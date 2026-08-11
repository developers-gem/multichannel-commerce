import { Types } from "mongoose";
import Product from "../products/product.model";
import Integration from "../integrations/integration.model";
import ProductMapping from "../product-mappings/product-mapping.model";
import SyncLog from "./sync.model";
import { productSyncQueue } from "./sync.queue";
import { ISyncJobPayload, SyncJobAction, SyncLogStatus } from "./sync.types";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { SYNC_MESSAGES } from "./sync.messages";
import { env } from "../../config/env";

class SyncService {
  /**
   * Enqueue a Sync Job for a given ProductMapping and Action
   */
  async enqueueSyncJob(productMappingId: string, action: SyncJobAction = SyncJobAction.UPDATE) {
    // 1. Verify ProductMapping exists and is active
    const mapping = await ProductMapping.findOne({
      _id: productMappingId,
      isDeleted: false,
    });

    if (!mapping) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, SYNC_MESSAGES.MAPPING_NOT_FOUND);
    }

    // 2. Verify master Product exists
    const product = await Product.findOne({
      _id: mapping.productId,
      isDeleted: false,
    });

    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, SYNC_MESSAGES.PRODUCT_NOT_FOUND);
    }

    // 3. Verify Integration exists and is active
    const integration = await Integration.findOne({
      _id: mapping.integrationId,
    });

    if (!integration || !integration.isActive) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, SYNC_MESSAGES.INTEGRATION_INACTIVE);
    }

    // 4. Idempotency Check: Prevent duplicate active jobs for the same ProductMapping + Action
    const activeSyncLog = await SyncLog.findOne({
      productMappingId: mapping._id,
      action,
      status: { $in: [SyncLogStatus.PENDING, SyncLogStatus.PROCESSING] },
    });

    if (activeSyncLog) {
      throw new ApiError(HTTP_STATUS.CONFLICT, SYNC_MESSAGES.DUPLICATE_JOB);
    }

    // 5. Create new SyncLog audit record
    const maxAttempts = env.SYNC_MAX_RETRIES || 3;
    const syncLog = await SyncLog.create({
      productId: product._id,
      productMappingId: mapping._id,
      integrationId: integration._id,
      action,
      status: SyncLogStatus.PENDING,
      attempts: 0,
      maxAttempts,
      error: "",
    });

    const jobPayload: ISyncJobPayload = {
      syncLogId: syncLog._id.toString(),
      productId: product._id.toString(),
      productMappingId: mapping._id.toString(),
      integrationId: integration._id.toString(),
      action,
    };

    // 6. Push job to BullMQ queue
    if (!productSyncQueue) {
      return {
        syncLogId: syncLog._id,
        jobId: syncLog._id.toString(),
        status: SyncLogStatus.PENDING,
        fallback: true,
      };
    }

    try {
      const job = await productSyncQueue.add("syncJob", jobPayload, {
        jobId: syncLog._id.toString(),
      });

      return {
        syncLogId: syncLog._id,
        jobId: job?.id || syncLog._id.toString(),
        status: SyncLogStatus.PENDING,
      };
    } catch (queueErr) {
      // Return syncLogId even if queue push succeeds in mock or fallback mode
      return {
        syncLogId: syncLog._id,
        jobId: syncLog._id.toString(),
        status: SyncLogStatus.PENDING,
      };
    }
  }

  /**
   * Enqueue Sync Jobs for ALL active, non-deleted ProductMappings belonging to a Master Product
   */
  async enqueueSyncJobsForProduct(
    productId: string | Types.ObjectId,
    action: SyncJobAction = SyncJobAction.UPDATE
  ) {
    const targetId = new Types.ObjectId(productId.toString());

    const activeMappings = await ProductMapping.find({
      productId: targetId,
      isActive: true,
      isDeleted: false,
    });

    if (!activeMappings || activeMappings.length === 0) {
      return [];
    }

    const results = [];

    for (const mapping of activeMappings) {
      try {
        const res = await this.enqueueSyncJob(mapping._id.toString(), action);
        results.push(res);
      } catch (err: any) {
        // Skip duplicate active jobs (409) or inactive integrations (400) without throwing to allow other mappings to process
      }
    }

    return results;
  }

  /**
   * Get Paginated Sync Logs with safe populated references (Credentials stripped)
   */
  async getSyncLogs(
    page: number = 1,
    limit: number = 20,
    filters: {
      status?: SyncLogStatus;
      integrationId?: string;
      productMappingId?: string;
      productId?: string;
    } = {}
  ) {
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters.status) query.status = filters.status;
    if (filters.integrationId) query.integrationId = filters.integrationId;
    if (filters.productMappingId) query.productMappingId = filters.productMappingId;
    if (filters.productId) query.productId = filters.productId;

    const [logs, total] = await Promise.all([
      SyncLog.find(query)
        .populate("productId", "sku title")
        .populate("integrationId", "platform storeName storeUrl")
        .populate("productMappingId", "externalProductId externalVariantId externalSku")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),

      SyncLog.countDocuments(query),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single SyncLog details by ID
   */
  async getSyncLogById(id: string) {
    const syncLog = await SyncLog.findById(id)
      .populate("productId", "sku title description price quantity status")
      .populate("integrationId", "platform storeName storeUrl")
      .populate("productMappingId", "externalProductId externalVariantId externalSku syncStatus");

    if (!syncLog) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, SYNC_MESSAGES.SYNC_LOG_NOT_FOUND);
    }

    return syncLog;
  }

  /**
   * Retry a FAILED sync job by creating a new SyncLog and BullMQ job
   */
  async retrySyncJob(syncLogId: string) {
    const existingLog = await SyncLog.findById(syncLogId);

    if (!existingLog) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, SYNC_MESSAGES.SYNC_LOG_NOT_FOUND);
    }

    if (existingLog.status !== SyncLogStatus.FAILED) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, SYNC_MESSAGES.RETRY_ONLY_FAILED);
    }

    // Create a new execution attempt while preserving the original historical SyncLog
    return this.enqueueSyncJob(
      existingLog.productMappingId.toString(),
      existingLog.action
    );
  }
}

export const syncService = new SyncService();
