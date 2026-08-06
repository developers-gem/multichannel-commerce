import { ApiResponse } from "./common";

export interface Integration {
  _id: string;
  platform: string;
  storeName: string;
  storeUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IntegrationResponse = ApiResponse<Integration[]>;