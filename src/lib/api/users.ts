import { api } from "@/lib/api";
import type { ApiResponse, PageResponse, User } from "@/lib/types";

export const usersApi = {
  getAll: (params?: {
    keyword?: string;
    role?: string;
    page?: number;
    size?: number;
  }) =>
    api.get<ApiResponse<PageResponse<User>>>("/api/admin/users", { params }),

  getOne: (id: number) =>
    api.get<ApiResponse<User>>(`/api/admin/users/${id}`),

  create: (data: {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    role?: string;
  }) => api.post<ApiResponse<User>>("/api/admin/users", data),

  update: (id: number, data: { fullName: string; phone?: string }) =>
    api.patch<ApiResponse<User>>(`/api/admin/users/${id}`, data),

  updateRole: (id: number, role: "user" | "admin") =>
    api.patch<ApiResponse<User>>(`/api/admin/users/${id}/role`, { role }),

  lock: (id: number, data: { reason: string }) =>
    api.patch<ApiResponse<User>>(`/api/admin/users/${id}/lock`, data),

  unlock: (id: number) =>
    api.patch<ApiResponse<User>>(`/api/admin/users/${id}/unlock`, {}),
};
