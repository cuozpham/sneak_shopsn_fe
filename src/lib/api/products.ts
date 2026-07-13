import { api } from "@/lib/api";
import type { ApiResponse, PageResponse, Product } from "@/lib/types";

export const productsApi = {
  search: (params: {
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    categoryId?: number;
    categorySlug?: string;
    status?: string;
    page?: number;
    size?: number;
    sort?: string;
  }) =>
    api.get<ApiResponse<PageResponse<Product>>>("/api/products", { params }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Product>>(`/api/products/slug/${slug}`),

  getFeatured: () =>
    api.get<ApiResponse<Product[]>>("/api/products/featured"),

  adminSetFeatured: (id: number, data: { featured: boolean; featuredOrder: number | null }) =>
    api.patch<ApiResponse<Product>>(`/api/admin/products/${id}/featured`, data),

  adminListFeatured: () =>
    api.get<ApiResponse<PageResponse<Product>>>("/api/admin/products/featured"),

  getById: (id: number) =>
    api.get<ApiResponse<Product>>(`/api/admin/products/${id}`),

  // Admin
  adminSearch: (params: {
    keyword?: string;
    status?: string;
    deleted?: boolean;
    page?: number;
    size?: number;
  }) =>
    api.get<ApiResponse<PageResponse<Product>>>("/api/admin/products", { params }),

  restore: (id: number) =>
    api.patch<ApiResponse<void>>(`/api/admin/products/${id}/restore`),

  create: (data: unknown) =>
    api.post<ApiResponse<Product>>("/api/admin/products", data),

  update: (id: number, data: unknown) =>
    api.put<ApiResponse<Product>>(`/api/admin/products/${id}`, data),

  delete: (id: number) =>
    api.delete<ApiResponse<void>>(`/api/admin/products/${id}`),

  addVariant: (productId: number, data: unknown) =>
    api.post<ApiResponse<unknown>>(`/api/admin/products/${productId}/variants`, data),

  updateVariant: (productId: number, variantId: number, data: unknown) =>
    api.put<ApiResponse<unknown>>(
      `/api/admin/products/${productId}/variants/${variantId}`,
      data
    ),

  deleteVariant: (productId: number, variantId: number) =>
    api.delete<ApiResponse<void>>(
      `/api/admin/products/${productId}/variants/${variantId}`
    ),
};
