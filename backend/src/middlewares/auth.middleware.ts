import { Request, Response, NextFunction } from "express";
import User from "../modules/auth/user.model";
import { ApiError } from "../utils/ApiError";
import { HTTP_STATUS } from "../shared/constants/http-status.constants";
import { verifyToken } from "../utils/jwt";

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
        "Unauthorized: Missing or malformed token"
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized: Token missing"
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized: Invalid or expired token"
      );
    }

    if (!decoded || !decoded.id) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized: Invalid token payload"
      );
    }

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized: User not found"
      );
    }

    if (!user.isActive) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        "Unauthorized: User account is inactive"
      );
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};