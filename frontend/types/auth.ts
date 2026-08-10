import { ApiResponse } from "./common";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  role: string;
}

export interface AuthData {
  user: User;
  token: string;
}

export type LoginResponse = ApiResponse<AuthData>;