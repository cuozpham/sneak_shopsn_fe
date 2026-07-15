"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { productsApi } from "@/lib/api/products";
import { formatRating, formatVND, formatDate } from "@/lib/format";
import type { Product } from "@/lib/types";
import { Search, Edit, Trash2, Plus, Pin, PinOff } from "lucide-react";
import AdminPagination from "@/components/admin/AdminPagination";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFeatured, setShowFeatured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (kw: string) => {
    setLoading(true);
    try {
      if (showFeatured) {
        const r = await productsApi.adminListFeatured();
        setProducts(r.data.result.content);
        setTotalPages(1);
      } else if (showDeleted) {
        const [deletedRes, inactiveRes] = await Promise.all([
          productsApi.adminSearch({ keyword: kw || undefined, deleted: true, page, size: 15 }),
          productsApi.adminSearch({ keyword: kw || undefined, status: "inactive", deleted: false, page, size: 15 }),
        ]);
        setProducts([...deletedRes.data.result.content, ...inactiveRes.data.result.content]);
        setTotalPages(Math.max(deletedRes.data.result.totalPages, inactiveRes.data.result.totalPages));
      } else if (status === "out_of_stock") {
        const r = await productsApi.adminSearch({
          keyword: kw || undefined,
          status: "active",
          deleted: false,
          page: 0,
          size: 500,
        });
        setProducts(r.data.result.content.filter((p) => (p.stockQuantity ?? 0) === 0));
        setTotalPages(1);
      } else {
        const r = await productsApi.adminSearch({
          keyword: kw || undefined,
          status: status || undefined,
          deleted: false,
          page,
          size: 15,
        });
        setProducts(r.data.result.content.filter((p) => p.status !== "inactive"));
        setTotalPages(r.data.result.totalPages);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(debouncedKeyword); }, [status, page, showDeleted, showFeatured, debouncedKeyword]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedKeyword(keyword);
    setPage(0);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Chuyển sản phẩm này vào thùng rác? Bạn có thể khôi phục lại sau.")) return;
    try {
      await productsApi.delete(id);
      toast.success("Đã chuyển sản phẩm vào thùng rác");
      load(debouncedKeyword);
    } catch { toast.error("Không thể chuyển sản phẩm vào thùng rác"); }
  };

  const handleTogglePin = async (p: Product) => {
    try {
      if (p.featured) {
        await productsApi.adminSetFeatured(p.id, { featured: false, featuredOrder: null });
        toast.success("Đã bỏ ghim sản phẩm");
        load(debouncedKeyword);
        return;
      }
      const orderStr = prompt("Thứ tự hiển thị (số càng nhỏ càng lên đầu):", "1");
      if (orderStr === null) return;
      const order = Number(orderStr);
      if (!Number.isFinite(order) || order < 1) { toast.error("Thứ tự không hợp lệ"); return; }
      const beforeMap = new Map<number, number | null | undefined>();
      try {
        const before = await productsApi.adminListFeatured();
        before.data.result.content.forEach((it) => beforeMap.set(it.id, it.featuredOrder ?? null));
      } catch {}
      await productsApi.adminSetFeatured(p.id, { featured: true, featuredOrder: order });
      let shifted = 0;
      try {
        const after = await productsApi.adminListFeatured();
        after.data.result.content.forEach((it) => {
          if (it.id === p.id) return;
          const prev = beforeMap.get(it.id);
          if (prev !== undefined && prev !== (it.featuredOrder ?? null)) shifted += 1;
        });
      } catch {}
      if (shifted > 0) {
        toast.success(`Đã ghim ${p.name.slice(0, 30)}... tại vị trí ${order}. ${shifted} sản phẩm khác đã được đẩy xuống.`);
      } else {
        toast.success(`Đã ghim sản phẩm tại vị trí ${order}`);
      }
      load(debouncedKeyword);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể cập nhật ghim");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Quản lý sản phẩm</h1>
        <Link href="/admin/products/new" style={{ display: "contents" }}>
          <Button className="w-full gap-2 sm:w-auto"><Plus className="w-4 h-4" />Thêm sản phẩm</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <form onSubmit={handleSearch} className="flex w-full gap-2 sm:max-w-sm">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button type="submit" size="icon" variant="outline"><Search className="w-4 h-4" /></Button>
        </form>
        {!showDeleted && (
          <Select value={status || "all"} onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-full bg-white sm:w-40">
              <SelectValue>{(v: string) => ({ all: "Tất cả", active: "Đang bán", out_of_stock: "Hết hàng" })[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Đang bán</SelectItem>
              <SelectItem value="out_of_stock">Hết hàng</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button
          variant={showFeatured ? "default" : "outline"}
          className="w-full gap-2 sm:w-auto"
          onClick={() => { setShowFeatured((v) => !v); setShowDeleted(false); setStatus(""); setPage(0); }}
        >
          <Pin className="w-4 h-4" />
          {showFeatured ? "Xem tất cả" : "Đang ghim"}
        </Button>
        <Button
          variant={showDeleted ? "default" : "outline"}
          className="w-full gap-2 sm:w-auto"
          onClick={() => { setShowDeleted((v) => !v); setShowFeatured(false); setStatus(""); setPage(0); }}
        >
          <Trash2 className="w-4 h-4" />
          {showDeleted ? "Quay lại sản phẩm" : "Thùng rác"}
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white sm:block">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {(showFeatured
                ? ["Vị trí", "Ảnh", "Tên sản phẩm", "Giá", "Tồn kho", "Đánh giá", "Trạng thái", "Ngày tạo", ""]
                : ["Ảnh", "Tên sản phẩm", "Giá", "Tồn kho", "Đánh giá", "Trạng thái", "Ngày tạo", ""]
              ).map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={showFeatured ? 9 : 8} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={showFeatured ? 9 : 8} className="text-center py-12 text-gray-400">
                  {showDeleted ? "Thùng rác đang trống" : "Không tìm thấy sản phẩm"}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={`border-b last:border-0 hover:bg-gray-50 ${p.deleted ? "opacity-60" : ""}`}>
                  {showFeatured && (
                    <td className="px-4 py-3 text-sm font-semibold text-amber-600">
                      {p.featuredOrder ?? "—"}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100">
                      {p.coverImageUrl ? (
                        <Image src={p.coverImageUrl} alt={p.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">👟</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium line-clamp-2 max-w-48">{p.name}</p>
                    <p className="text-gray-400 text-xs">{p.shop?.name}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatVND(p.price)}
                    {p.discountPercent > 0 && (
                      <Badge className="ml-1 text-xs bg-red-100 text-red-600 border-red-200">-{p.discountPercent}%</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.stockQuantity ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    ⭐ {formatRating(p.ratingAverage)} ({p.reviewCount})
                  </td>
                  <td className="px-4 py-3">
                    {p.deleted ? (
                      <Badge variant="destructive" className="text-xs">Đã xóa</Badge>
                    ) : (
                      <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                        {p.status === "active" ? "Đang bán" : p.status === "inactive" ? "Ẩn" : "Hết hàng"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.deleted ? (
                        <Link href={`/admin/products/${p.id}`}>
                          <Button size="sm" variant="outline" className="gap-1">
                            <Edit className="w-3 h-3" />
                            <span className="text-xs">Sửa</span>
                          </Button>
                        </Link>
                      ) : (
                        <>
                          <Link href={`/admin/products/${p.id}`}>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Edit className="w-3 h-3" />
                            </Button>
                          </Link>
                          <Button size="sm" variant="outline" className={`gap-1 ${p.featured ? "text-amber-600 hover:text-amber-700" : ""}`}
                            onClick={() => handleTogglePin(p)}
                            title={p.featured ? `Bỏ ghim (thứ tự ${p.featuredOrder ?? "-"})` : "Ghim vào nổi bật"}>
                            {p.featured ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(p.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">
            {showDeleted ? "Thùng rác đang trống" : "Không tìm thấy sản phẩm"}
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className={`rounded-xl border bg-white p-3 shadow-sm ${p.deleted ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {p.coverImageUrl ? (
                    <Image src={p.coverImageUrl} alt={p.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">👟</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.shop?.name}</p>
                </div>
                {p.deleted ? (
                  <Badge variant="destructive" className="shrink-0 text-[10px]">Đã xóa</Badge>
                ) : (
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className="shrink-0 text-[10px]">
                    {p.status === "active" ? "Đang bán" : p.status === "inactive" ? "Ẩn" : "Hết hàng"}
                  </Badge>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Giá:</span>{" "}
                  <span className="font-semibold">{formatVND(p.price)}</span>
                  {p.discountPercent > 0 && <span className="ml-1 text-red-500">-{p.discountPercent}%</span>}
                </div>
                <div><span className="text-gray-400">Tồn:</span> {p.stockQuantity ?? "—"}</div>
                <div><span className="text-gray-400">⭐</span> {formatRating(p.ratingAverage)}</div>
              </div>
              <div className="mt-3 flex gap-2">
                {p.deleted ? (
                  <Link href={`/admin/products/${p.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full gap-1">
                      <Edit className="w-3 h-3" />Sửa
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={`/admin/products/${p.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full gap-1">
                        <Edit className="w-3 h-3" />Sửa
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" className={`gap-1 ${p.featured ? "text-amber-600" : ""}`}
                      onClick={() => handleTogglePin(p)}>
                      {p.featured ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
