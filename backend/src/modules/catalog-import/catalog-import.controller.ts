import { Request, Response } from "express";
import { catalogImportService } from "./catalog-import.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { CATALOG_IMPORT_MESSAGES } from "./catalog-import.messages";

export const importChannelCatalog = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.integrationId;
    const integrationId = Array.isArray(rawId) ? rawId[0] : rawId;

    const summary = await catalogImportService.importChannelCatalog(integrationId);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, CATALOG_IMPORT_MESSAGES.IMPORT_SUCCESS, summary)
    );
  }
);
