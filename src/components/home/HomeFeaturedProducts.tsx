import { bannersApi } from "@/lib/api/banners";
import { productsApi } from "@/lib/api/products";
import HomePageClient from "@/components/home/HomePageClient";

const PAGE_SIZE = 12;

export default async function HomePage() {
  const bannersRes = await bannersApi.getActive().catch(() => null);
  const banners = bannersRes?.data.result ?? [];

  const productsRes = await productsApi
      .search({ status: "active", size: PAGE_SIZE, page: 0, sort: "newest" })
      .catch(() => null);
  const initialProducts = productsRes?.data.result.content ?? [];
  const initialTotalPages = productsRes?.data.result.totalPages ?? 0;

  return (
      <HomePageClient
          initialBanners={banners}
          initialProducts={initialProducts}
          initialTotalPages={initialTotalPages}
      />
  );
}