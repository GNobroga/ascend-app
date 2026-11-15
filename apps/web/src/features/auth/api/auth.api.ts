import type { User } from '@/features/users';
import { api } from '@/shared/api/http';
import { env } from '@/shared/env';

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type ChangePasswordRequest = {
  currentPassword?: string;
  newPassword: string;
};

export const GOOGLE_SIGN_IN_URL = `${env.VITE_API_URL}/auth/google`;

export const authApi = {
  login: (body: LoginRequest) => api.post<User>('/auth/login', body),
  register: (body: RegisterRequest) => api.post<User>('/auth/register', body),
  forgotPassword: (body: ForgotPasswordRequest) => api.post<void>('/auth/forgot-password', body),
  resetPassword: (body: ResetPasswordRequest) => api.post<void>('/auth/reset-password', body),
  logout: () => api.post<void>('/auth/logout'),
  changePassword: (body: ChangePasswordRequest) => api.post<void>('/auth/change-password', body),
  resendEmailVerification: () => api.post<void>('/auth/verify-email/resend'),
};
