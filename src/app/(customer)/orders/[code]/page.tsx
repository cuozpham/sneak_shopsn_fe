"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi } from "@/lib/api/cart";
import { ordersApi } from "@/lib/api/orders";
import { reviewsApi } from "@/lib/api/reviews";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { useChatStore } from "@/store/chat";
import { SaveOnExitDialog } from "@/components/ui/save-on-exit-dialog";
import { toFrontendImageUrl } from "@/lib/image";
import {
  formatVND, formatDate,
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR,
  PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import type { Order, OrderItem, Review } from "@/lib/types";

type ReviewMode = "view" | "create" | "edit";
type ReviewAttachment = { productImageId: number; imageUrl: string };

const REVIEW_SUBMISSION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const CANCEL_REASONS = [
  "Tôi muốn cập nhật địa chỉ/sđt nhận hàng.",
  "Tôi muốn thêm/thay đổi Mã giảm giá.",
  "Tôi muốn thay đổi sản phẩm (kích thước, màu sắc, số lượng…).",
  "Thủ tục thanh toán rắc rối.",
  "Tôi tìm thấy chỗ mua khác tốt hơn (Rẻ hơn, uy tín hơn, giao nhanh hơn…).",
  "Tôi không có nhu cầu mua nữa.",
  "Tôi không tìm thấy lý do hủy phù hợp, khác.",
];

export default function OrderDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const { openChat, openProductChat } = useChatStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [reviewingReview, setReviewingReview] = useState<Review | null>(null);
  const [reviewMode, setReviewMode] = useState<ReviewMode>("create");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewAttachments, setReviewAttachments] = useState<ReviewAttachment[]>([]);
  const [reviewUploading, setReviewUploading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedOrderItemIds, setReviewedOrderItemIds] = useState<Set<number>>(new Set());
  const [reviewsByOrderItemId, setReviewsByOrderItemId] = useState<Record<number, Review>>({});
  const [showCancelInfoDialog, setShowCancelInfoDialog] = useState(false);
  const [repurchasing, setRepurchasing] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);
  const reviewBaseRef = useRef<{ rating: number; comment: string; attachments: ReviewAttachment[] }>({
    rating: 5,
    comment: "",
    attachments: [],
  });
  const { setItems } = useCartStore();

  const promptSave = (save: () => Promise<void>, discard: () => void) => {
    saveActionRef.current = save;
    discardActionRef.current = discard;
    setSavePromptOpen(true);
  };
  const confirmSave = async () => {
    const action = saveActionRef.current;
    saveActionRef.current = null;
    discardActionRef.current = null;
    setSavePromptOpen(false);
    if (action) await action();
  };
  const confirmDiscard = () => {
    const action = discardActionRef.current;
    saveActionRef.current = null;
    discardActionRef.current = null;
    setSavePromptOpen(false);
    if (action) action();
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.push("/login"); return; }
    Promise.all([
      ordersApi.getMyOrder(code),
      reviewsApi.getMyReviews({ page: 0, size: 100 }),
    ])
      .then(([orderRes, reviewRes]) => {
        const nextOrder = orderRes.data.result;
        setOrder(nextOrder);
        const nextReviews = reviewRes.data.result.content
          .filter((review) => typeof review.orderItemId === "number" && nextOrder.items.some((item) => item.id === review.orderItemId));
        const reviewed = new Set(nextReviews.map((review) => review.orderItemId).filter((id): id is number => typeof id === "number"));
        setReviewedOrderItemIds(reviewed);
        setReviewsByOrderItemId(
          Object.fromEntries(
            nextReviews
              .filter((review): review is Review & { orderItemId: number } => typeof review.orderItemId === "number")
              .map((review) => [review.orderItemId, review])
          )
        );
      })
      .catch(() => toast.error("Không tìm thấy đơn hàng"))
      .finally(() => setLoading(false));
  }, [code, hydrated, user, router]);

  const handleCancel = async () => {
    const reason = selectedCancelReason === "Tôi không tìm thấy lý do hủy phù hợp, khác."
      ? customCancelReason.trim()
      : selectedCancelReason.trim();
    if (!reason) { toast.error("Vui lòng nhập lý do hủy"); return; }
    setCancelling(true);
    try {
      const r = await ordersApi.cancelOrder(code, reason);
      setOrder(r.data.result);
      setShowCancelDialog(false);
      setCancelReason("");
      setSelectedCancelReason("");
      setCustomCancelReason("");
      toast.success("Đã hủy đơn hàng");
    } catch {
      toast.error("Không thể hủy đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  const cancelDirty = selectedCancelReason.trim().length > 0 || customCancelReason.trim().length > 0;
  const closeCancelDialog = () => {
    setShowCancelDialog(false);
    setCancelReason("");
    setSelectedCancelReason("");
    setCustomCancelReason("");
  };
  const requestCloseCancelDialog = () => {
    if (cancelDirty) {
      promptSave(handleCancel, closeCancelDialog);
      return;
    }
    closeCancelDialog();
  };

  const pickCancelReason = (reason: string) => {
    setSelectedCancelReason(reason);
    setCustomCancelReason("");
  };

  const openReviewDialog = (item: OrderItem, existingReview?: Review | null) => {
    setReviewingItem(item);
    setReviewingReview(existingReview ?? null);
    setReviewMode(existingReview ? "view" : "create");
    const attachments = existingReview
      ? (existingReview.imageUrls ?? []).map((url, index) => ({
          productImageId: existingReview.productImageIds?.[index] ?? index + 1,
          imageUrl: toFrontendImageUrl(url) || url,
        }))
      : [];
    const nextRating = existingReview?.rating ?? 5;
    const nextComment = existingReview?.comment ?? "";
    reviewBaseRef.current = {
      rating: nextRating,
      comment: nextComment,
      attachments,
    };
    setReviewRating(nextRating);
    setReviewComment(nextComment);
    setReviewAttachments(attachments);
  };

  const closeReviewDialog = () => {
    setReviewingItem(null);
    setReviewingReview(null);
    setReviewAttachments([]);
    setReviewMode("create");
  };

  const reviewDirty =
    reviewMode !== "view" &&
    (
      reviewRating !== reviewBaseRef.current.rating ||
      reviewComment.trim() !== reviewBaseRef.current.comment.trim() ||
      JSON.stringify(reviewAttachments.map((item) => item.productImageId)) !== JSON.stringify(reviewBaseRef.current.attachments.map((item) => item.productImageId))
    );

  const handleUploadReviewFiles = async (files: FileList | File[]) => {
    if (!reviewingItem || reviewMode === "view") return;
    if (!reviewingItem.productId) {
      toast.error("Thiếu dữ liệu sản phẩm");
      return;
    }
    const selectedFiles = Array.from(files);
    if (reviewAttachments.length + selectedFiles.length > 5) {
      toast.error("Chỉ được tải lên tối đa 5 ảnh/video");
      return;
    }
    setReviewUploading(true);
    try {
      const uploaded: ReviewAttachment[] = [];
      for (const file of selectedFiles) {
        const result = await reviewsApi.uploadImage(reviewingItem.productId, file);
        uploaded.push({
          ...result,
          imageUrl: toFrontendImageUrl(result.imageUrl) || result.imageUrl,
        });
      }
      setReviewAttachments((prev) => [...prev, ...uploaded].slice(0, 5));
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể tải ảnh/video đánh giá");
    } finally {
      setReviewUploading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewingItem) return;
    if (reviewMode === "view") return;
    if (reviewAttachments.length > 5) {
      toast.error("Chỉ được tải lên tối đa 5 ảnh/video");
      return;
    }
    setReviewSubmitting(true);
    try {
      const payload = {
        orderItemId: reviewingItem.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
        productImageIds: reviewAttachments.map((item) => item.productImageId),
      };
      const res = reviewingReview
        ? await reviewsApi.update(reviewingReview.id, payload)
        : await reviewsApi.create(payload);
      const savedReview = res.data.result;
      setReviewedOrderItemIds((prev) => new Set(prev).add(reviewingItem.id));
      setReviewsByOrderItemId((prev) => ({ ...prev, [reviewingItem.id]: savedReview }));
      closeReviewDialog();
      toast.success("Đã gửi đánh giá");
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể gửi đánh giá");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const requestCloseReviewDialog = () => {
    if (!reviewingItem) return;
    if (reviewMode === "view" || !reviewDirty) {
      closeReviewDialog();
      return;
    }
    promptSave(handleSubmitReview, closeReviewDialog);
  };

  const openOrderChat = () => {
    openChat(order?.orderCode ?? code);
  };

  const openSellerChat = async () => {
    if (!order) return;
    try {
      const res = await ordersApi.getChatContext(order.orderCode);
      const { conversationId, product } = res.data.result;
      openProductChat(conversationId, product);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể mở chat");
      openOrderChat();
    }
  };

  const reviewSubmissionOpen = order?.status === "completed" && (() => {
    const completedAt = new Date(order.completedAt ?? order.updatedAt ?? order.createdAt).getTime();
    return Number.isFinite(completedAt) && Date.now() <= completedAt + REVIEW_SUBMISSION_WINDOW_MS;
  })();
  const currentReview = reviewingItem?.id ? reviewsByOrderItemId[reviewingItem.id] ?? reviewingReview : reviewingReview;
  const reviewEditable = currentReview
    ? currentReview.userId === user?.id && !currentReview.shopReply && (currentReview.editCount ?? 0) < 1 && reviewSubmissionOpen
    : true;

  const handleRepurchase = async () => {
    if (!order) return;
    setRepurchasing(true);
    try {
      await Promise.all(order.items.map((item) => {
        if (!item.productId) {
          throw new Error("Thiếu dữ liệu sản phẩm");
        }
        return cartApi.addOrUpdate({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          colorId: item.colorId ?? undefined,
          quantity: item.quantity,
        });
      }));
      const cartRes = await cartApi.getCart();
      setItems(cartRes.data.result);
      toast.success("Đã thêm sản phẩm vào giỏ hàng");
      router.push("/cart");
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể mua lại đơn hàng");
    } finally {
      setRepurchasing(false);
    }
  };

  if (!hydrated) return <div className="max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-96" /></div>;
  if (!user) return null;
  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-96" /></div>;
  if (!order) return <div className="text-center py-16 text-gray-400">Không tìm thấy đơn hàng</div>;

  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => router.back()} className="shrink-0 text-gray-400 hover:text-gray-700">← Quay lại</button>
        <h1 className="text-lg font-bold sm:text-xl">Đơn #{order.orderCode}</h1>
        <Badge variant={ORDER_STATUS_COLOR[order.status]}>
          {ORDER_STATUS_LABEL[order.status] || order.status}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Order Items */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-bold mb-3">Sản phẩm</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 text-sm">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                  {item.productImage ? (
                    <Image src={item.productImage} alt={item.productName} width={64} height={64} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">👟</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug line-clamp-2">{item.productName}</p>
                    <p className="shrink-0 font-semibold text-blue-600">{formatVND(item.finalPrice * item.quantity)}</p>
                  </div>
                  {(item.variantName || item.colorName) && (
                    <p className="text-xs text-gray-400">
                      {[item.variantName, item.colorName].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">×{item.quantity}</p>
                  {order.status === "completed" && (
                    <div className="mt-1">
                      <Button
                        type="button"
                        size="sm"
                        disabled={!reviewedOrderItemIds.has(item.id) && !reviewSubmissionOpen}
                        className={`rounded-full shadow-sm ${
                          reviewedOrderItemIds.has(item.id)
                            ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                            : reviewSubmissionOpen
                              ? "border-amber-400 bg-amber-400 text-black hover:bg-amber-500 hover:border-amber-500"
                              : "border-gray-200 bg-gray-100 text-gray-400"
                        }`}
                        onClick={() => openReviewDialog(item, reviewsByOrderItemId[item.id])}
                      >
                        {reviewedOrderItemIds.has(item.id)
                          ? "Xem đánh giá"
                          : reviewSubmissionOpen
                            ? "Đánh giá"
                            : "Đã hết hạn đánh giá"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Tạm tính</span><span>{formatVND(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Phí vận chuyển</span><span>{formatVND(order.shippingFee)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Giảm giá</span><span>-{formatVND(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Tổng cộng</span><span>{formatVND(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Info */}
        <div className="bg-white border rounded-xl p-4 text-sm">
          <h2 className="font-bold mb-3">Thông tin giao hàng</h2>
          <p className="font-medium">{order.recipientName} — {order.recipientPhone}</p>
          <p className="text-gray-500">{order.shippingAddress}, {order.shippingCity}</p>
        </div>

        {/* Payment */}
        <div className="bg-white border rounded-xl p-4 text-sm">
          <h2 className="font-bold mb-3">Thanh toán</h2>
          <div className="flex justify-between">
            <span className="text-gray-500">Phương thức</span>
            <span>{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-500">Trạng thái</span>
            <span>{PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}</span>
          </div>
          {order.paidAt && (
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Thanh toán lúc</span>
              <span>{formatDate(order.paidAt)}</span>
            </div>
          )}
        </div>

        {order.status === "delivered" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
            <p className="text-sm text-amber-900 leading-6">
              Vui lòng chỉ nhấn &quot;Đã nhận được hàng&quot; khi đơn hàng đã được giao đến bạn và sản phẩm nhận được không có vấn đề nào.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="rounded-xl bg-black text-white hover:bg-gray-800"
                onClick={() => {
                  void ordersApi.confirmReceived(order.orderCode)
                    .then((r) => {
                      setOrder(r.data.result);
                      toast.success("Đã ghi nhận bạn đã nhận hàng");
                    })
                    .catch((err) => {
                      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể xác nhận nhận hàng");
                    });
                }}
              >
                Đã nhận hàng
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={openOrderChat}
              >
                Yêu cầu Trả hàng/Hoàn tiền
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => void openSellerChat()}
              >
                Liên hệ Người bán
              </Button>
            </div>
          </div>
        )}

        {order.status === "cancelled" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-red-700">Đơn hàng đã được hủy.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() => setShowCancelInfoDialog(true)}
              >
                Xem chi tiết Hủy đơn
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="rounded-xl bg-black text-white hover:bg-gray-800"
                onClick={() => void handleRepurchase()}
                disabled={repurchasing}
              >
                {repurchasing ? "Đang thêm..." : "Mua lại"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={openOrderChat}
              >
                Liên hệ Người bán
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>Đặt hàng: {formatDate(order.createdAt)}</span>
        </div>

        {canCancel && (
          <Button variant="destructive" className="w-full" onClick={() => { setShowCancelDialog(true); setCancelReason(""); }}>
            Hủy đơn hàng
          </Button>
        )}

      </div>

      <Dialog open={showCancelInfoDialog} onOpenChange={setShowCancelInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết Hủy đơn</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Lời nhắn</span>
              <span className="font-medium">Đơn hàng đã được hủy.</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Thời gian hủy</span>
              <span className="font-medium">{order.cancelledAt ? formatDate(order.cancelledAt) : "Chưa ghi nhận"}</span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-gray-500 mb-1">Lý do hủy</p>
              <p className="leading-6">{order.cancelReason || "Không có lý do"}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewingItem)} onOpenChange={(open) => {
        if (open) return;
        requestCloseReviewDialog();
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {reviewMode === "create"
                ? "Đánh giá sản phẩm"
                : reviewMode === "edit"
                  ? "Chỉnh sửa đánh giá"
                  : "Xem đánh giá"}
            </DialogTitle>
          </DialogHeader>
          {reviewingItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{reviewingItem.productName}</p>
                {(reviewingItem.variantName || reviewingItem.colorName) && (
                  <p className="text-xs text-gray-500">
                    {[reviewingItem.variantName, reviewingItem.colorName].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Số sao</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => reviewMode === "view" ? undefined : setReviewRating(star)}
                      disabled={reviewMode === "view"}
                      className={`h-10 w-10 rounded-full border text-lg font-bold shadow-sm transition ${
                        reviewRating >= star
                          ? "border-yellow-500 bg-yellow-400 text-white shadow-yellow-200"
                          : "border-yellow-200 bg-yellow-50 text-yellow-300 hover:border-yellow-400 hover:bg-yellow-100 hover:text-yellow-500"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Bình luận</p>
                <textarea
                  className="w-full min-h-28 rounded-xl border px-3 py-2 text-sm outline-none focus:border-black"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  disabled={reviewMode === "view"}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Ảnh / video đánh giá</p>
                  {reviewMode !== "view" && (
                    <label className="inline-flex cursor-pointer items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                      {reviewUploading ? "Đang tải..." : "Thêm ảnh/video"}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        disabled={reviewUploading}
                        onChange={(e) => {
                          if (e.target.files) {
                            void handleUploadReviewFiles(e.target.files);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {reviewAttachments.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {reviewAttachments.map((attachment) => (
                      <div key={attachment.productImageId} className="relative overflow-hidden rounded-xl border bg-gray-50">
                        {(toFrontendImageUrl(attachment.imageUrl) || attachment.imageUrl).toLowerCase().match(/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/) ? (
                          <video src={toFrontendImageUrl(attachment.imageUrl) || attachment.imageUrl} controls className="h-28 w-full object-cover" />
                        ) : (
                          <img src={toFrontendImageUrl(attachment.imageUrl) || attachment.imageUrl} alt="Ảnh đính kèm đánh giá" className="h-28 w-full object-cover" />
                        )}
                        {reviewMode !== "view" && (
                          <button
                            type="button"
                            className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[11px] font-medium text-white"
                            onClick={() => setReviewAttachments((prev) => prev.filter((item) => item.productImageId !== attachment.productImageId))}
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Chưa có ảnh/video nào</p>
                )}
              </div>

              {currentReview && (
                <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                  <p>Đã đánh giá: {formatDate(currentReview.createdAt)}</p>
                  {currentReview.editCount && currentReview.editCount > 0 ? (
                    <p>Đã chỉnh sửa một lần, không thể sửa thêm.</p>
                  ) : reviewEditable ? (
                    <p>Có thể sửa một lần trong 7 ngày kể từ khi đơn hoàn tất.</p>
                  ) : (
                    <p>Đã hết thời gian sửa đánh giá.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={requestCloseReviewDialog}>
                  {reviewMode === "view" ? "Đóng" : "Hủy"}
                </Button>
                {reviewMode === "view" ? (
                  currentReview && reviewEditable ? (
                    <Button type="button" onClick={() => setReviewMode("edit")}>
                      Sửa đánh giá
                    </Button>
                  ) : null
                ) : (
                  <Button type="button" onClick={() => void handleSubmitReview()} disabled={reviewSubmitting || reviewUploading}>
                    {reviewSubmitting ? "Đang lưu..." : reviewingReview ? "Lưu thay đổi" : "Gửi đánh giá"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={(open) => {
        if (open) {
          setShowCancelDialog(true);
          return;
        }
        requestCloseCancelDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý Do Hủy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-gray-600">
              Bạn có biết? Bạn có thể cập nhật thông tin nhận hàng cho đơn hàng (1 lần duy nhất). Nếu bạn xác nhận hủy, toàn bộ đơn hàng sẽ được hủy. Chọn lý do hủy phù hợp nhất với bạn nhé!
            </p>
            <div className="flex flex-wrap gap-2">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => pickCancelReason(reason)}
                  className={`rounded-full border px-3 py-2 text-left text-xs leading-5 transition ${
                    selectedCancelReason === reason
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {selectedCancelReason === "Tôi không tìm thấy lý do hủy phù hợp, khác." && (
              <textarea
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm"
                rows={3}
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                autoFocus
                placeholder="Nhập lý do hủy của bạn..."
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={requestCloseCancelDialog}>Không</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !selectedCancelReason.trim() || (selectedCancelReason === "Tôi không tìm thấy lý do hủy phù hợp, khác." && !customCancelReason.trim())}>
                {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SaveOnExitDialog
        open={savePromptOpen}
        onSave={() => void confirmSave()}
        onDiscard={confirmDiscard}
      />
    </div>
  );
}
