import { Request, Response } from "express";

import { authService } from "./auth.service";

import { asyncHandler } from "../../utils/asyncHandler";

export const login = asyncHandler(async (req: Request, res: Response) => {

  const { email, password } = req.body;

  const response = await authService.login(
    email,
    password
  );

  res.status(200).json(response);

});