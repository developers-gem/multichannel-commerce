import { Request, Response } from "express";

import { integrationService } from "./integration.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

export const createIntegration = asyncHandler(
  async (req: Request, res: Response) => {
    const integration = await integrationService.create(req.body);

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
    const integrations = await integrationService.getAll();

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
    const id = String(req.params.id);
    const integration = await integrationService.getById(id);

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
    const id = String(req.params.id);
    const integration = await integrationService.update(
      id,
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
    const id = String(req.params.id);
    await integrationService.delete(id);

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
    const id = String(req.params.id);
    const result = await integrationService.testConnection(id);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        result.success,
        result.message,
        result
      )
    );
  }
);