import { Request, Response } from "express";
import { syncService } from "./sync.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { SYNC_MESSAGES } from "./sync.messages";
import { SyncJobAction, SyncLogStatus } from "./sync.types";
import { objectIdSchema, productMappingIdParamSchema } from "./sync.validation";

export const manualSyncProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const paramValidation = productMappingIdParamSchema.safeParse({
      productMappingId: req.params.productMappingId,
    });

    if (!paramValidation.success) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, SYNC_MESSAGES.INVALID_OBJECT_ID);
    }

    const { productMappingId } = paramValidation.data;
    const action = (req.body?.action as SyncJobAction) || SyncJobAction.UPDATE;

    const result = await syncService.enqueueSyncJob(productMappingId, action);

    return res.status(HTTP_STATUS.ACCEPTED).json(
      new ApiResponse(true, SYNC_MESSAGES.JOB_ENQUEUED, result)
    );
  }
);

export const getAllSyncLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filters = {
      status: req.query.status as SyncLogStatus,
      integrationId: req.query.integrationId as string,
      productMappingId: req.query.productMappingId as string,
      productId: req.query.productId as string,
    };

    const data = await syncService.getSyncLogs(page, limit, filters);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, SYNC_MESSAGES.SYNC_LOGS_FETCHED, data)
    );
  }
);

export const getSyncLogById = asyncHandler(
  async (req: Request, res: Response) => {
    const paramValidation = objectIdSchema.safeParse({ id: req.params.id });

    if (!paramValidation.success) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, SYNC_MESSAGES.INVALID_OBJECT_ID);
    }

    const syncLog = await syncService.getSyncLogById(paramValidation.data.id);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, SYNC_MESSAGES.SYNC_LOGS_FETCHED, syncLog)
    );
  }
);

export const retrySyncLog = asyncHandler(
  async (req: Request, res: Response) => {
    const paramValidation = objectIdSchema.safeParse({ id: req.params.id });

    if (!paramValidation.success) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, SYNC_MESSAGES.INVALID_OBJECT_ID);
    }

    const result = await syncService.retrySyncJob(paramValidation.data.id);

    return res.status(HTTP_STATUS.ACCEPTED).json(
      new ApiResponse(true, SYNC_MESSAGES.JOB_ENQUEUED, result)
    );
  }
);
