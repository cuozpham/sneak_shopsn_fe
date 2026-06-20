import { api } from "@/lib/api";
import type { ApiResponse, Notification, PageResponse } from "@/lib/types";

export const notificationsApi = {
  getAll: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<Notification>>>("/api/notifications", { params }),

  unreadCount: () =>
    api.get<ApiResponse<{ count: number }>>("/api/notifications/unread-count"),

  markRead: (id: number) =>
    api.patch<ApiResponse<void>>(`/api/notifications/${id}/read`),

  markAllRead: () =>
    api.patch<ApiResponse<void>>("/api/notifications/read-all"),
};
