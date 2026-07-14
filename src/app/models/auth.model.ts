export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  userName: string;
  phone: string;
  password: string;
  reEnterPassword: string;
}

export interface AuthUser {
  id?: string | number;
  userId?: string | number;
  phone?: string;
  name?: string;
  userName?: string;
  fullName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token?: string;
  accessToken?: string;
  jwt?: string;
  expiration?: string;
  expiresIn?: number;
  message?: string;
  userId?: string | number;
  userName?: string;
  role?: string;
  user?: AuthUser;
  data?: {
    token?: string;
    accessToken?: string;
    user?: AuthUser;
    userId?: string | number;
    userName?: string;
    role?: string;
  };
  [key: string]: unknown;
}

export interface ApiMessage {
  message?: string;
  [key: string]: unknown;
}
