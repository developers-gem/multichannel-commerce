import { Document, Types } from "mongoose";
import { Platform } from "../../shared/enums/platform.enum";

export interface IPlatformConfig extends Document {
  platform: Platform;
  defaultFeePercentage: number;
  defaultFixedFee: number;
  defaultPaymentFeePercentage: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePlatformConfigDto {
  defaultFeePercentage?: number;
  defaultFixedFee?: number;
  defaultPaymentFeePercentage?: number;
}
