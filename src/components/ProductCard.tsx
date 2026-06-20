"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRating, formatVND } from "@/lib/format";
import { toFrontendImageUrl } from "@/lib/image";
import { getProductMediaUrl } from "@/lib/product-media";
import type { Product } from "@/lib/types";

const inferMediaTypeFromUrl = (url: string): "image" | "video" => {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return "video";
  return "image";
};

export default function ProductCard({ product }: { product: Product }) {
  const discounted =
    product.discountPercent > 0
      ? product.price * (1 - product.discountPercent / 100)
      : null;
  const primaryMedia =
    product.media?.find((item) => getProductMediaUrl(item) && item.type !== "video") ??
    product.media?.[0] ??
    null;
  const displayUrl =
    toFrontendImageUrl(getProductMediaUrl(primaryMedia)) ||
    toFrontendImageUrl(product.coverImageUrl) ||
    toFrontendImageUrl(product.variants.flatMap((variant) => variant.colors.map((color) => color.imageUrl)).find(Boolean)) ||
    null;
  const displayType =
    primaryMedia?.type === "video"
      ? "video"
      : displayUrl
        ? inferMediaTypeFromUrl(displayUrl)
        : "image";

  return (
    <div className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="block overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-black/10 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f3]">
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 z-20 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:left-[125%] group-hover:opacity-100 motion-reduce:hidden" />
          {displayUrl ? (
            displayType === "video" ? (
              <video
                src={displayUrl}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={displayUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none"
                loading="lazy"
                decoding="async"
              />
            )
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
              👟
            </div>
          )}
          {displayType === "video" && (
            <span className="absolute left-3 top-3 z-20 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium tracking-[0.16em] text-white backdrop-blur-sm">
              VIDEO
            </span>
          )}
          {product.discountPercent > 0 && (
            <Badge className="absolute left-3 top-3 z-20 rounded-full bg-red-500 text-white shadow-none">
              -{product.discountPercent}%
            </Badge>
          )}
        </div>

      </Link>

      <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
          <div>
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#0B1F1A]/45 sm:text-[10px] sm:tracking-[0.24em]">
              {product.shop?.name || "MANDRO"}
            </p>
            <h3 className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-5 text-[#111827] transition-colors duration-200 group-hover:text-[#0B1F1A] sm:mt-1 sm:text-[15px] sm:leading-6">
              {product.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37] sm:h-3.5 sm:w-3.5" />
            <span className="text-[10px] text-slate-500 sm:text-xs">
              {formatRating(product.ratingAverage)}
            </span>
            <span className="hidden text-xs text-slate-300 sm:inline">•</span>
            <span className="hidden text-xs text-slate-500 sm:inline">
              Đã bán {product.soldCount ?? 0}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className={`text-sm font-semibold sm:text-base ${discounted ? "text-red-500" : "text-[#0B1F1A]"}`}>
              {formatVND(discounted ?? product.price)}
            </span>
            {discounted && (
              <span className="hidden text-xs text-slate-300 line-through sm:inline">
                {formatVND(product.price)}
              </span>
            )}
          </div>
        </div>
    </div>
  );
}
