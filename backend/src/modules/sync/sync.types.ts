import { Types } from "mongoose";

export enum SyncJobAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
}

export enum SyncLogStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface ISyncJobPayload {
  syncLogId: string;
  productId: string;
  productMappingId: string;
  integrationId: string;
  action: SyncJobAction;
}

export interface ISyncLog {
  _id?: Types.ObjectId;
  productId: Types.ObjectId;
  productMappingId: Types.ObjectId;
  integrationId: Types.ObjectId;
  action: SyncJobAction;
  status: SyncLogStatus;
  attempts: number;
  maxAttempts: number;
  error: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
