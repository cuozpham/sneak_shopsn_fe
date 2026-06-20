import { api } from "@/lib/api";
import type { ApiResponse, Category } from "@/lib/types";

export const categoriesApi = {
  getAll: () => api.get<ApiResponse<Category[]>>("/api/categories"),
  adminGetAll: (params?: { deleted?: boolean }) =>
    api.get<ApiResponse<Category[]>>("/api/admin/categories", { params }),

  adminCreate: (data: Partial<Category>) =>
    api.post<ApiResponse<Category>>("/api/admin/categories", data),

  adminUpdate: (id: number, data: Partial<Category>) =>
    api.put<ApiResponse<Category>>(`/api/admin/categories/${id}`, data),

  adminDelete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/admin/categories/${id}`),

  adminRestore: (id: number) =>
    api.put<ApiResponse<void>>(`/api/admin/categories/${id}/restore`),
};
