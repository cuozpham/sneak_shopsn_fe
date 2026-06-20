"use client";

import { useEffect, useState } from "react";
import { bannersApi } from "@/lib/api/banners";
import type { Banner } from "@/lib/types";
import HomeHeroCarousel from "@/components/home/HomeHeroCarousel";
import HomeFeaturedProducts from "@/components/home/HomeFeaturedProducts";

export default function HomePageClient() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(true);

  useEffect(() => {
    let alive = true;
    bannersApi.getActive()
      .then((r) => { if (alive) setBanners(r.data.result ?? []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingBanners(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="bg-[#f6f4f0]">
      {loadingBanners ? (
        <div className="h-[240px] w-full animate-pulse bg-[#0b1f20] sm:h-[380px] lg:h-[500px]" />
      ) : (
        <HomeHeroCarousel banners={banners} />
      )}
      <HomeFeaturedProducts />
    </div>
  );
}
