import { api } from "@/lib/api";
import type { ApiResponse, PageResponse, ShippingFeeConfig } from "@/lib/types";

export const shippingFeesApi = {
  getCurrent: () =>
    api.get<ApiResponse<{ month: string; fee: number }>>("/api/shipping-fees/current"),

  adminGetAll: (params?: { page?: number; size?: number }) =>
    api.get<ApiResponse<PageResponse<ShippingFeeConfig>>>("/api/admin/shipping-fees", { params }),

  adminSave: (data: { month: string; fee: number }) =>
    api.put<ApiResponse<ShippingFeeConfig>>("/api/admin/shipping-fees", data),
};
