import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  manualSyncProduct,
  getAllSyncLogs,
  getSyncLogById,
  retrySyncLog,
} from "./sync.controller";

const router = Router();

// Manual Sync trigger for a Product Mapping
router.post("/products/:productMappingId", authenticate, manualSyncProduct);

// Query Sync Logs (Paginated & Filtered)
router.get("/", authenticate, getAllSyncLogs);

// Single Sync Log details
router.get("/:id", authenticate, getSyncLogById);

// Retry Failed Sync Job
router.post("/:id/retry", authenticate, retrySyncLog);

export default router;
