import { api } from "@/lib/api";
import type { ChatProductContext } from "@/lib/chat-message";
import type { ApiResponse, PageResponse, Order } from "@/lib/types";

export interface OrderChatContext {
  conversationId: string;
  product: ChatProductContext;
}

export const ordersApi = {
  checkout: (data: {
    recipientName: string;
    recipientPhone: string;
    shippingAddress: string;
    shippingWard?: string;
    shippingDistrict?: string;
    shippingCity: string;
    paymentMethod: string;
    addressId?: number;
    note?: string;
    items?: { productId: number; variantId?: number; colorId?: number; quantity: number }[];
  }) =>
    api.post<ApiResponse<{ order: Order; paymentUrl: string | null }>>(
      "/api/orders/checkout",
      data
    ),

  getMyOrders: (params?: { status?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Order>>>("/api/orders", { params }),

  getMyOrder: (orderCode: string) =>
    api.get<ApiResponse<Order>>(`/api/orders/${orderCode}`),

  getChatContext: (orderCode: string) =>
    api.get<ApiResponse<OrderChatContext>>(`/api/orders/${orderCode}/chat-context`),

  cancelOrder: (orderCode: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/api/orders/${orderCode}/cancel`, null, {
      params: { reason },
    }),

  confirmReceived: (orderCode: string) =>
    api.post<ApiResponse<Order>>(`/api/orders/${orderCode}/received`),

  // Admin
  adminGetAll: (params?: { status?: string; keyword?: string; page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Order>>>("/api/admin/orders", { params }),

  adminGetUserOrders: (userId: number, params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Order>>>(
      `/api/admin/orders/user/${userId}`,
      { params }
    ),

  adminUpdateStatus: (orderCode: string, data: { status: string; cancelReason?: string }) =>
    api.patch<ApiResponse<Order>>(`/api/admin/orders/${orderCode}/status`, data),
};
