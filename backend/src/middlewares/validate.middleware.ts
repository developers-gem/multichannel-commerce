import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

export const validate =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);

      next();
    } catch (error) {
      next(error);
    }
  };