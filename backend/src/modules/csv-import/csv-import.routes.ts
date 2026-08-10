import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { uploadCsv } from "./csv-import.validation";
import { importProductsCsv } from "./csv-import.controller";

const router = Router();

router.post(
  "/products",
  authenticate,
  uploadCsv.single("file"),
  importProductsCsv
);

export default router;
