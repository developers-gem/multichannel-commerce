import { Router } from "express";

import {
  createIntegration,
  getAllIntegrations,
  getIntegrationById,
  updateIntegration,
  deleteIntegration,
} from "./integration.controller";

import { validate } from "../../middlewares/validate.middleware";
import { createIntegrationSchema } from "./integration.validation";

const router = Router();

router.post(
  "/",
  validate(createIntegrationSchema),
  createIntegration
);

router.get("/", getAllIntegrations);

router.get("/:id", getIntegrationById);

router.put("/:id", updateIntegration);

router.delete("/:id", deleteIntegration);

export default router;