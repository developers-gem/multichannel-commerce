import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createProductMapping,
  getAllProductMappings,
  getProductMappingById,
  updateProductMapping,
  deleteProductMapping,
  unpublishProductMapping,
} from "./product-mapping.controller";

import { validate } from "../../middlewares/validate.middleware";
import {
  createProductMappingSchema,
  updateProductMappingSchema,
} from "./product-mapping.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createProductMappingSchema),
  createProductMapping
);

router.get(
  "/",
  authenticate,
  getAllProductMappings
);

router.get(
  "/:id",
  authenticate,
  getProductMappingById
);

router.put(
  "/:id",
  authenticate,
  validate(updateProductMappingSchema),
  updateProductMapping
);

router.delete(
  "/:id",
  authenticate,
  deleteProductMapping
);

router.post(
  "/:id/unpublish",
  authenticate,
  unpublishProductMapping
);

export default router;
