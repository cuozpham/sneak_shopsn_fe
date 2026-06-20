import { api } from "@/lib/api";
import type { ApiResponse, PageResponse, Review } from "@/lib/types";
import { publicApi } from "@/lib/api/public";

export const reviewsApi = {
  getByProduct: (productId: number, params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Review>>>(
      `/api/reviews/product/${productId}`,
      { params }
    ),

  getMyReviews: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Review>>>("/api/reviews/me", { params }),

  create: (data: {
    orderItemId: number;
    rating: number;
    comment?: string;
    productImageIds?: number[];
  }) => api.post<ApiResponse<Review>>("/api/reviews", data),

  update: (reviewId: number, data: {
    orderItemId: number;
    rating: number;
    comment?: string;
    productImageIds?: number[];
  }) => api.put<ApiResponse<Review>>(`/api/reviews/${reviewId}`, data),

  uploadImage: async (productId: number, file: File): Promise<{ productImageId: number; imageUrl: string }> => {
    const uploadedUrl = await publicApi.upload(file);
    const res = await api.post<ApiResponse<{ productImageId: number; imageUrl: string }>>("/api/reviews/upload-image", {
      productId,
      imageUrl: uploadedUrl,
    });
    return res.data.result;
  },

  // Admin
  adminGetAll: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Review>>>("/api/admin/reviews", { params }),

  adminGetById: (reviewId: number) =>
    api.get<ApiResponse<Review>>(`/api/admin/reviews/${reviewId}`),

  shopReply: (reviewId: number, reply: string) =>
    api.post<ApiResponse<Review>>(`/api/admin/reviews/${reviewId}/reply`, {
      reply,
    }),
};
