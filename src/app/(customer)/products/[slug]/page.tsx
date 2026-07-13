"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Star, Minus, Plus, ShoppingBag, Share2, MessageCircle, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { productsApi } from "@/lib/api/products";
import { cartApi } from "@/lib/api/cart";
import { reviewsApi } from "@/lib/api/reviews";
import { toFrontendImageUrl } from "@/lib/image";
import { getProductMediaUrl } from "@/lib/product-media";
import { decodeReviewReply } from "@/lib/review-reply";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { formatRating, formatVND, formatDate } from "@/lib/format";
import type { Product, Review } from "@/lib/types";

type MediaAsset = {
  url: string;
  type: "image" | "video";
};

const inferMediaTypeFromUrl = (url: string): "image" | "video" => {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return "video";
  return "image";
};

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<MediaAsset | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: "image" | "video"; title: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const { setItems, addItem } = useCartStore();
  const { user } = useAuthStore();
  const { openProductChat } = useChatStore();

  const normalizeColor = (value: string) => value.trim().toLowerCase();
  const resolveColorImage = (
    product: Product | null,
    colorName: string,
    currentVariantId?: number,
    currentColorId?: number
  ) => {
    if (!product) return null;
    const key = normalizeColor(colorName);
    if (!key) return null;

    const currentVariant = product.variants.find((variant) => variant.id === currentVariantId);
    const currentColor = currentVariant?.colors.find((color) => color.id === currentColorId);
    if (currentColor?.imageUrl) return currentColor.imageUrl;

    for (const variant of product.variants) {
      for (const color of variant.colors) {
        if (variant.id === currentVariantId && color.id === currentColorId) continue;
        if (normalizeColor(color.color) === key && color.imageUrl) {
          return color.imageUrl;
        }
      }
    }

    return currentColor?.imageUrl ?? null;
  };

  useEffect(() => {
    if (!slug) return;
    productsApi.getBySlug(slug).then((pRes) => {
      const p = pRes.data.result;
      setProduct(p);
      const qVariantId = searchParams.get("variantId");
      const qColorId = searchParams.get("colorId");
      if (qVariantId) {
        const vid = Number(qVariantId);
        const variant = p.variants.find((v) => v.id === vid);
        if (variant) {
          setSelectedVariantId(vid);
          if (qColorId) {
            const cid = Number(qColorId);
            if (variant.colors.some((c) => c.id === cid)) setSelectedColorId(cid);
          }
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));

    // Load reviews separately with product id (need id first)
    productsApi.getBySlug(slug).then((r) => {
      const p = r.data.result;
      return reviewsApi.getByProduct(p.id, { page: 0, size: 10 });
    }).then((r) => setReviews(r.data.result.content)).catch(() => {});
  }, [slug]);

  const selectedVariant = product?.variants.find((v) => v.id === selectedVariantId);
  const selectedColor = selectedVariant?.colors.find((c) => c.id === selectedColorId);
  const price = selectedVariant?.price ?? product?.price ?? 0;

  const currentStock = selectedColor
    ? (selectedColor.stockQuantity ?? 0)
    : selectedVariant
      ? selectedVariant.colors.reduce((s, c) => s + (c.stockQuantity ?? 0), 0)
      : (product?.stockQuantity ?? 0);
  const isOutOfStock = currentStock <= 0 || product?.status === "out_of_stock";
  const discountedPrice =
    product && product.discountPercent > 0
      ? price * (1 - product.discountPercent / 100)
      : null;
  const reviewStats = useMemo(() => {
    if (!reviews.length) {
      return {
        avg: product?.ratingAverage ?? 0,
        count: product?.reviewCount ?? 0,
      };
    }
    const total = reviews.reduce((sum, item) => sum + (item.rating || 0), 0);
    return {
      avg: total / reviews.length,
      count: reviews.length,
    };
  }, [reviews, product?.ratingAverage, product?.reviewCount]);

  const fallbackHeroMedia = useMemo(() => {
    if (!product) return null;
    const firstGalleryMedia = product.media?.find((item) => getProductMediaUrl(item) && item.type !== "video") ?? product.media?.[0] ?? null;
    if (firstGalleryMedia) {
      const url = getProductMediaUrl(firstGalleryMedia);
      return url
        ? {
            url: toFrontendImageUrl(url),
            type: firstGalleryMedia.type === "video" ? "video" : inferMediaTypeFromUrl(url),
          }
        : null;
    }
    return product.coverImageUrl ? { url: toFrontendImageUrl(product.coverImageUrl), type: "image" as const } : null;
  }, [product]);

  const heroMedia = selectedMedia ?? fallbackHeroMedia;

  const handleContactShop = () => {
    if (!user || !product) {
      toast.error("Vui lòng đăng nhập để liên hệ shop");
      return;
    }
    const imageUrl =
      heroMedia?.type === "image"
        ? heroMedia.url
        : toFrontendImageUrl(product.coverImageUrl);
    openProductChat(`SUPPORT-${user.id}`, {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: imageUrl || null,
      price: discountedPrice ?? price,
      discountPrice: discountedPrice ? price : null,
      variantId: selectedVariantId ?? null,
      colorId: selectedColorId ?? null,
      size: selectedVariant?.size ?? null,
      color: selectedColor?.color ?? null,
    });
  };

  const colorOptions = useMemo(() => {
    if (!product) return [];
    const map = new Map<string, {
      key: string;
      color: string;
      imageUrl: string | null;
      stockQuantity: number;
      variantId: number;
      colorId: number;
    }>();

    product.variants.forEach((variant) => {
      variant.colors.forEach((color) => {
        const key = normalizeColor(color.color);
        if (!key) return;
        const existing = map.get(key);
        const nextStock = (existing?.stockQuantity ?? 0) + (color.stockQuantity ?? 0);
        if (!existing) {
          map.set(key, {
            key,
            color: color.color,
            imageUrl: color.imageUrl ?? null,
            stockQuantity: color.stockQuantity ?? 0,
            variantId: variant.id,
            colorId: color.id,
          });
          return;
        }
        map.set(key, {
          ...existing,
          stockQuantity: nextStock,
          imageUrl: existing.imageUrl ?? color.imageUrl ?? null,
        });
      });
    });

    return Array.from(map.values());
  }, [product]);

  useEffect(() => {
    if (!selectedVariant) {
      setSelectedColorId(null);
      return;
    }
    const activeColor = selectedVariant.colors.find((color) => color.id === selectedColorId);
    if (activeColor || !selectedColorId) return;
    setSelectedColorId(null);
  }, [selectedVariant, selectedColorId]);

  const copyProductUrl = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Đã sao chép liên kết sản phẩm");
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (product.variants.length > 0 && !selectedVariantId) {
      toast.error("Vui lòng chọn size"); return;
    }
    if (selectedVariant && selectedVariant.colors.length > 0 && !selectedColorId) {
      toast.error("Vui lòng chọn màu"); return;
    }
    setAdding(true);
    try {
      if (user) {
        await cartApi.addOrUpdate({
          productId: product.id,
          variantId: selectedVariantId ?? undefined,
          colorId: selectedColorId ?? undefined,
          quantity,
        });
        const cartRes = await cartApi.getCart();
        setItems(cartRes.data.result);
      } else {
        const pickedColor = selectedVariant?.colors.find((c) => c.id === selectedColorId) ?? null;
        const basePrice = selectedVariant?.price ? Number(selectedVariant.price) : Number(product.price);
        const finalPrice = basePrice * (1 - (product.discountPercent ?? 0) / 100);
        const syntheticId = -(product.id * 1_000_000 + (selectedVariantId ?? 0) * 1000 + (selectedColorId ?? 0));
        addItem({
          id: syntheticId,
          productId: product.id,
          productName: product.name,
          productImage: pickedColor?.imageUrl ?? product.coverImageUrl ?? null,
          variantId: selectedVariantId,
          variantName: selectedVariant?.size ? `Size ${selectedVariant.size}` : null,
          colorId: selectedColorId,
          colorName: pickedColor?.color ?? null,
          price: Math.round(finalPrice),
          quantity,
        });
      }
      toast.success("Đã thêm vào giỏ hàng!");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;
    // if (!user) { toast.error("Vui lòng đăng nhập để mua hàng"); return; }
    if (product.variants.length > 0 && !selectedVariantId) {
      toast.error("Vui lòng chọn size"); return;
    }
    if (selectedVariant && selectedVariant.colors.length > 0 && !selectedColorId) {
      toast.error("Vui lòng chọn màu"); return;
    }
    const fallbackMedia = product.media?.find((item) => item.type !== "video" && getProductMediaUrl(item)) ?? null;
    const fallbackImage =
      toFrontendImageUrl(getProductMediaUrl(fallbackMedia)) ||
      toFrontendImageUrl(product.coverImageUrl) ||
      null;
    const buyNowImage =
      selectedMedia?.type === "image" ? selectedMedia.url : fallbackImage;

    const buyNowItem = {
      productId: product.id,
      variantId: selectedVariantId ?? undefined,
      colorId: selectedColorId ?? undefined,
      quantity,
      productName: product.name,
      variantName: selectedVariant?.size ? `Kích cỡ ${selectedVariant.size}` : null,
      colorName: selectedColor?.color ?? null,
      productImage: buyNowImage,
      unitPrice: discountedPrice ?? price,
    };

    try {
      setBuying(true);
      sessionStorage.setItem("sneakshop_buy_now_items", JSON.stringify([buyNowItem]));
      window.location.href = "/checkout";
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto grid max-w-6xl gap-3 px-2 py-3 md:grid-cols-2 md:gap-10 md:px-4 md:py-10">
        <Skeleton className="aspect-square rounded-xl sm:aspect-square" />
        <div className="space-y-2.5 sm:space-y-4">
          <Skeleton className="h-6 w-3/4 sm:h-8" />
          <Skeleton className="h-4.5 w-1/2 sm:h-6" />
          <Skeleton className="h-8 w-1/3 sm:h-10" />
          <Skeleton className="h-24 w-full sm:h-32" />
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-20 text-gray-400">Không tìm thấy sản phẩm</div>;

  const mediaItems = product.media ?? product.images ?? [];
  const colorImages = (product.variants ?? [])
    .flatMap((variant) => (variant.colors ?? []).map((color) => toFrontendImageUrl(color.imageUrl)))
    .filter((url): url is string => Boolean(url));
  const imageItems: MediaAsset[] = [
    ...mediaItems
      .filter((item) => Boolean(getProductMediaUrl(item)))
      .map((item) => ({
        url: toFrontendImageUrl(getProductMediaUrl(item)),
        type: item.type === "video" ? "video" : inferMediaTypeFromUrl(getProductMediaUrl(item)),
      })),
    ...(product.coverImageUrl ? [{ url: toFrontendImageUrl(product.coverImageUrl), type: "image" as const }] : []),
    ...colorImages.map((url) => ({ url, type: "image" as const })),
  ].filter((item, index, arr) => arr.findIndex((x) => x.url === item.url) === index);

  return (
    <div className="mx-auto max-w-6xl overflow-x-hidden touch-pan-y px-2 py-3 sm:px-4 sm:py-10">
      {product.breadcrumb?.length ? (
        <nav className="mb-3 flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap text-[11px] text-gray-500 sm:mb-6 sm:flex-wrap sm:text-sm">
          {product.breadcrumb.map((item, index) => (
            <span key={`${item.href}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
              <a
                href={item.href}
                className={index === product.breadcrumb!.length - 1 ? "font-medium text-gray-900" : "hover:text-gray-900"}
              >
                {item.label}
              </a>
            </span>
          ))}
        </nav>
      ) : null}
      <div className="grid w-full min-w-0 gap-3.5 md:grid-cols-2 md:gap-10">
        {/* Images */}
        <div className="min-w-0 max-w-full overflow-hidden">
          <div className="relative mb-2 aspect-[4/3] max-w-full overflow-hidden rounded-xl bg-gray-50 sm:aspect-square">
            {heroMedia ? (
              heroMedia.type === "video" ? (
                <video
                  src={heroMedia.url}
                  className="block h-full w-full max-w-full object-cover"
                  controls
                  playsInline
                  autoPlay
                  muted
                />
              ) : (
                <Image src={heroMedia.url} alt={product.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">👟</div>
            )}
          </div>
          {imageItems.length > 1 && (
            <div className="flex max-w-full gap-1 overflow-x-auto pb-1 sm:gap-2">
              {imageItems.map((asset, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMedia(asset)}
                  className={`relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-md border-2 transition sm:h-16 sm:w-16 sm:rounded-lg ${
                    selectedMedia?.url === asset.url ? "border-black" : "border-transparent"
                  }`}
                >
                  {asset.type === "video" ? (
                    <video src={asset.url} className="block h-full w-full max-w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <Image src={asset.url} alt="" fill className="object-cover" sizes="64px" />
                  )}
                  {asset.type === "video" && (
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">Video</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 max-w-full">
          <div className="mb-2 flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {product.shop && (
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400 sm:text-xs">
                  {product.shop.name}
                </p>
              )}
              <h1 className="min-w-0 break-words text-sm font-bold leading-snug text-gray-900 sm:text-2xl">{product.name}</h1>
            </div>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => void copyProductUrl()}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border text-gray-500 transition hover:bg-gray-50 sm:h-9 sm:w-9"
                title="Chia sẻ liên kết"
              >
                <Share2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-2.5 flex flex-wrap items-center gap-1 sm:mb-4 sm:gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-2.5 w-2.5 ${s <= Math.round(reviewStats.avg) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} sm:h-3 sm:w-3`} />
              ))}
            </div>
            <span className="text-[10px] text-gray-500 sm:text-sm">
              {formatRating(reviewStats.avg)} ({reviewStats.count})
            </span>
            <span className="text-[10px] text-gray-400 sm:text-sm">
              Đã bán: {product.soldCount ?? 0}
            </span>
          </div>

          <div className="mb-3.5 flex flex-wrap items-baseline gap-1.5 sm:mb-6 sm:gap-3">
            <span className={`text-base font-black sm:text-3xl ${discountedPrice ? "text-red-500" : "text-black"}`}>
              {formatVND(discountedPrice ?? price)}
            </span>
            {discountedPrice && (
              <>
                <span className="text-[10px] text-gray-400 line-through sm:text-lg">{formatVND(price)}</span>
                <Badge className="bg-red-500 text-white text-[10px] sm:text-xs">-{product.discountPercent}%</Badge>
              </>
            )}
          </div>

          {/* Size selection */}
          {product.variants.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium sm:text-sm">Kích cỡ</p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {product.variants.map((v) => {
                  const variantStock = v.colors.reduce((s, c) => s + (c.stockQuantity ?? 0), 0);
                  const unavailable = v.colors.length === 0;
                  const variantOutOfStock = !unavailable && variantStock === 0;
                  return (
                    <button
                      key={v.id}
                      disabled={unavailable}
                      onClick={() => {
                        if (unavailable) return;
                        setSelectedVariantId(v.id);
                        setSelectedColorId(null);
                        setSelectedMedia(null);
                      }}
                      className={`flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-medium transition sm:px-4 sm:py-1.5 sm:text-sm ${
                        selectedVariantId === v.id
                          ? "border-black bg-black text-white"
                          : variantOutOfStock
                            ? "border-gray-200 text-gray-400 hover:border-gray-300"
                            : "border-gray-200 hover:border-gray-400"
                      } ${unavailable ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span>{v.size}</span>
                      {variantOutOfStock && (
                        <span className={`text-[8px] leading-tight ${selectedVariantId === v.id ? "text-red-300" : "text-red-400"}`}>Hết hàng</span>
                      )}
                      {!variantOutOfStock && !unavailable && (
                        <span className={`text-[8px] leading-tight ${selectedVariantId === v.id ? "text-gray-300" : "text-gray-400"}`}>Còn {variantStock}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color selection */}
          {colorOptions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium sm:text-sm">Màu sắc</p>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {colorOptions.map((c) => {
                  const activeColor = selectedVariant?.colors.find(
                    (color) => normalizeColor(color.color) === c.key
                  ) ?? null;
                  const available = Boolean(activeColor);
                  const colorStock = available ? (activeColor!.stockQuantity ?? 0) : 0;
                  const colorOutOfStock = available && colorStock === 0;
                  const selected = activeColor?.id === selectedColorId;
                  return (
                    <button
                      key={c.key}
                      onClick={() => {
                        if (!available || !selectedVariant) return;
                        setSelectedColorId(activeColor!.id);
                        const imageUrl = resolveColorImage(product, activeColor!.color, selectedVariant.id, activeColor!.id);
                        if (imageUrl) setSelectedMedia({ url: toFrontendImageUrl(imageUrl), type: "image" });
                      }}
                      disabled={!available}
                      className={`flex flex-col items-center rounded-lg border px-2 py-1 text-[10px] font-medium transition sm:px-4 sm:py-1.5 sm:text-sm ${
                        selected
                          ? "border-black bg-black text-white"
                          : !available
                            ? "border-dashed border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                            : colorOutOfStock
                              ? "border-dashed border-gray-300 text-gray-500 hover:border-gray-400"
                              : "border-gray-200 hover:border-gray-400 bg-white text-gray-800"
                      }`}
                    >
                      <span>{c.color}</span>
                      {available && colorOutOfStock && (
                        <span className={`text-[8px] leading-tight ${selected ? "text-red-300" : "text-red-400"}`}>Hết hàng</span>
                      )}
                      {available && !colorOutOfStock && (
                        <span className={`text-[8px] leading-tight ${selected ? "text-gray-300" : "text-gray-400"}`}>Còn {colorStock}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-4">
            <div className="mb-1.5 flex items-center gap-2">
              <p className="text-[11px] font-medium sm:text-sm">Số lượng</p>
              {isOutOfStock ? (
                <span className="text-[10px] font-medium text-red-500">Hết hàng</span>
              ) : (selectedVariantId || product.stockQuantity !== null) ? (
                <span className="text-[10px] text-gray-400">Còn {currentStock}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
              <span className="w-6 text-center text-xs font-medium sm:text-sm">{quantity}</span>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setQuantity((q) => q + 1)}>
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <Button
              className="h-9 gap-2 text-[11px] font-bold sm:h-12 sm:text-base"
              onClick={handleAddToCart}
              variant="outline"
              disabled={adding || buying}
            >
              <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              {adding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
            </Button>
            <Button
              className="h-9 text-[11px] font-bold sm:h-12 sm:text-base"
              onClick={handleBuyNow}
              disabled={adding || buying || isOutOfStock}
            >
              {buying ? "Đang chuyển..." : isOutOfStock ? "Hết hàng" : "Mua ngay"}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2.5 h-9 w-full gap-2 text-[11px] font-bold sm:mt-3 sm:h-12 sm:text-base"
            onClick={handleContactShop}
          >
            <MessageCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            Liên hệ về sản phẩm
          </Button>
          <Button
            type="button"
            variant="outline"
            className="mt-2.5 h-9 w-full gap-2 text-[11px] font-bold sm:mt-3 sm:h-12 sm:text-base"
            onClick={() => void copyProductUrl()}
          >
            <Share2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            Sao chép liên kết
          </Button>
        </div>
      </div>

      {product.description && (
        <div className="mt-6 sm:mt-10">
          <h3 className="mb-2 text-sm font-semibold sm:text-lg">Mô tả sản phẩm</h3>
          <p className="text-[12px] leading-relaxed text-gray-600 sm:text-sm">{product.description}</p>
        </div>
      )}

      {product.sizeGuideNote && (
        <div className="prose prose-sm mt-4 max-w-none rounded-lg bg-gray-50 p-3 text-[12px] text-gray-700 sm:mt-6 sm:p-5 sm:text-sm [&_img]:mx-auto [&_img]:my-3 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain sm:[&_img]:max-h-[600px]">
          <p className="mb-1.5 font-medium text-gray-900">📏 Hướng dẫn chọn size</p>
          <ReactMarkdown>{product.sizeGuideNote}</ReactMarkdown>
        </div>
      )}

      {/* Reviews */}
      <div className="mt-7 sm:mt-14">
        <h2 className="mb-3 text-sm font-bold sm:mb-6 sm:text-xl">Đánh giá ({product.reviewCount})</h2>
        {reviews.length === 0 ? (
          <p className="py-5 text-center text-[11px] text-gray-400 sm:py-8 sm:text-base">Chưa có đánh giá nào</p>
        ) : (
          <div className="space-y-3.5">
            {reviews.map((r) => {
              const shopReply = decodeReviewReply(r.shopReply);
              return (
                <div key={r.id} className="rounded-xl border p-2.5 sm:p-4">
                  <div className="mb-2 flex items-start gap-2">
                    {r.userAvatarUrl ? (
                      <img
                        src={toFrontendImageUrl(r.userAvatarUrl)}
                        alt={r.userName}
                        className="h-6 w-6 flex-shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
                      />
                    ) : (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold sm:h-9 sm:w-9 sm:text-sm">
                        {r.userName[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium sm:text-sm">{r.userName}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-2 w-2 sm:h-3 sm:w-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-gray-400 sm:text-xs">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.imageUrls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.imageUrls.map((url) => {
                        const imageUrl = toFrontendImageUrl(url);
                        const mediaType = inferMediaTypeFromUrl(imageUrl);
                        return (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setPreviewMedia({ url: imageUrl, type: mediaType, title: "Ảnh đánh giá của khách" })}
                            className="group h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border bg-gray-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-[120px] sm:w-[120px]"
                          >
                            {mediaType === "video" ? (
                              <video src={imageUrl} className="block h-full w-full object-cover" muted playsInline preload="metadata" />
                            ) : (
                              <img src={imageUrl} alt="Ảnh đính kèm đánh giá" className="block h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {r.comment && <p className="mt-2 text-[11px] text-gray-700 sm:text-sm">{r.comment}</p>}
                  {r.shopReply && (
                    <div className="mt-2 rounded-lg bg-gray-50 p-2.5 text-[11px] sm:p-3 sm:text-sm">
                      <p>
                        <span className="font-medium text-gray-700">Phản hồi shop: </span>
                        <span className="whitespace-pre-wrap text-gray-600">{shopReply.text}</span>
                      </p>
                      {shopReply.imageUrls.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                          {shopReply.imageUrls.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setPreviewMedia({ url: toFrontendImageUrl(url), type: inferMediaTypeFromUrl(toFrontendImageUrl(url)), title: "Ảnh phản hồi của shop" })}
                              className="group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                              <img src={toFrontendImageUrl(url)} alt="Ảnh phản hồi của shop" className="block aspect-[4/3] w-full max-w-full object-cover transition duration-200 group-hover:scale-105" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={Boolean(previewMedia)} onOpenChange={(open) => !open && setPreviewMedia(null)}>
        {previewMedia ? (
          <DialogContent className="max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-3xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{previewMedia.title}</p>
              </div>
            </div>
            <div className="bg-black">
              {previewMedia.type === "video" ? (
                <video src={previewMedia.url} controls className="max-h-[75vh] w-full object-contain" />
              ) : (
                <img src={previewMedia.url} alt={previewMedia.title} className="max-h-[75vh] w-full object-contain" />
              )}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
