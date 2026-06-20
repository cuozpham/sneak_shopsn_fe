"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { reviewsApi } from "@/lib/api/reviews";
import AdminPagination from "@/components/admin/AdminPagination";
import { formatDate } from "@/lib/format";
import type { Review } from "@/lib/types";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await reviewsApi.adminGetAll({ page, size: 20 });
      setReviews(r.data.result.content);
      setTotalPages(r.data.result.totalPages);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="space-y-3 sm:space-y-4">
      <h1 className="text-xl font-bold sm:text-2xl">Quản lý đánh giá</h1>

      <div className="hidden overflow-x-auto rounded-xl border bg-white sm:block">
        <table className="min-w-[920px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Người dùng", "Sản phẩm", "Đánh giá", "Bình luận", "Phản hồi", "Ngày", ""].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : reviews.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Chưa có đánh giá</td></tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.userName}</td>
                  <td className="px-4 py-3 text-gray-700">{r.productName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{r.comment || "—"}</td>
                  <td className="px-4 py-3">
                    {r.shopReply ? (
                      <span className="text-green-600 text-xs">✓ Đã trả lời</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Chưa trả lời</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/reviews/${r.id}`}>
                      <Button size="sm" variant="outline">Chi tiết</Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ))
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">Chưa có đánh giá</div>
        ) : reviews.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.userName}</p>
                <p className="truncate text-xs text-gray-500">#{r.productId} · {r.productName}</p>
              </div>
              <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-600">{r.comment || "—"}</p>
            <div className="mt-2 text-xs">
              {r.shopReply ? (
                <span className="text-green-600">✓ Đã trả lời</span>
              ) : (
                <span className="text-gray-400">Chưa trả lời</span>
              )}
            </div>
            <div className="mt-3">
              <Link href={`/admin/reviews/${r.id}`}>
                <Button size="sm" variant="outline" className="w-full">Chi tiết</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

    </div>
  );
}
