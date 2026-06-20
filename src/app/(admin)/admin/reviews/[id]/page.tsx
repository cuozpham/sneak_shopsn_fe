"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { publicApi } from "@/lib/api/public";
import { reviewsApi } from "@/lib/api/reviews";
import { formatDate } from "@/lib/format";
import { toFrontendImageUrl } from "@/lib/image";
import { decodeReviewReply, encodeReviewReply } from "@/lib/review-reply";
import type { Review } from "@/lib/types";

export default function AdminReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reviewId = Number(id);
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(reviewId) || reviewId <= 0) {
      setLoading(false);
      return;
    }

    reviewsApi.adminGetById(reviewId)
      .then((response) => {
        const item = response.data.result;
        const replyContent = decodeReviewReply(item.shopReply);
        setReview(item);
        setReply(replyContent.text);
        setReplyImages(replyContent.imageUrls);
      })
      .catch(() => toast.error("Không thể tải đánh giá"))
      .finally(() => setLoading(false));
  }, [reviewId]);

  const handleSave = async () => {
    if (!review || (!reply.trim() && replyImages.length === 0)) {
      toast.error("Vui lòng nhập nội dung hoặc thêm ảnh phản hồi");
      return;
    }

    setSaving(true);
    try {
      const response = await reviewsApi.shopReply(
        review.id,
        encodeReviewReply(reply, replyImages)
      );
      const savedReply = decodeReviewReply(response.data.result.shopReply);
      setReview(response.data.result);
      setReply(savedReply.text);
      setReplyImages(savedReply.imageUrls);
      toast.success(review.shopReply ? "Đã cập nhật phản hồi" : "Đã gửi phản hồi");
      setTimeout(() => {
        router.push("/admin/reviews");
      }, 1000);
    } catch {
      toast.error("Không thể lưu phản hồi");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImages = async (files: FileList) => {
    const selectedFiles = Array.from(files);
    if (replyImages.length + selectedFiles.length > 5) {
      toast.error("Chỉ được đính kèm tối đa 5 ảnh");
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selectedFiles) {
        uploaded.push(await publicApi.upload(file));
      }
      setReplyImages((current) => [...current, ...uploaded].slice(0, 5));
    } catch {
      toast.error("Không thể tải ảnh lên");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Đang tải...</div>;

  if (!review) {
    return (
      <div className="space-y-4">
        <Link href="/admin/reviews">
          <Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Quay lại</Button>
        </Link>
        <p className="text-gray-500">Không tìm thấy đánh giá.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/reviews">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Chi tiết đánh giá</h1>
          <p className="text-sm text-gray-500">{review.productName}</p>
        </div>
      </div>

      <section className="space-y-4 rounded-xl border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{review.userName}</p>
            <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Sản phẩm</p>
          <p>{review.productName}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-500">Nội dung đánh giá</p>
          <p className="whitespace-pre-wrap text-gray-700">{review.comment || "Không có bình luận"}</p>
        </div>

        {review.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {review.imageUrls.map((url) => (
              <div key={url} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                <Image src={toFrontendImageUrl(url)} alt="Ảnh đánh giá" fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4 rounded-xl border bg-gray-50 p-4">
          <div>
            <p className="font-medium">Phản hồi của shop</p>
            <p className="text-xs text-gray-500">Nhập nội dung và có thể đính kèm tối đa 5 ảnh.</p>
          </div>
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            rows={5}
            placeholder="Nhập phản hồi cho khách hàng..."
          />

          {replyImages.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {replyImages.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-lg border bg-white">
                  <Image src={toFrontendImageUrl(url)} alt="Ảnh phản hồi" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setReplyImages((current) => current.filter((item) => item !== url))}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                    aria-label="Xóa ảnh phản hồi"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium hover:bg-gray-100">
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Đang tải ảnh..." : "Thêm ảnh"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={uploading || replyImages.length >= 5}
                onChange={(event) => {
                  if (event.target.files) void handleUploadImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <Button onClick={() => void handleSave()} disabled={saving || uploading}>
              {saving ? "Đang lưu..." : review.shopReply ? "Lưu thay đổi" : "Gửi phản hồi"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
