import { Request, Response } from "express";

import { productService } from "./product.service";
import { PRODUCT_MESSAGES } from "./product.messages";
import { syncService } from "../sync/sync.service";
import { SyncJobAction } from "../sync/sync.types";

import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";

import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

export const createProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.create(req.body);

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        true,
        PRODUCT_MESSAGES.CREATED,
        product
      )
    );
  }
);

export const getAllProducts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = String(req.query.search || "");

    const products = await productService.getAll(
      page,
      limit,
      search
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        PRODUCT_MESSAGES.FETCHED_ALL,
        products
      )
    );
  }
);

export const getProductById = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.getById(
      String(req.params.id)
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        PRODUCT_MESSAGES.FETCHED,
        product
      )
    );
  }
);

export const updateProduct = asyncHandler(
  async (req: Request, res: Response) => {
    const product = await productService.update(
      String(req.params.id),
      req.body
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        PRODUCT_MESSAGES.UPDATED,
        product
      )
    );
  }
);

export const deleteProduct = asyncHandler(
  async (req: Request, res: Response) => {
    await productService.delete(
      String(req.params.id)
    );

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        true,
        PRODUCT_MESSAGES.DELETED
      )
    );
  }
);

export const syncProductChannels = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = String(req.params.id);
    const syncLogs = await syncService.enqueueSyncJobsForProduct(
      productId,
      SyncJobAction.UPDATE
    );

    return res.status(HTTP_STATUS.ACCEPTED).json(
      new ApiResponse(
        true,
        `Synchronization jobs queued for ${syncLogs.length} active channel mapping(s)`,
        { enqueuedCount: syncLogs.length, syncLogs }
      )
    );
  }
);

export const publishProductToChannels = asyncHandler(
  async (req: Request, res: Response) => {
    const productId = String(req.params.id);
    const { integrationIds } = req.body;

    const results = await productService.publishToChannels(productId, integrationIds);

    return res.status(HTTP_STATUS.ACCEPTED).json(
      new ApiResponse(
        true,
        `Publishing jobs enqueued for ${results.length} channel integration(s)`,
        { enqueuedCount: results.length, results }
      )
    );
  }
);