import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import integrationRoutes from "./modules/integrations/integration.routes";


const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(compression());

app.use(morgan("dev"));

app.use(errorHandler);
app.use("/api/auth", authRoutes);
app.use("/api/integrations", integrationRoutes);
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running 🚀",
  });
});

export default app;