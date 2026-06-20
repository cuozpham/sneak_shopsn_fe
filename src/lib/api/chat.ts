import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/types";

export interface ChatMessage {
  id: number;
  orderCode: string;
  senderRole: "USER" | "ADMIN";
  senderName: string;
  senderAvatarUrl?: string | null;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Conversation {
  orderCode: string;
  displayName: string;
  lastContent: string;
  lastSenderRole: string;
  unreadCount: number;
  lastTime: string;
  avatarUrl?: string | null;
}

export const chatApi = {
  getMessages: (orderCode: string) =>
    api.get<ApiResponse<ChatMessage[]>>(`/api/chat/${orderCode}`),

  unreadCount: () =>
    api.get<ApiResponse<{ count: number }>>("/api/chat/unread-count"),

  sendMessage: (orderCode: string, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/api/chat/${orderCode}`, { content }),

  // Admin
  adminGetConversations: () =>
    api.get<ApiResponse<Conversation[]>>("/api/admin/chat/conversations"),

  adminGetMessages: (orderCode: string) =>
    api.get<ApiResponse<ChatMessage[]>>(`/api/admin/chat/${orderCode}`),

  adminSendMessage: (orderCode: string, content: string) =>
    api.post<ApiResponse<ChatMessage>>(`/api/admin/chat/${orderCode}/send`, { content }),

  adminUnreadCount: () =>
    api.get<ApiResponse<number>>("/api/admin/chat/unread-count"),
};
