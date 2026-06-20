import { api } from "@/lib/api";
import type { ApiResponse, Address } from "@/lib/types";

export const addressesApi = {
  getAll: () => api.get<ApiResponse<Address[]>>("/api/addresses"),

  create: (data: {
    recipientName: string;
    recipientPhone: string;
    address: string;
    provinceCode: number;
    districtCode: number;
    ward?: string;
    district?: string;
    city: string;
    isDefault?: boolean;
  }) => api.post<ApiResponse<Address>>("/api/addresses", data),

  update: (id: number, data: {
    recipientName: string;
    recipientPhone: string;
    address: string;
    provinceCode: number;
    districtCode: number;
    ward?: string;
    district?: string;
    city: string;
    isDefault?: boolean;
  }) => api.put<ApiResponse<Address>>(`/api/addresses/${id}`, data),

  delete: (id: number) => api.delete<ApiResponse<void>>(`/api/addresses/${id}`),

  setDefault: (id: number) => api.patch<ApiResponse<Address>>(`/api/addresses/${id}/default`, {}),
};
