"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/lib/api/products";
import type { Product } from "@/lib/types";

const SKELETON_COUNT = 12;

export default function HomeFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    productsApi
      .getFeatured()
      .then((r) => {
        if (!alive) return;
        setProducts(r.data.result ?? []);
      })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-3 py-10 sm:px-4 sm:py-14 lg:py-20">
      <div className="mb-6 flex items-end justify-between sm:mb-8">
        <h2 className="text-xl font-bold tracking-[0.08em] text-black sm:text-3xl">
          SẢN PHẨM NỔI BẬT
        </h2>
        <Link
          href="/products"
          className="shrink-0 text-xs font-medium uppercase tracking-[0.12em] text-black/50 underline-offset-4 hover:text-black hover:underline sm:text-sm"
        >
          Xem tất cả
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-black/5 bg-white">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="space-y-2 p-2.5 sm:p-4">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
