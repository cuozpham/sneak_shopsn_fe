"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse } from "@/lib/types";

interface AuthState {
  user: Omit<AuthResponse, "accessToken" | "tokenType"> | null;
  token: string | null;
  hydrated: boolean;
  setAuth: (data: AuthResponse) => void;
  logout: () => void;
  isAdmin: () => boolean;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hydrated: false,
      setAuth: (data) => {
        const { accessToken, tokenType, ...user } = data;
        set((state) => ({
          user,
          token: accessToken ?? state.token,
          hydrated: true,
        }));
        if (typeof window !== "undefined" && accessToken) {
          localStorage.setItem("token", accessToken);
        }
      },
      logout: () => {
        set({ user: null, token: null, hydrated: true });
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          // Xóa cart local để không giữ giỏ của user vừa logout
          import("@/store/cart").then((m) => m.useCartStore.getState().clear()).catch(() => {});
        }
      },
      isAdmin: () => get().user?.role === "admin",
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "auth-store",
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
