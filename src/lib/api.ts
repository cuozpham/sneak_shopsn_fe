import axios from "axios";
import { useAuthStore } from "@/store/auth";

const BASE_URL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ||
      process.env.APP_BACKEND_BASE_URL ||
      "https://sneakshop-production.up.railway.app"
    : "";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.response.use((res) => {
  if (res.data && res.data.data !== undefined && res.data.result === undefined) {
    res.data.result = res.data.data;
  }
  return res;
});

api.interceptors.request.use((config) => {
  const localToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const storeToken =
    typeof window !== "undefined" ? useAuthStore.getState().token : null;
  const token =
    localToken && localToken !== "undefined" && localToken !== "null"
      ? localToken
      : storeToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete (config.headers as Record<string, string>)["Content-Type"];
      delete (config.headers as Record<string, string>)["content-type"];
    }
  }
  return config;
});

api.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("auth-store");
  }
  return Promise.reject(err);
});

export function getError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || "Có lỗi xảy ra";
  }
  return "Có lỗi xảy ra";
}
