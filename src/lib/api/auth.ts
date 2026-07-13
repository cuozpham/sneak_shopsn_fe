import { api } from "@/lib/api";
import type { ApiResponse, AuthResponse } from "@/lib/types";

export const authApi = {
  login: (identity: string, password: string) =>
    api.post<ApiResponse<AuthResponse>>("/api/auth/login", { identity, password }),

  register: (data: {
    email: string;
    fullName: string;
    phone?: string;
    password: string;
    otp: string;
  }) => api.post<ApiResponse<AuthResponse>>("/api/auth/register", data),

  registerPhone: (data: {
    phone: string;
    fullName: string;
    password: string;
  }) => api.post<ApiResponse<AuthResponse>>("/api/auth/register-phone", data),

  googleLogin: (data: { idToken?: string; accessToken?: string }) =>
    api.post<ApiResponse<AuthResponse>>("/api/auth/google", data),

  googleLoginOnly: (data: { idToken?: string; accessToken?: string }) =>
    api.post<ApiResponse<AuthResponse>>("/api/auth/google/login", data),

  me: () => api.get<ApiResponse<AuthResponse>>("/api/auth/me"),

  sendRegisterOtp: (email: string) =>
    api.post<ApiResponse<null>>("/api/auth/send-register-otp", { email }),

  verifyRegisterOtp: (email: string, otp: string) =>
    api.post<ApiResponse<null>>("/api/auth/verify-register-otp", { email, otp }),

  sendPhoneOtp: (phone: string) =>
    api.post<ApiResponse<null>>("/api/auth/send-phone-otp", { phone }),

  sendEmailVerificationOtp: (email: string) =>
    api.post<ApiResponse<null>>("/api/auth/send-email-verification-otp", { email }),

  verifyPhoneOtp: (phone: string, otp: string) =>
    api.post<ApiResponse<null>>("/api/auth/verify-phone-otp", { phone, otp }),

  verifyEmailOtp: (email: string, otp: string) =>
    api.post<ApiResponse<null>>("/api/auth/verify-email-otp", { email, otp }),

  registerEmail: (data: {
    email: string;
    fullName: string;
    phone?: string;
    password: string;
  }) => api.post<ApiResponse<AuthResponse>>("/api/auth/register-email", data),

  forgotPassword: (email: string, phone: string, fullName: string) =>
    api.post<ApiResponse<null>>("/api/auth/forgot-password", { email, phone, fullName }),

  verifyOtp: (email: string, otp: string) =>
    api.post<ApiResponse<string>>("/api/auth/verify-otp", { email, otp }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiResponse<null>>("/api/auth/reset-password", { token, newPassword }),

  requestEmailChange: (email: string) =>
    api.post<ApiResponse<null>>("/api/user/profile/email/request", { email }),

  confirmEmailChange: (email: string, otp: string) =>
    api.post<ApiResponse<AuthResponse>>("/api/user/profile/email/confirm", { email, otp }),
};
