import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import {
  createProductMappingSchema,
  updateProductMappingSchema,
} from "./product-mapping.validation";
import {
  createProductMapping,
  getAllProductMappings,
  getProductMappingById,
  updateProductMapping,
  deleteProductMapping,
} from "./product-mapping.controller";

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

export default router;
