import { Request, Response } from "express";
import "../../types/express.types";

import { integrationService } from "./integration.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

export const createIntegration = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const integration = await integrationService.create(userId, req.body);

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        true,
        "Integration created successfully",
        integration
      )
    );
  }
);

export const getAllIntegrations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const integrations = await integrationService.getAll(userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Integrations fetched successfully",
        integrations
      )
    );
  }
);

export const getIntegrationById = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const id = String(req.params.id);
    const integration = await integrationService.getById(id, userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Integration fetched successfully",
        integration
      )
    );
  }
);

export const updateIntegration = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const id = String(req.params.id);
    const integration = await integrationService.update(
      id,
      userId,
      req.body
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Integration updated successfully",
        integration
      )
    );
  }
);

export const deleteIntegration = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const id = String(req.params.id);
    await integrationService.delete(id, userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Integration deleted successfully"
      )
    );
  }
);

export const testIntegrationConnection = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id);
    const id = String(req.params.id);
    const result = await integrationService.testConnection(id, userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        result.success,
        result.message,
        result
      )
    );
  }
);

export const initiateShopifyAuth = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id || "");
    const shop = String(req.query.shop || "");
    const authUrl = await integrationService.getShopifyAuthorizeUrl(shop, userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, "Shopify authorization URL generated", { authUrl })
    );
  }
);

export const handleShopifyCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const redirectUrl = await integrationService.handleShopifyCallback(req.query);
    return res.redirect(redirectUrl);
  }
);

export const initiateEbayAuth = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = String(req.user?._id || "");
    const authUrl = await integrationService.getEbayAuthorizeUrl(userId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, "eBay authorization URL generated", { authUrl })
    );
  }
);

export const handleEbayCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const redirectUrl = await integrationService.handleEbayCallback(req.query);
    return res.redirect(redirectUrl);
  }
);