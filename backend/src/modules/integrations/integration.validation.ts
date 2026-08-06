import { z } from "zod";
import { Platform } from "../../shared/enums/platform.enum";

export const createIntegrationSchema = z.object({
  platform: z.nativeEnum(Platform),

  storeName: z.string().min(2),

  storeUrl: z.string().url(),

  credentials: z.record(z.string(), z.unknown()),
});

export type CreateIntegrationInput = z.infer<
  typeof createIntegrationSchema
>;