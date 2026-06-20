"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import type { Notification } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { toFrontendImageUrl } from "@/lib/image";
import { cn } from "@/lib/utils";

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

const getNotificationLabel = (type: string) => {
  if (type === "order_cancelled") return "Đã hủy đơn";
  if (type.startsWith("chat")) return "Tin nhắn";
  if (type.startsWith("review")) return "Đánh giá";
  if (type.startsWith("order")) return "Đơn hàng";
  return "Thông báo";
};

const getLabelStyle = (type: string) =>
  type === "order_cancelled"
    ? "bg-red-100 text-red-700"
    : "bg-gray-100 text-gray-500";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [unread, setUnread] = useState(0);
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { openChat } = useChatStore();
  const initialLoad = useRef(true);

  const load = async (p: number, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.getAll({ page: p, size: 20 }),
        p === 0 ? notificationsApi.unreadCount() : Promise.resolve(null),
      ]);
      const data = listRes.data.result;
      const items = data?.content ?? [];
      setNotifications((prev) => (append ? [...prev, ...items] : items));
      setHasMore(data != null && p + 1 < data.totalPages);
      setPage(p);
      if (countRes) setUnread(countRes.data.result?.count ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load(0);
  }, [token]);

  const markOne = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // ignore
    }
  };

  const handleClick = (n: Notification) => {
    void markOne(n.id);
    const orderCode = n.orderCode ?? null;
    const role = user?.role;

    if (role === "admin") {
      if (n.type.startsWith("chat")) { router.push("/admin/chat"); return; }
      if (n.type.startsWith("review")) { router.push("/admin/reviews"); return; }
      if (orderCode) { router.push(`/admin/orders?keyword=${encodeURIComponent(orderCode)}`); return; }
      router.push("/admin");
      return;
    }

    if (n.type.startsWith("chat")) {
      if (orderCode) { openChat(orderCode); return; }
      router.push("/orders");
      return;
    }
    if (orderCode) { router.push(`/orders/${orderCode}`); return; }
    if (n.type.startsWith("review")) { router.push("/orders"); return; }
    router.push("/");
  };

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-400">
        Vui lòng đăng nhập để xem thông báo
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700 sm:h-6 sm:w-6" />
          <h1 className="text-base font-bold text-gray-900 sm:text-xl">Thông báo</h1>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void markAll()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Đọc tất cả
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-400">
          <Bell className="h-10 w-10 text-gray-200" />
          <p className="text-sm">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="divide-y divide-black/5 rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
          {notifications.map((n) => {
            const imgUrl = n.imageUrl ? toFrontendImageUrl(n.imageUrl) : null;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClick(n)}
                className={cn(
                  "block w-full px-4 py-3 text-left transition hover:bg-gray-50 sm:px-5 sm:py-4",
                  !n.isRead && "bg-orange-50/60 hover:bg-orange-50",
                )}
              >
                <div className="flex items-start gap-3">
                  {imgUrl ? (
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-black/5 bg-gray-100 sm:h-14 sm:w-14">
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-50 sm:h-14 sm:w-14">
                      <Bell className="h-5 w-5 text-orange-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("line-clamp-1 text-sm font-semibold", !n.isRead ? "text-gray-900" : "text-gray-700")}>
                        {n.title}
                      </p>
                      {!n.isRead && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-orange-500" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-gray-500">{n.body}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", getLabelStyle(n.type))}>
                        {getNotificationLabel(n.type)}
                      </span>
                      <span className="text-[10px] text-gray-400">{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void load(page + 1, true)}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Xem thêm
          </button>
        </div>
      )}
    </div>
  );
}
