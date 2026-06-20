import { api } from "@/lib/api";

export const imagesApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ url: string }>("/api/admin/images/upload", formData);
    return res.data.url;
  },
  uploadMultiple: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const res = await api.post<{ urls: string[] }>("/api/admin/images/upload-multiple", formData);
    return res.data.urls;
  },
};
