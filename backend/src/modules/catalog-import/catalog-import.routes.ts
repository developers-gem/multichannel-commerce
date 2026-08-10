import { Router } from "express";
import { importChannelCatalog } from "./catalog-import.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// POST /api/catalog-import/:integrationId
router.post("/:integrationId", authenticate, importChannelCatalog);

export default router;
