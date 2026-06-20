"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useRealtimeSocket } from "@/lib/useRealtimeSocket";
import { useChatStore } from "@/store/chat";
import { toFrontendImageUrl } from "@/lib/image";

type Props = {
  variant?: "light" | "dark";
  className?: string;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));

const getNotificationLabel = (type: string) => {
  if (type === "order_cancelled") return "Đã hủy đơn";
  if (type.startsWith("chat")) return "Tin nhắn";
  if (type.startsWith("review")) return "Đánh giá";
  if (type.startsWith("order")) return "Đơn hàng";
  return "Thông báo";
};

export default function NotificationBell({ variant = "light", className }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const role = useAuthStore((s) => s.user?.role);
  const { openChat } = useChatStore();

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.getAll({ page: 0, size: 6 }),
        notificationsApi.unreadCount(),
      ]);
      const nextNotifications = listRes.data.result?.content ?? [];
      if (initializedRef.current) {
        const freshItems = nextNotifications.filter((item) => !seenIdsRef.current.has(item.id));
        if (freshItems.length > 0) {
          const latest = freshItems[0];
          toast.info(latest.title, { description: latest.body });
        }
      } else {
        initializedRef.current = true;
      }
      nextNotifications.forEach((item) => seenIdsRef.current.add(item.id));
      setNotifications(nextNotifications);
      setUnread(countRes.data.result?.count ?? 0);
    } catch {
      setNotifications([]);
      setUnread(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated || !token) return;
    setMounted(true);
    initializedRef.current = false;
    seenIdsRef.current.clear();
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => clearInterval(timer);
  }, [hydrated, token]);

  useRealtimeSocket(Boolean(hydrated && token), (event) => {
    if (event.channel === "notification") {
      if (event.type === "created" && event.notification) {
        toast.info(event.notification.title, {
          description: event.notification.body,
        });
      }
      void load();
    }
  });

  useEffect(() => {
    if (!hydrated || !token) return;
    const reload = () => void load();
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reload);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reload);
    };
  }, [hydrated, token]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      await load();
    } catch {
      // ignore
    }
  };

  const markOne = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleClick = (n: Notification) => {
    void markOne(n.id);
    const orderCode = n.orderCode ?? null;

    if (role === "admin") {
      if (n.type.startsWith("chat")) {
        router.push("/admin/chat");
        return;
      }
      if (n.type.startsWith("review")) {
        router.push("/admin/reviews");
        return;
      }
      if (orderCode) {
        router.push(`/admin/orders?keyword=${encodeURIComponent(orderCode)}`);
        return;
      }
      router.push("/admin");
      return;
    }

    if (n.type.startsWith("chat")) {
      if (orderCode) {
        openChat(orderCode);
        return;
      }
      router.push("/orders");
      return;
    }

    if (orderCode) {
      router.push(`/orders/${orderCode}`);
      return;
    }

    if (n.type.startsWith("review")) {
      router.push("/orders");
      return;
    }

    router.push("/");
  };

  const buttonClass = useMemo(() => {
    if (variant === "dark") {
      return "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700";
    }
    return "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-black hover:bg-gray-50";
  }, [variant]);

  const panelClass = variant === "dark"
    ? "absolute right-0 top-full z-[60] mt-2 w-[min(13rem,calc(100vw-0.35rem))] overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 text-gray-100 shadow-2xl sm:w-[22rem]"
    : "absolute right-0 top-full z-[60] mt-2 w-[min(13rem,calc(100vw-0.35rem))] overflow-hidden rounded-2xl border border-black/10 bg-white text-gray-900 shadow-2xl sm:w-[22rem]";

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} className={buttonClass} aria-label="Thông báo">
        <Bell className="h-4.5 w-4.5" />
        {mounted && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={panelClass}>
          <div className={cn("flex items-center justify-between border-b px-1.5 py-1.5 sm:px-4 sm:py-3", variant === "dark" ? "border-gray-700" : "border-black/5")}>
            <div>
              <p className="text-[10px] font-semibold sm:text-sm">Thông báo</p>
              <p className={cn("text-[8px] leading-tight sm:text-xs", variant === "dark" ? "text-gray-400" : "text-gray-500")}>
                {unread > 0 ? `${unread} chưa đọc` : "Không có thông báo mới"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void markAll()}
              className={cn(
                "inline-flex items-center gap-1 text-[8px] font-semibold sm:text-xs",
                variant === "dark" ? "text-orange-300 hover:text-orange-200" : "text-orange-600 hover:text-orange-700",
              )}
            >
              <CheckCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Đọc hết
            </button>
          </div>

          <div className={cn("max-h-[min(14rem,calc(100vh-6rem))] overflow-y-auto", variant === "dark" ? "bg-gray-900" : "bg-white")}>
            {loading ? (
              <div className="flex items-center justify-center py-4 sm:py-10">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className={cn("px-2 py-4 text-center text-[10px] sm:px-4 sm:py-10 sm:text-sm", variant === "dark" ? "text-gray-400" : "text-gray-500")}>
                Chưa có thông báo
              </div>
            ) : (
              <div className={cn("divide-y", variant === "dark" ? "divide-gray-700" : "divide-black/5")}>
                {notifications.map((n) => {
                  const imgUrl = n.imageUrl ? toFrontendImageUrl(n.imageUrl) : null;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "block w-full px-1.5 py-1.5 text-left transition sm:px-4 sm:py-3",
                        n.isRead
                          ? variant === "dark"
                            ? "bg-gray-900 hover:bg-gray-800"
                            : "bg-white hover:bg-gray-50"
                          : variant === "dark"
                            ? "bg-gray-800/60 hover:bg-gray-800"
                            : "bg-orange-50/60 hover:bg-orange-50",
                      )}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {imgUrl && (
                          <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg border border-black/5 bg-gray-100 sm:h-11 sm:w-11">
                            <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="line-clamp-1 text-[10px] font-semibold sm:text-sm">{n.title}</p>
                            {!n.isRead && <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-500 sm:h-2 sm:w-2" />}
                          </div>
                          <p className={cn("mt-0.5 line-clamp-2 text-[8px] leading-snug sm:text-xs", variant === "dark" ? "text-gray-300" : "text-gray-600")}>
                            {n.body}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-1.5 py-0.5 text-[7px] font-semibold",
                                n.type === "order_cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : variant === "dark"
                                    ? "bg-gray-800 text-gray-300"
                                    : "bg-gray-100 text-gray-500",
                              )}
                            >
                              {getNotificationLabel(n.type)}
                            </span>
                            <span className={cn("text-[7px] sm:text-[10px]", variant === "dark" ? "text-gray-500" : "text-gray-400")}>
                              {formatTime(n.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={cn("border-t", variant === "dark" ? "border-gray-700" : "border-black/5")}>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className={cn(
                "flex w-full items-center justify-center py-2 text-[9px] font-semibold transition sm:py-2.5 sm:text-xs",
                variant === "dark"
                  ? "text-blue-400 hover:bg-gray-800 hover:text-blue-300"
                  : "text-blue-600 hover:bg-gray-50 hover:text-blue-700",
              )}
            >
              Xem tất cả thông báo
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
