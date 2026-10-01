import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { integrationService } from "./integration.service";

export const handleShopifyWebhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));
  const signature = String(req.header("x-shopify-hmac-sha256") || "");

  if (!signature || !integrationService.verifyShopifyWebhook(rawBody, signature)) {
    return res.status(401).send("Invalid Shopify webhook signature");
  }

  const topic = String(req.header("x-shopify-topic") || "");
  const shop = String(req.header("x-shopify-shop-domain") || "");
  await integrationService.handleShopifyWebhook(topic, shop, JSON.parse(rawBody.toString("utf8")));

  return res.sendStatus(200);
});
