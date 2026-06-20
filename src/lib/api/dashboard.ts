import { api } from "@/lib/api";
import type { ApiResponse, Dashboard } from "@/lib/types";

export const dashboardApi = {
  get: (days = 7) =>
    api.get<ApiResponse<Dashboard>>("/api/admin/dashboard", { params: { days } }),
};
