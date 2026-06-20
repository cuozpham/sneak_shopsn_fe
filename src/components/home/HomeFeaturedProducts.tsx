"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCard from "@/components/ProductCard";
import { productsApi } from "@/lib/api/products";
import type { Product } from "@/lib/types";

const PAGE_SIZE = 12;

export default function HomeFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    productsApi
      .search({ status: "active", size: PAGE_SIZE, page, sort: "newest" })
      .then((r) => {
        if (!alive) return;
        setProducts(r.data.result.content);
        setTotalPages(r.data.result.totalPages);
      })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page]);

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
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white">
              <Skeleton className="aspect-[4/5] w-full rounded-none" />
              <div className="space-y-2 p-2.5 sm:p-4">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400">
          <div className="mb-3 text-5xl">🔍</div>
          <p>Không tìm thấy sản phẩm nào</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center">
          {/* Mobile: prev / N of Total / next */}
          <div className="flex items-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[5rem] text-center text-sm text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Desktop: all page buttons */}
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition ${
                  i === page
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white text-black hover:bg-black/5"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
