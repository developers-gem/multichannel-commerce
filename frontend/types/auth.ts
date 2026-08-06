export interface LoginRequest {
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken?: string;
  user: User;
}