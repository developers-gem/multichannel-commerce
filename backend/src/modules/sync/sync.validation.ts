import { z } from "zod";
import { SyncJobAction, SyncLogStatus } from "./sync.types";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid ObjectId format"),
});

export const productMappingIdParamSchema = z.object({
  productMappingId: z.string().regex(objectIdRegex, "Invalid ProductMapping ObjectId format"),
});

export const manualSyncBodySchema = z.object({
  action: z.nativeEnum(SyncJobAction).optional().default(SyncJobAction.UPDATE),
});

export const getSyncLogsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(SyncLogStatus).optional(),
  integrationId: z.string().regex(objectIdRegex, "Invalid Integration ObjectId format").optional(),
  productMappingId: z.string().regex(objectIdRegex, "Invalid ProductMapping ObjectId format").optional(),
  productId: z.string().regex(objectIdRegex, "Invalid Product ObjectId format").optional(),
});
