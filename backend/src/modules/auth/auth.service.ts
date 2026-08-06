import User from "./user.model";

import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import { AUTH_MESSAGES } from "../../shared/messages/auth.messages";
import { HTTP_STATUS } from "../../shared/constants/http-status.constants";

import { generateToken } from "../../utils/jwt";

class AuthService {

  async login(email: string, password: string) {

    const user = await User.findOne({
      email,
    }).select("+password");

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        AUTH_MESSAGES.INVALID_CREDENTIALS
      );
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        AUTH_MESSAGES.INVALID_CREDENTIALS
      );
    }

    user.lastLogin = new Date();

    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return new ApiResponse(
      true,
      AUTH_MESSAGES.LOGIN_SUCCESS,
      {
        user,
        token,
      }
    );
  }

}

export const authService = new AuthService();