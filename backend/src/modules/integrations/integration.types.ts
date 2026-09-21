import { Platform } from "../../shared/enums/platform.enum";

export interface CreateIntegrationDto {
  userId?: string;
  platform: Platform;
  storeName: string;
  storeUrl: string;
  credentials: Record<string, unknown>;
}