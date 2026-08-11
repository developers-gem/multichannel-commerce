import { Request, Response } from "express";

import { productMappingService } from "./product-mapping.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

export const createProductMapping = asyncHandler(
  async (req: Request, res: Response) => {
    const mapping = await productMappingService.create(req.body);

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        true,
        "Product mapping created successfully",
        mapping
      )
    );
  }
);

export const getAllProductMappings = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = req.query.productId ? String(req.query.productId) : undefined;
    const mappings = await productMappingService.getAll(productId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Product mappings fetched successfully",
        mappings
      )
    );
  }
);

export const getProductMappingById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const mapping = await productMappingService.getById(id);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Product mapping fetched successfully",
        mapping
      )
    );
  }
);

export const updateProductMapping = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const mapping = await productMappingService.update(id, req.body);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Product mapping updated successfully",
        mapping
      )
    );
  }
);

export const deleteProductMapping = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    await productMappingService.delete(id);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        "Product mapping deleted successfully"
      )
    );
  }
);

export const unpublishProductMapping = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const syncJobResult = await productMappingService.unpublishChannel(id);

    return res.status(HTTP_STATUS.ACCEPTED).json(
      new ApiResponse(
        true,
        "Unpublish job enqueued for channel integration",
        syncJobResult
      )
    );
  }
);
