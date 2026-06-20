import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/types";

export const policiesApi = {
  getTerms: () => api.get<ApiResponse<string>>("/api/policies/terms"),
  getPrivacy: () => api.get<ApiResponse<string>>("/api/policies/privacy"),
  getExchange: () => api.get<ApiResponse<string>>("/api/policies/exchange"),
  getWarranty: () => api.get<ApiResponse<string>>("/api/policies/warranty"),
};
