// src/config/ebay.config.ts
import dotenv from "dotenv";

dotenv.config();

const environment = process.env.EBAY_ENVIRONMENT || process.env.EBAY_MODE || "sandbox";
const isSandbox = environment === "sandbox";

export const ebayConfig = {
  environment,
  clientId: process.env.EBAY_CLIENT_ID!,
  clientSecret: process.env.EBAY_CLIENT_SECRET!,
  devId: process.env.EBAY_DEV_ID || "",
  ruName: process.env.EBAY_RU_NAME!, // Added RuName with non-null assertion for eBay OAuth redirection

  authorizationUrl: isSandbox
    ? "https://auth.sandbox.ebay.com/oauth2/authorize"
    : "https://auth.ebay.com/oauth2/authorize",

  tokenUrl: isSandbox
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token",
};