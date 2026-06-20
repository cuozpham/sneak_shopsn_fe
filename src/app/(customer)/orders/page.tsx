"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SaveOnExitDialog } from "@/components/ui/save-on-exit-dialog";
import { cartApi } from "@/lib/api/cart";
import { ordersApi } from "@/lib/api/orders";
import { reviewsApi } from "@/lib/api/reviews";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { formatVND, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";
import type { Order } from "@/lib/types";

const STATUS_TABS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const CANCEL_REASONS = [
  "Tôi muốn cập nhật địa chỉ/sđt nhận hàng.",
  "Tôi muốn thêm/thay đổi Mã giảm giá.",
  "Tôi muốn thay đổi sản phẩm (kích thước, màu sắc, số lượng…).",
  "Thủ tục thanh toán rắc rối.",
  "Tôi tìm thấy chỗ mua khác tốt hơn (Rẻ hơn, uy tín hơn, giao nhanh hơn…).",
  "Tôi không có nhu cầu mua nữa.",
  "Tôi không tìm thấy lý do hủy phù hợp, khác.",
];

export default function OrdersPage() {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reviewedOrderItemIds, setReviewedOrderItemIds] = useState<Set<number>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelOrderCode, setCancelOrderCode] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [selectedCancelReason, setSelectedCancelReason] = useState("");
  const [customCancelReason, setCustomCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);

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
    setLoading(true);
    Promise.all([
      ordersApi.getMyOrders({ status: status || undefined, page, size: 10 }),
      reviewsApi.getMyReviews({ page: 0, size: 500 }),
    ])
      .then(([ordersRes, reviewsRes]) => {
        setOrders(ordersRes.data.result.content);
        setTotalPages(ordersRes.data.result.totalPages);
        setReviewedOrderItemIds(new Set(
          reviewsRes.data.result.content
            .map((review) => review.orderItemId)
            .filter((id): id is number => typeof id === "number")
        ));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hydrated, user, status, page, router]);

  const handleTabChange = (val: string) => { setStatus(val); setPage(0); };

  const openCancelDialog = (orderCode: string) => {
    setCancelOrderCode(orderCode);
    setCancelReason("");
    setSelectedCancelReason("");
    setCustomCancelReason("");
    setShowCancelDialog(true);
  };

  const closeCancelDialog = () => {
    setShowCancelDialog(false);
    setCancelOrderCode("");
    setCancelReason("");
    setSelectedCancelReason("");
    setCustomCancelReason("");
  };

  const handleCancelOrder = async () => {
    if (!cancelOrderCode) return;
    const reason = (selectedCancelReason === "Tôi không tìm thấy lý do hủy phù hợp, khác."
      ? customCancelReason.trim()
      : selectedCancelReason.trim());
    if (!reason) {
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }
    try {
      setCancelling(true);
      await ordersApi.cancelOrder(cancelOrderCode, reason);
      toast.success("Đã hủy đơn hàng");
      setOrders((prev) => prev.filter((order) => order.orderCode !== cancelOrderCode));
      closeCancelDialog();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể hủy đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  const cancelDirty = selectedCancelReason.trim().length > 0 || customCancelReason.trim().length > 0;
  const requestCloseCancelDialog = () => {
    if (cancelDirty) {
      promptSave(handleCancelOrder, closeCancelDialog);
      return;
    }
    closeCancelDialog();
  };

  if (!hydrated) return <div className="mx-auto max-w-5xl px-4 py-8"><Skeleton className="h-96 rounded-2xl" /></div>;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-5 text-xl font-bold sm:text-2xl">Đơn hàng của tôi</h1>

      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {STATUS_TABS.map((t) => (
          <button key={t.value} onClick={() => handleTabChange(t.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              status === t.value ? "bg-black text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Chưa có đơn hàng nào</p>
          <Link href="/products">
            <Button className="mt-4 rounded-xl bg-black text-white hover:bg-gray-800">Mua sắm ngay</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              reviewedOrderItemIds={reviewedOrderItemIds}
              onRefresh={() => setOrders((prev) => prev.filter((o) => o.orderCode !== order.orderCode))}
              onRequestCancel={() => openCancelDialog(order.orderCode)}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex flex-col items-stretch justify-center gap-2 pt-4 sm:flex-row sm:items-center">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="w-full rounded-xl sm:w-auto">Trước</Button>
              <span className="flex items-center px-3 text-sm text-gray-600">{page + 1} / {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="w-full rounded-xl sm:w-auto">Tiếp</Button>
            </div>
          )}
        </div>
      )}

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
                  onClick={() => {
                    setSelectedCancelReason(reason);
                    setCustomCancelReason("");
                  }}
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
              <Textarea
                className="min-h-24 resize-none"
                rows={4}
                value={customCancelReason}
                onChange={(e) => setCustomCancelReason(e.target.value)}
                autoFocus
                placeholder="Nhập lý do hủy của bạn..."
              />
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={requestCloseCancelDialog} disabled={cancelling}>
                Không
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleCancelOrder()}
                disabled={cancelling || !selectedCancelReason.trim() || (selectedCancelReason === "Tôi không tìm thấy lý do hủy phù hợp, khác." && !customCancelReason.trim())}
              >
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

function OrderCard({ order, reviewedOrderItemIds, onRefresh, onRequestCancel }: { order: Order; reviewedOrderItemIds: Set<number>; onRefresh: () => void; onRequestCancel: () => void }) {
  const { setItems } = useCartStore();
  const { openChat, openProductChat } = useChatStore();
  const hasReview = order.items.some((item) => reviewedOrderItemIds.has(item.id));

  const reviewDeadlineDate = (() => {
    const base = new Date(order.completedAt ?? order.updatedAt ?? order.createdAt);
    base.setDate(base.getDate() + 7);
    return base;
  })();
  const reviewDeadline = reviewDeadlineDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const reviewSubmissionOpen = Date.now() <= reviewDeadlineDate.getTime();

  const handleCancel = async () => {
    if (!confirm("Bạn có chắc muốn hủy đơn hàng này không?")) return;
    try {
      await ordersApi.cancelOrder(order.orderCode, "Khách hàng tự hủy");
      toast.success("Đã hủy đơn hàng");
      onRefresh();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể hủy đơn hàng");
    }
  };

  const handleConfirmReceived = async () => {
    try {
      await ordersApi.confirmReceived(order.orderCode);
      toast.success("Đã ghi nhận bạn đã nhận hàng");
      onRefresh();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể xác nhận nhận hàng");
    }
  };

  const handleRepurchase = async () => {
    try {
      await Promise.all(order.items.map((item) => {
        if (!item.productId) throw new Error("Thiếu dữ liệu sản phẩm");
        return cartApi.addOrUpdate({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          colorId: item.colorId ?? undefined,
          quantity: item.quantity,
        });
      }));
      const cartRes = await cartApi.getCart();
      setItems(cartRes.data.result);
      toast.success("Đã thêm lại sản phẩm vào giỏ hàng");
      window.location.href = "/cart";
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể mua lại đơn hàng");
    }
  };

  const handleContactSeller = async () => {
    try {
      const res = await ordersApi.getChatContext(order.orderCode);
      const { conversationId, product } = res.data.result;
      openProductChat(conversationId, product);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Không thể mở chat");
      openChat(order.orderCode);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-white transition hover:shadow-md">
      {/* Header */}
      {order.status === "cancelled" ? (
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">#{order.orderCode}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
          </div>
          <span className="text-sm font-bold text-blue-600">ĐÃ HỦY</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">#{order.orderCode}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
          </div>
          <Badge variant={ORDER_STATUS_COLOR[order.status]}>
            {ORDER_STATUS_LABEL[order.status] || order.status}
          </Badge>
        </div>
      )}

      {/* Items */}
      <div className="divide-y divide-gray-50">
        {order.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row">
            {/* Square image */}
            <div className="w-16 h-16 rounded-lg border border-gray-100 bg-gray-50 overflow-hidden flex-shrink-0">
              {item.productImage ? (
                <Image src={item.productImage} alt={item.productName} width={64} height={64} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
              )}
            </div>

            {/* Name + variant + qty | price */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">{item.productName}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Phân loại: {[item.variantName, item.colorName].filter(Boolean).join(", ") || "—"}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">x{item.quantity}</p>
              </div>
              <div className="flex-shrink-0 text-left sm:text-right">
                {item.discountPercent > 0 && (
                  <p className="text-xs text-gray-400 line-through">{formatVND(item.productPrice)}</p>
                )}
                <p className="text-sm font-semibold text-blue-600">{formatVND(item.finalPrice)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delivered banner */}
      {order.status === "delivered" && (
        <div className="mx-4 mb-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs text-amber-800 leading-relaxed">
            Vui lòng chỉ nhấn &quot;Đã nhận được hàng&quot; khi đơn hàng đã được giao đến bạn và sản phẩm không có vấn đề nào.
          </p>
        </div>
      )}

      {/* Total row */}
      <div className="flex items-center justify-end gap-2 border-t border-dashed border-gray-100 px-4 py-2">
        <span className="text-sm text-gray-500">Thành tiền:</span>
        <span className="text-lg font-bold text-blue-600">{formatVND(order.totalAmount)}</span>
      </div>

      {/* Action row */}
      <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left */}
        <div className="min-w-0 text-xs leading-relaxed text-gray-400">
          {order.status === "completed" && (
            <span>
              Hạn đánh giá: <span className="font-medium text-gray-600">{reviewDeadline}</span>
              {" · "}
              <Link href={`/orders/${order.orderCode}`} className="text-blue-500 hover:underline">Xem chi tiết</Link>
            </span>
          )}
          {order.status === "cancelled" && (
            <span className="text-gray-500">Đã hủy bởi bạn</span>
          )}
          {order.status === "delivered" && (
            <span className="text-amber-600">Xác nhận để hoàn tất đơn hàng</span>
          )}
          {!["completed", "cancelled", "delivered"].includes(order.status) && (
            <span>
              {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
              {" · "}
              <span className={order.paymentStatus === "paid" ? "text-green-600 font-medium" : ""}>
                {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
              </span>
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-2">

          {/* COMPLETED */}
          {order.status === "completed" && (
            <>
              <Link href={`/orders/${order.orderCode}`}
                className={`inline-flex h-8 w-full items-center justify-center rounded-md px-3 text-xs font-semibold transition sm:w-auto ${
                  hasReview
                    ? "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
                    : reviewSubmissionOpen
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "pointer-events-none border border-gray-200 bg-gray-100 text-gray-400"
                }`}>
                {hasReview ? "Xem đánh giá" : reviewSubmissionOpen ? "Đánh Giá" : "Đã hết hạn đánh giá"}
              </Link>
              <button
                onClick={() => void handleContactSeller()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Yêu Cầu Trả Hàng/Hoàn Tiền
              </button>
              <button
                onClick={() => void handleRepurchase()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Mua Lại
              </button>
              <button
                onClick={() => void handleContactSeller()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Liên Hệ Người Bán
              </button>
            </>
          )}

          {/* DELIVERED */}
          {order.status === "delivered" && (
            <>
              <button onClick={() => void handleConfirmReceived()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 sm:w-auto">
                Đã Nhận Hàng
              </button>
              <button
                onClick={() => void handleContactSeller()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Yêu Cầu Trả Hàng/Hoàn Tiền
              </button>
            </>
          )}

          {/* CANCELLED */}
          {order.status === "cancelled" && (
            <>
              <button onClick={() => void handleRepurchase()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 sm:w-auto">
                Mua Lại
              </button>
              <Link href={`/orders/${order.orderCode}`}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Xem Chi Tiết Hủy Đơn
              </Link>
              <button
                onClick={() => void handleContactSeller()}
                className="inline-flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50">
                Liên Hệ Người Bán
              </button>
            </>
          )}

          {/* PENDING / CONFIRMED — can cancel */}
          {(order.status === "pending" || order.status === "confirmed") && (
            <>
              <button
                onClick={() => onRequestCancel()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-red-300 bg-white px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 sm:w-auto">
                Hủy Đơn
              </button>
              <button
                onClick={() => void handleContactSeller()}
                className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                Liên Hệ Người Bán
              </button>
            </>
          )}

          {/* SHIPPING — cannot cancel */}
          {order.status === "shipping" && (
            <button
              onClick={() => void handleContactSeller()}
              className="inline-flex h-8 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto">
              Liên Hệ Người Bán
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
