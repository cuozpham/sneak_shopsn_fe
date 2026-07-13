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
  const totalStock = product.stockQuantity ?? 0;
  const isOutOfStock = totalStock <= 0;
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
    <Link
      href={`/products/${product.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-[#ee4d2d]/30 hover:shadow-[0_10px_28px_rgba(238,77,45,0.15)]"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f5f5f3]">
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
          <Badge className="absolute right-2 top-2 z-20 rounded-md bg-[#ffd839] px-2 py-0.5 text-[11px] font-bold text-[#ee4d2d] shadow-none">
            -{product.discountPercent}%
          </Badge>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
            <span className="rounded-full bg-white/95 px-4 py-1 text-xs font-semibold text-[#ee4d2d] shadow-sm">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3.5">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#0B1F1A]/45 sm:text-[10px] sm:tracking-[0.24em]">
          {product.shopName || product.shop?.name || "MANDRO"}
        </p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-semibold leading-snug text-[#111827] transition-colors duration-200 group-hover:text-[#ee4d2d] sm:min-h-[2.75rem] sm:text-[15px]">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 text-[10px] text-slate-500 sm:text-[11px]">
          <Star className="h-3 w-3 fill-[#ffce3d] text-[#ffce3d]" />
          <span>{formatRating(product.ratingAverage)}</span>
          <span className="text-slate-300">•</span>
          <span>Đã bán {product.soldCount ?? 0}</span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className={`text-[14px] font-semibold sm:text-[16px] ${discounted ? "text-[#ee4d2d]" : "text-[#111827]"}`}>
            {formatVND(discounted ?? product.price)}
          </span>
          {discounted && (
            <span className="text-[10px] text-slate-400 line-through sm:text-[11px]">
              {formatVND(product.price)}
            </span>
          )}
        </div>

        <div className="mt-auto pt-1 text-[10px] text-gray-500">
          {!isOutOfStock && totalStock > 0 ? <span>Còn {totalStock}</span> : <span className="invisible">.</span>}
        </div>
      </div>
    </Link>
  );
}
