import type { ProductMedia } from "@/lib/types";

export const getProductMediaUrl = (item: Pick<ProductMedia, "url" | "imageUrl"> | null | undefined) => {
  const url = item?.url ?? item?.imageUrl ?? "";
  return typeof url === "string" ? url.trim() : "";
};
