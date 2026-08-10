import { Request, Response } from "express";
import { csvImportService } from "./csv-import.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";
import { CSV_IMPORT_MESSAGES } from "./csv-import.messages";

export const importProductsCsv = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        CSV_IMPORT_MESSAGES.NO_FILE
      );
    }

    const summary = await csvImportService.importProducts(req.file.buffer);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(true, CSV_IMPORT_MESSAGES.SUCCESS, summary)
    );
  }
);
