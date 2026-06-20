import { api } from "@/lib/api";

export const publicApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string }>("/api/public/upload", formData);
    return res.data.url;
  },
};
