import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import integrationRoutes from "./modules/integrations/integration.routes";
import productRoutes from "./modules/products/product.routes";
import productMappingRoutes from "./modules/product-mappings/product-mapping.routes";
import csvImportRoutes from "./modules/csv-import/csv-import.routes";
import syncRoutes from "./modules/sync/sync.routes";
import catalogImportRoutes from "./modules/catalog-import/catalog-import.routes";
import dns from "dns";
dns.setServers(["1.1.1.1","8.8.8.8"]);

const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(compression());

app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-mappings", productMappingRoutes);
app.use("/api/csv-import", csvImportRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/catalog-import", catalogImportRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
  });
});

app.use(errorHandler);

export default app;