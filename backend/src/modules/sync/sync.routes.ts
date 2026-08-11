import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  manualSyncProduct,
  getDashboardSummary,
  getAllSyncLogs,
  getSyncLogById,
  retrySyncLog,
} from "./sync.controller";

const router = Router();

// Dashboard Aggregation Summary
router.get("/dashboard-summary", authenticate, getDashboardSummary);

// Manual Sync trigger for a Product Mapping
router.post("/products/:productMappingId", authenticate, manualSyncProduct);

// Query Sync Logs (Paginated & Filtered)
router.get("/", authenticate, getAllSyncLogs);

// Single Sync Log details
router.get("/:id", authenticate, getSyncLogById);

// Retry Failed Sync Job
router.post("/:id/retry", authenticate, retrySyncLog);

export default router;
