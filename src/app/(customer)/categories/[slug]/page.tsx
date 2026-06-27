"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { bannersApi } from "@/lib/api/banners";
import { categoriesApi } from "@/lib/api/categories";
import { productsApi } from "@/lib/api/products";
import HomeHeroCarousel from "@/components/home/HomeHeroCarousel";
import ProductCard from "@/components/ProductCard";
import { toFrontendImageUrl } from "@/lib/image";
import type { Banner, Category, Product } from "@/lib/types";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"products" | "subcategories">("products");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setView("products");

    Promise.all([
      categoriesApi.getAll(),
      bannersApi.getActive({ categorySlug: slug }),
      productsApi.search({ categorySlug: slug, page: 0, size: 8 }),
    ])
      .then(([catsRes, bannersRes, productsRes]) => {
        const allCats: Category[] = catsRes.data.data ?? [];
        const found = allCats.find((c) => c.slug === slug) ?? null;
        setCategory(found);
        setSubcategories(found ? allCats.filter((c) => c.parentId === found.id) : []);
        setBanners(bannersRes.data.data ?? []);
        setProducts(productsRes.data.data?.content ?? []);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const handleViewMore = () => {
    router.push(`/products?categorySlug=${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4]">
        <div className="h-[240px] animate-pulse bg-gray-200 sm:h-[380px] lg:h-[500px]" />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-[1.5rem] bg-gray-200 aspect-[4/5]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <HomeHeroCarousel banners={banners} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {view === "products" ? (
          <>
            <div className="mb-6 flex items-baseline gap-3 sm:mb-8">
              <h1 className="text-xl font-semibold text-[#0B1F1A] sm:text-2xl lg:text-3xl">
                {category?.name ?? slug}
              </h1>
              {category?.description && (
                <p className="hidden text-sm text-gray-500 sm:block">{category.description}</p>
              )}
            </div>

            {products.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-400">
                Chưa có sản phẩm trong danh mục này.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="mt-8 flex justify-center sm:mt-10">
              <button
                onClick={handleViewMore}
                className="rounded-full border border-[#0B1F1A]/20 bg-white px-8 py-3 text-sm font-medium text-[#0B1F1A] shadow-sm transition hover:bg-[#0B1F1A] hover:text-white"
              >
                Xem thêm
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3 sm:mb-8">
              <button
                onClick={() => setView("products")}
                className="flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#0B1F1A]"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-semibold text-[#0B1F1A] sm:text-2xl">
                Danh mục con
              </h1>
            </div>

            {subcategories.length === 0 ? (
              <p className="py-16 text-center text-sm text-gray-400">
                Không có danh mục con.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                {subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/categories/${sub.slug}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#f5f5f3]">
                      {sub.imageUrl ? (
                        <img
                          src={toFrontendImageUrl(sub.imageUrl) ?? ""}
                          alt={sub.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl text-gray-200">
                          👟
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-[#0B1F1A]">{sub.name}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
