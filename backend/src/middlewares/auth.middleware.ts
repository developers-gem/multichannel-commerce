import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import User from "../modules/auth/user.model";

import { ApiError } from "../utils/ApiError";

import { HTTP_STATUS } from "../shared/constants/http-status.constants";

interface AuthTokenPayload extends JwtPayload {
  userId: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized"
      );
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthTokenPayload;

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "User not found"
      );
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};