import { Platform } from "../../shared/enums/platform.enum";

export interface CreateIntegrationDto {
  platform: Platform;
  storeName: string;
  storeUrl: string;
  credentials: Record<string, unknown>;
}