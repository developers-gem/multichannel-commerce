import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller";

import { validate } from "../../middlewares/validate.middleware";
import {
  createProductSchema,
  updateProductSchema,
} from "./product.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createProductSchema),
  createProduct
);

router.get(
  "/",
  authenticate,
  getAllProducts
);

router.get(
  "/:id",
  authenticate,
  getProductById
);

router.put(
  "/:id",
  authenticate,
  validate(updateProductSchema),
  updateProduct
);

router.delete(
  "/:id",
  authenticate,
  deleteProduct
);

export default router;