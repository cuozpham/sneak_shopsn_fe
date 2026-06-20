import { api } from "@/lib/api";
import type { ApiResponse, CartItem } from "@/lib/types";

export const cartApi = {
  getCart: () => api.get<ApiResponse<CartItem[]>>("/api/cart"),

  addOrUpdate: (data: {
    productId: number;
    variantId?: number;
    colorId?: number;
    quantity: number;
  }) => api.post<ApiResponse<CartItem>>("/api/cart", data),

  updateQuantity: (itemId: number, quantity: number) =>
    api.patch<ApiResponse<CartItem>>(`/api/cart/${itemId}`, null, {
      params: { quantity },
    }),

  removeItem: (itemId: number) =>
    api.delete<ApiResponse<void>>(`/api/cart/${itemId}`),

  clearCart: () => api.delete<ApiResponse<void>>("/api/cart"),
};
