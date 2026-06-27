"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import HomeHeroCarousel from "@/components/home/HomeHeroCarousel";
import ProductCard from "@/components/ProductCard";
import { bannersApi } from "@/lib/api/banners";
import { categoriesApi } from "@/lib/api/categories";
import { productsApi } from "@/lib/api/products";
import { formatVND } from "@/lib/format";
import type { Banner, Category, Product } from "@/lib/types";

const MAX_PRICE = 10000000;
function ProductListingHero({
  banners,
}: {
  banners: Banner[];
}) {
  return (
    <section className="px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_24px_80px_rgba(11,31,26,0.08)]">
        <HomeHeroCarousel banners={banners} />
      </div>
    </section>
  );
}

function CategoryCascadeSelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [hoveredMain, setHoveredMain] = useState<number | null>(null);
  const [hoveredSub, setHoveredSub] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mainCats = useMemo(() => categories.filter((c) => !c.parentId), [categories]);
  const subCats = useCallback((mainId: number) => categories.filter((c) => c.parentId === mainId), [categories]);
  const childCats = useCallback((subId: number) => categories.filter((c) => c.parentId === subId), [categories]);

  const activeSubs = useMemo(() => hoveredMain !== null ? subCats(hoveredMain) : [], [hoveredMain, subCats]);
  const activeChildren = useMemo(() => hoveredSub !== null ? childCats(hoveredSub) : [], [hoveredSub, childCats]);

  const selectedCat = value === "all" ? null : categories.find((c) => String(c.id) === value);
  const displayLabel = selectedCat ? selectedCat.name : "Tất cả danh mục";

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setHoveredMain(null);
    setHoveredSub(null);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-12 w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white px-4 text-left text-sm text-[#1A1A1A] shadow-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-4 focus:ring-[#D4AF7A]/15"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#5A4E46] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 flex rounded-[14px] border border-[#D4AF7A]/35 bg-white shadow-lg overflow-hidden">
          <div className="min-w-[160px] py-2 border-r border-[#D4AF7A]/20">
            <div
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-[#FBF7EE] text-[#1A1A1A] ${value === "all" ? "font-semibold text-[#B68C4A]" : ""}`}
              onMouseEnter={() => { setHoveredMain(null); setHoveredSub(null); }}
              onClick={() => select("all")}
            >
              Tất cả danh mục
            </div>
            {mainCats.map((main) => {
              const hasSubs = subCats(main.id).length > 0;
              const isSelected = String(main.id) === value;
              return (
                <div
                  key={main.id}
                  className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-[#FBF7EE] ${hoveredMain === main.id ? "bg-[#FBF7EE]" : ""} ${isSelected ? "font-semibold text-[#B68C4A]" : "text-[#1A1A1A]"}`}
                  onMouseEnter={() => { setHoveredMain(main.id); setHoveredSub(null); }}
                  onClick={() => select(String(main.id))}
                >
                  <span>{main.name}</span>
                  {hasSubs && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#5A4E46]" />}
                </div>
              );
            })}
          </div>

          {activeSubs.length > 0 && (
            <div className="min-w-[160px] py-2 border-r border-[#D4AF7A]/20">
              {activeSubs.map((sub) => {
                const hasChildren = childCats(sub.id).length > 0;
                const isSelected = String(sub.id) === value;
                return (
                  <div
                    key={sub.id}
                    className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-[#FBF7EE] ${hoveredSub === sub.id ? "bg-[#FBF7EE]" : ""} ${isSelected ? "font-semibold text-[#B68C4A]" : "text-[#1A1A1A]"}`}
                    onMouseEnter={() => setHoveredSub(sub.id)}
                    onClick={() => select(String(sub.id))}
                  >
                    <span>{sub.name}</span>
                    {hasChildren && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#5A4E46]" />}
                  </div>
                );
              })}
            </div>
          )}

          {activeChildren.length > 0 && (
            <div className="min-w-[160px] py-2">
              {activeChildren.map((child) => {
                const isSelected = String(child.id) === value;
                return (
                  <div
                    key={child.id}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-[#FBF7EE] ${isSelected ? "font-semibold text-[#B68C4A]" : "text-[#1A1A1A]"}`}
                    onClick={() => select(String(child.id))}
                  >
                    {child.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterPanel({
  keywordInput,
  setKeywordInput,
  onSearchNow,
  categoryFilter,
  setCategoryFilter,
  categories,
  ratingFilter,
  setRatingFilter,
  sort,
  setSort,
  clearFilters,
  pricePreset,
  setPricePreset,
}: {
  keywordInput: string;
  setKeywordInput: (value: string) => void;
  onSearchNow: () => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  categories: Category[];
  ratingFilter: string;
  setRatingFilter: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  clearFilters: () => void;
  pricePreset: string;
  setPricePreset: (value: string) => void;
}) {
  const priceLabelMap: Record<string, string> = {
    all: "Tất cả",
    under_1m: "< 1.000.000đ",
    from_1m_3m: "1.000.000đ - 3.000.000đ",
    from_3m_5m: "3.000.000đ - 5.000.000đ",
    from_5m_10m: "5.000.000đ - 10.000.000đ",
    over_10m: "> 10.000.000đ",
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1 space-y-2">
        <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2B2420]">TÌM KIẾM</p>
        <div className="relative">
          <Input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSearchNow(); }}
            placeholder="Tìm sản phẩm"
            className="h-12 rounded-[14px] border border-[#D4AF7A]/35 bg-white px-4 pr-10 text-sm text-[#1A1A1A] shadow-sm placeholder:text-slate-400 focus-visible:border-[#B68C4A] focus-visible:ring-4 focus-visible:ring-[#D4AF7A]/15"
          />
        </div>
      </div>

      <div className="w-full min-w-[180px] flex-1 sm:w-auto sm:flex-initial space-y-2">
        <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2B2420]">SẮP XẾP</p>
        <Select value={sort} onValueChange={(value) => { if (value) setSort(value); }}>
          <SelectTrigger className="h-12 w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white px-4 text-[#1A1A1A] shadow-sm focus:ring-4 focus:ring-[#D4AF7A]/15">
            <SelectValue>{(v: string) => ({ newest: "Mới nhất", price_asc: "Giá tăng dần", price_desc: "Giá giảm dần", sold: "Bán chạy", rating: "Đánh giá cao" })[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="price_asc">Giá tăng dần</SelectItem>
            <SelectItem value="price_desc">Giá giảm dần</SelectItem>
            <SelectItem value="sold">Bán chạy</SelectItem>
            <SelectItem value="rating">Đánh giá cao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[190px] flex-1 sm:w-auto sm:flex-initial space-y-2">
        <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2B2420]">GIÁ</p>
        <Select value={pricePreset} onValueChange={(value) => { if (value) setPricePreset(value); }}>
          <SelectTrigger className="h-12 w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white px-4 text-[#1A1A1A] shadow-sm focus:ring-4 focus:ring-[#D4AF7A]/15">
            <SelectValue>{(v: string) => priceLabelMap[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(priceLabelMap).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-[160px] flex-1 sm:w-auto sm:flex-initial space-y-2">
        <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2B2420]">DANH MỤC</p>
        <CategoryCascadeSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          categories={categories}
        />
      </div>

      <div className="w-full min-w-[160px] flex-1 sm:w-auto sm:flex-initial space-y-2">
        <p className="font-serif text-[11px] font-semibold uppercase tracking-[0.28em] text-[#2B2420]">ĐÁNH GIÁ</p>
        <Select value={ratingFilter} onValueChange={(value) => { if (value) setRatingFilter(value); }}>
          <SelectTrigger className="h-12 w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white px-4 text-[#1A1A1A] shadow-sm focus:ring-4 focus:ring-[#D4AF7A]/15">
            <SelectValue>{(v: string) => ({ all: "Tất cả", "4.5": "≥ 4.5 sao", "4.0": "≥ 4.0 sao", "3.5": "≥ 3.5 sao" })[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="4.5">≥ 4.5 sao</SelectItem>
            <SelectItem value="4.0">≥ 4.0 sao</SelectItem>
            <SelectItem value="3.5">≥ 3.5 sao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          onClick={clearFilters}
          className="h-12 flex-1 sm:flex-initial rounded-[14px] border border-[#D4AF7A]/55 bg-white px-4 text-[#2B2420] transition-colors hover:bg-[#FBF7EE] hover:text-[#1A1A1A]"
        >
          Đặt lại
        </Button>
      </div>
    </div>
  );
}

export default function ProductListingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const initialKeyword = searchParams.get("keyword") || "";
  const [searchOpen, setSearchOpen] = useState(Boolean(initialKeyword));
  const [keywordInput, setKeywordInput] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);
  const categoryId = searchParams.get("categoryId") || "";
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [pricePreset, setPricePreset] = useState("all");
  const sortParam = searchParams.get("sort") || "";
  const [sort, setSort] = useState(sortParam || "newest");
  const [page, setPage] = useState(0);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchWrapRef = useRef<HTMLFormElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categorySlug = searchParams.get("categorySlug") || "";
  const sortTitle = sort === "newest" ? "Mới" : sort === "sale" ? "Giảm giá" : "";

  // Sync dropdown with URL params whenever categories load or URL changes
  useEffect(() => {
    if (!categories.length) return;
    if (categorySlug) {
      const found = categories.find((c) => c.slug === categorySlug);
      setCategoryFilter(found ? String(found.id) : "all");
      return;
    }
    if (categoryId) {
      setCategoryFilter(categoryId);
      return;
    }
    setCategoryFilter("all");
  }, [categorySlug, categoryId, categories]);

  useEffect(() => {
    let alive = true;
    categoriesApi.getAll().then((r) => { if (alive) setCategories(r.data.result); }).catch(() => {});
    productsApi.search({ status: "active", page: 0, size: 24, sort: "newest" })
      .then((r) => { if (alive) setSuggestions(r.data.result.content); })
      .catch(() => { if (alive) setSuggestions([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    bannersApi.getActive({ categorySlug: categorySlug || undefined })
      .then((r) => { if (alive) setBanners(r.data.result || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [categorySlug]);

  useEffect(() => {
    setSort(sortParam || "newest");
  }, [sortParam]);

  useEffect(() => {
    setPage(0);
  }, [categorySlug]);

  useEffect(() => {
    const kw = searchParams.get("keyword") || "";
    setKeyword(kw);
    setKeywordInput(kw);
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(0);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keywordInput]);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    switch (pricePreset) {
      case "under_1m":
        setPriceMin(0);
        setPriceMax(999999);
        break;
      case "from_1m_3m":
        setPriceMin(1000000);
        setPriceMax(3000000);
        break;
      case "from_3m_5m":
        setPriceMin(3000000);
        setPriceMax(5000000);
        break;
      case "from_5m_10m":
        setPriceMin(5000000);
        setPriceMax(10000000);
        break;
      case "over_10m":
        setPriceMin(10000000);
        setPriceMax(MAX_PRICE);
        break;
      default:
        setPriceMin(0);
        setPriceMax(MAX_PRICE);
        break;
    }
  }, [pricePreset]);

  const handleCategoryFilterChange = (value: string) => {
    setPage(0);
    if (value === "all") {
      router.replace("/products");
      return;
    }
    const found = categories.find((c) => String(c.id) === value);
    if (found) {
      router.replace(`/products?categorySlug=${encodeURIComponent(found.slug)}`);
    }
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.search({
        keyword: keyword || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        categorySlug: categorySlug || undefined,
        status: "active",
        sort,
        minPrice: priceMin > 0 ? priceMin : undefined,
        maxPrice: priceMax < MAX_PRICE ? priceMax : undefined,
        page,
        size: 24,
      });
      setProducts(res.data.result.content);
      setTotalPages(res.data.result.totalPages);
    } catch {
      setProducts([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, categorySlug, sort, page, priceMin, priceMax]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const searchNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setKeyword(keywordInput.trim());
    setPage(0);
    setSuggestionOpen(false);
  };

  const suggestionList = useMemo(() => {
    const q = keywordInput.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 8);
    return suggestions
      .filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      .slice(0, 8);
  }, [keywordInput, suggestions]);

  const categoryBreadcrumb = useMemo(() => {
    if (!categorySlug) return [];
    const bySlug = new Map(categories.map((category) => [category.slug, category]));
    const current = bySlug.get(categorySlug);
    if (!current) return [];
    const chain: Category[] = [];
    let cursor: Category | undefined = current;
    while (cursor) {
      chain.push(cursor);
      cursor = cursor.parentId ? categories.find((category) => category.id === cursor!.parentId) : undefined;
    }
    return chain.reverse();
  }, [categorySlug, categories]);

  const showSortTitle = !categorySlug && (searchParams.has("sort") || sort !== "newest");
  const pageTitle = categoryBreadcrumb.length > 0
    ? categoryBreadcrumb
    : showSortTitle && sortTitle
      ? [{ id: -1, name: sortTitle, slug: "" } as Category]
      : [];

  const localFacetActive = ratingFilter !== "all" || pricePreset !== "all";

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const ratingOk = ratingFilter === "all" || (product.ratingAverage ?? 0) >= Number(ratingFilter);
      const displayPrice = product.discountPercent > 0
        ? Math.round(product.price * (1 - product.discountPercent / 100))
        : product.price;
      const priceOk = displayPrice >= priceMin && displayPrice <= priceMax;
      return ratingOk && priceOk;
    });
  }, [products, ratingFilter, priceMin, priceMax]);

  const clearFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setCategoryFilter("all");
    setRatingFilter("all");
    setPriceMin(0);
    setPriceMax(MAX_PRICE);
    setPricePreset("all");
    setPage(0);
    setSort("newest");
    router.replace("/products");
    toast.success("Đã đặt lại bộ lọc");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSuggestionOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeFilterChips = [
    keyword ? { key: "keyword", label: `Từ khóa: ${keyword}` } : null,
    categoryBreadcrumb.length > 0 ? { key: "category", label: categoryBreadcrumb.map((item) => item.name).join(" / ") } : null,
    ratingFilter !== "all" ? { key: "rating", label: `≥ ${ratingFilter} sao` } : null,
    priceMin > 0 || priceMax < MAX_PRICE ? { key: "price", label: `${formatVND(priceMin)} - ${formatVND(priceMax)}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="bg-[#F8F6F2] text-[#0B1F1A]">
      <ProductListingHero
        banners={banners}
      />
      <section className="mx-auto max-w-7xl px-6 pt-8 sm:px-8 lg:px-10">
        <FilterPanel
          keywordInput={keywordInput}
          setKeywordInput={setKeywordInput}
          onSearchNow={searchNow}
          categoryFilter={categoryFilter}
          setCategoryFilter={handleCategoryFilterChange}
          categories={categories}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          sort={sort}
          setSort={(value) => {
            setSort(value);
            setPage(0);
          }}
          clearFilters={clearFilters}
          pricePreset={pricePreset}
          setPricePreset={setPricePreset}
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-6 pb-8 sm:px-8 sm:pt-6 sm:pb-12 lg:px-10 lg:pt-6 lg:pb-16">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[#5A4E46]">
              {loading ? "Đang tải danh sách..." : `${filteredProducts.length} sản phẩm hiển thị`}
            </p>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              {activeFilterChips.map((chip) => (
                <Badge
                  key={chip.key}
                  variant="outline"
                  className="rounded-full border border-[#D4AF7A]/35 bg-[#FBF7EE] px-4 py-2 text-[11px] font-medium text-[#2B2420]"
                >
                  {chip.label}
                </Badge>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-medium text-[#5A4E46] underline-offset-4 transition hover:text-[#1A1A1A] hover:underline hover:decoration-[#D4AF7A]"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-white">
                  <Skeleton className="aspect-[4/5] w-full rounded-none" />
                  <div className="space-y-2 p-2.5 sm:space-y-3 sm:p-4">
                    <div className="space-y-1">
                      <Skeleton className="h-2.5 w-1/4" />
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3.5 w-1/2" />
                    </div>
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-2/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-[#E7E7E2] bg-white px-6 py-16 text-center shadow-[0_10px_30px_rgba(43,36,32,0.08)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FBF7EE] text-2xl">
                🔍
              </div>
              <p className="mt-4 font-serif text-lg font-semibold text-[#1A1A1A]">Không tìm thấy sản phẩm phù hợp</p>
              <p className="mt-2 text-sm text-[#5A4E46]">
                Thử mới bộ lọc hoặc quay lại danh sách mới nhất.
              </p>
              <Button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-[14px] bg-[#111111] px-5 text-white transition-colors hover:bg-[#D4AF7A] hover:text-white"
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && !localFacetActive && (
                <div className="mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((prev) => prev - 1)}
                    className="w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white text-[#2B2420] sm:w-auto"
                  >
                    Trước
                  </Button>
                  <span className="flex items-center justify-center px-4 text-sm text-[#5A4E46]">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="w-full rounded-[14px] border border-[#D4AF7A]/35 bg-white text-[#2B2420] sm:w-auto"
                  >
                    Tiếp
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
