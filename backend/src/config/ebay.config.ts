// src/config/ebay.config.ts
import dotenv from "dotenv";

dotenv.config();
const isSandbox = process.env.EBAY_ENVIRONMENT === "sandbox";

export const ebayConfig = {
  environment: process.env.EBAY_ENVIRONMENT || "sandbox",

  clientId: process.env.EBAY_CLIENT_ID!,
  clientSecret: process.env.EBAY_CLIENT_SECRET!,
  devId: process.env.EBAY_DEV_ID!,

  authorizationUrl: isSandbox
    ? "https://auth.sandbox.ebay.com/oauth2/authorize"
    : "https://auth.ebay.com/oauth2/authorize",

  tokenUrl: isSandbox
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token",
};