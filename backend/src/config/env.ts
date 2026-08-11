// import dotenv from "dotenv";

// dotenv.config();

// export const env = {
//   NODE_ENV: process.env.NODE_ENV || "development",
//   PORT: Number(process.env.PORT) || 5000,

//   MONGO_URI: process.env.MONGO_URI || "",

//   JWT_SECRET: process.env.JWT_SECRET || "",

//   JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "7d") as `${number}${"d" | "h" | "m" | "s"}` | number,

//   REDIS_HOST: process.env.REDIS_HOST || "localhost",
//   REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
//   REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
//   REDIS_DB: Number(process.env.REDIS_DB) || 0,

//   SYNC_CONCURRENCY: Number(process.env.SYNC_CONCURRENCY) || 5,
//   SYNC_MAX_RETRIES: Number(process.env.SYNC_MAX_RETRIES) || 3,

//   SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2026-01",
// };

import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT) || 5000,

  MONGO_URI: process.env.MONGO_URI || "",

  JWT_SECRET: process.env.JWT_SECRET || "",

  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN || "7d") as `${number}${"d" | "h" | "m" | "s"}` | number,

  // Add REDIS_URL for Render / Cloud deployment
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
  REDIS_DB: Number(process.env.REDIS_DB) || 0,
  REDIS_ENABLED: process.env.REDIS_ENABLED === "true" || !!(process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT),

  SYNC_CONCURRENCY: Number(process.env.SYNC_CONCURRENCY) || 5,
  SYNC_MAX_RETRIES: Number(process.env.SYNC_MAX_RETRIES) || 3,

  SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || "2026-01",
};