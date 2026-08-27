import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createIntegration,
  getAllIntegrations,
  getIntegrationById,
  updateIntegration,
  deleteIntegration,
  testIntegrationConnection,
  initiateShopifyAuth,
  handleShopifyCallback,
} from "./integration.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createIntegrationSchema } from "./integration.validation";

const router = Router();

// Shopify OAuth Routes
router.get("/shopify/authorize", initiateShopifyAuth);
router.get("/shopify/callback", handleShopifyCallback);

router.post(
  "/",
  authenticate,
  validate(createIntegrationSchema),
  createIntegration
);

router.get("/", authenticate, getAllIntegrations);

router.get("/:id", authenticate, getIntegrationById);

router.put("/:id", authenticate, updateIntegration);

router.delete("/:id", authenticate, deleteIntegration);

router.post("/:id/test-connection", authenticate, testIntegrationConnection);

export default router;