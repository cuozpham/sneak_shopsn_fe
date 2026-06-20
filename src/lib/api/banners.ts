import { api } from "@/lib/api";
import type { ApiResponse, Banner } from "@/lib/types";

export const bannersApi = {
  getActive: (params?: { categoryId?: number; categorySlug?: string }) =>
    api.get<ApiResponse<Banner[]>>("/api/banners", { params }),

  adminGetAll: (params?: { categoryId?: number | string | null }) =>
    api.get<ApiResponse<Banner[]>>("/api/admin/banners", { params }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ url: string }>("/api/admin/images/upload", formData);
  },

  adminCreate: (data: Partial<Banner>) =>
    api.post<ApiResponse<Banner>>("/api/admin/banners", data),

  adminUpdate: (id: number, data: Partial<Banner>) =>
    api.put<ApiResponse<Banner>>(`/api/admin/banners/${id}`, data),

  adminReorder: (ids: number[]) =>
    api.post<ApiResponse<Banner[]>>("/api/admin/banners/reorder", { ids }),

  adminDelete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/admin/banners/${id}`),
};
