import { Request, Response, NextFunction } from "express";

import { ZodError } from "zod";

import { ApiError } from "../utils/ApiError";

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation Failed",
      errors: error.issues,
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};