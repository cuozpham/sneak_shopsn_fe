import { create } from "zustand";
import type { ChatProductContext } from "@/lib/chat-message";

interface ChatStore {
  isOpen: boolean;
  orderCode: string | null;
  pendingProduct: ChatProductContext | null;
  openChat: (orderCode: string) => void;
  openProductChat: (orderCode: string, product: ChatProductContext) => void;
  clearPendingProduct: () => void;
  closeChat: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  orderCode: null,
  pendingProduct: null,
  openChat: (orderCode) => set((state) => ({
    isOpen: true,
    orderCode,
    pendingProduct: state.orderCode === orderCode ? state.pendingProduct : null,
  })),
  openProductChat: (orderCode, pendingProduct) => set({ isOpen: true, orderCode, pendingProduct }),
  clearPendingProduct: () => set({ pendingProduct: null }),
  closeChat: () => set({ isOpen: false }),
}));
