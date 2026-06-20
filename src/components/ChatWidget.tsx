"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send, Loader2, ChevronDown, Paperclip, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { chatApi, type ChatMessage } from "@/lib/api/chat";
import { decodeChatMessage, encodeChatMessage, type ChatProductContext } from "@/lib/chat-message";
import { formatVND } from "@/lib/format";
import { toFrontendImageUrl } from "@/lib/image";
import { publicApi } from "@/lib/api/public";
import { useChatStore } from "@/store/chat";
import { useAuthStore } from "@/store/auth";
import { getError } from "@/lib/api";
import { useRealtimeSocket } from "@/lib/useRealtimeSocket";
import ProductPreviewCard from "@/components/chat/ProductPreviewCard";

function MessengerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className}>
      <path d="M14 2C7.373 2 2 7.03 2 13.2c0 3.388 1.564 6.418 4.04 8.48V26l3.817-2.117C11.2 24.27 12.573 24.5 14 24.5c6.627 0 12-5.03 12-11.3C26 7.03 20.627 2 14 2z" fill="currentColor" />
      <path d="M7 16.5l5-5.5 3.5 3.5 5-3.5-5 5.5-3.5-3.5-5 3.5z" fill="white" />
    </svg>
  );
}

function ChatProductCard({ product }: { product: ChatProductContext }) {
  const imageUrl = toFrontendImageUrl(product.imageUrl);
  const originalPrice = product.discountPrice && product.discountPrice > product.price ? product.discountPrice : null;
  const params = new URLSearchParams();
  if (product.variantId) params.set("variantId", String(product.variantId));
  if (product.colorId) params.set("colorId", String(product.colorId));
  const productHref = `/products/${product.slug}${params.toString() ? `?${params.toString()}` : ""}`;
  return (
    <Link
      href={productHref}
      className="relative w-full max-w-[230px] overflow-hidden rounded-lg border border-gray-200 bg-white text-left text-gray-900 shadow-sm transition hover:border-gray-300 sm:max-w-[260px]"
    >
      <button
        type="button"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Thao tác sản phẩm"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-2 p-2 pr-8">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100 sm:h-[60px] sm:w-[60px]">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">Sản phẩm</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12px] font-medium leading-4 text-gray-900 sm:text-[13px]">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-blue-600 sm:text-[13px]">{formatVND(product.price)}</span>
            {originalPrice && (
              <span className="text-[10px] text-gray-400 line-through sm:text-[11px]">{formatVND(originalPrice)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const inferMediaTypeFromUrl = (url: string): "image" | "video" => {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(mp4|webm|ogg|mov|m4v)$/.test(clean)) return "video";
  return "image";
};

const isPlaceholderText = (text: string) => {
  const normalized = text.trim().toLowerCase();
  return normalized === "zz";
};

export function ChatWidget() {
  const { isOpen, orderCode, pendingProduct, openChat, clearPendingProduct, closeChat } = useChatStore();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveCode = orderCode ?? (user ? `SUPPORT-${user.id}` : null);
  const isSupport = effectiveCode?.startsWith("SUPPORT-");
  const lastConversationKey = user ? `chat:last-conversation:${user.id}` : null;

  useEffect(() => {
    if (lastConversationKey && orderCode) {
      localStorage.setItem(lastConversationKey, orderCode);
    }
  }, [lastConversationKey, orderCode]);

  const load = async (silent = false) => {
    if (!effectiveCode) return;
    if (!silent) setLoading(true);
    try {
      const r = await chatApi.getMessages(effectiveCode);
      setMessages(r.data.result ?? []);
    } catch (err) { if (!silent) toast.error(getError(err)); }
    if (!silent) setLoading(false);
  };

  const loadUnread = async () => {
    if (!user) return;
    try {
      const res = await chatApi.unreadCount();
      setUnreadCount(Number(res.data.result?.count ?? 0));
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!isOpen || !effectiveCode) return;
    load();
    pollRef.current = setInterval(() => load(true), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, effectiveCode]);

  useRealtimeSocket(Boolean(user), (event) => {
    if (event.channel === "chat" && event.orderCode && event.orderCode === effectiveCode) {
      void load(true);
      void loadUnread();
    }
  });

  useEffect(() => {
    if (!user) return;
    void loadUnread();
    const timer = setInterval(() => void loadUnread(), 15000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingProduct]);

  const handleBubbleClick = () => {
    if (!user) return;
    const lastConversation = lastConversationKey
      ? localStorage.getItem(lastConversationKey)
      : null;
    openChat(orderCode ?? lastConversation ?? `SUPPORT-${user.id}`);
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || !effectiveCode || sending || uploadingImages) return;
    setSending(true);
    try {
      await chatApi.sendMessage(effectiveCode, encodeChatMessage(input, pendingProduct, pendingImages));
      setInput("");
      setPendingImages([]);
      await load(true);
    } catch (err) { toast.error(getError(err)); }
    setSending(false);
  };

  const handlePickFiles = async (files: FileList | null) => {
    if (!files?.length || uploadingImages) return;
    const availableSlots = Math.max(0, 5 - pendingImages.length);
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    if (selectedFiles.length === 0) {
      toast.error("Chỉ được đính kèm tối đa 5 ảnh/video");
      return;
    }

    setUploadingImages(true);
    try {
      const uploaded = await Promise.all(selectedFiles.map((file) => publicApi.upload(file)));
      setPendingImages((prev) => [...prev, ...uploaded]);
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
  };

  if (!user) return null;

  // Bubble khi đóng
  if (!isOpen) {
    return (
      <button
        onClick={handleBubbleClick}
        className="fixed bottom-6 right-6 z-[9998] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-white"
        aria-label="Chat hỗ trợ"
      >
        <MessengerIcon className="w-7 h-7" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  // Widget chat khi mở
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col w-80 h-[480px] rounded-2xl shadow-2xl border border-gray-200 overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white flex-shrink-0">
        {(() => {
          const adminAvatarUrl = messages.find((m) => m.senderRole === "ADMIN")?.senderAvatarUrl;
          return (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {adminAvatarUrl ? (
                <img src={toFrontendImageUrl(adminAvatarUrl)} alt="Admin" className="h-full w-full object-cover" />
              ) : (
                <MessengerIcon className="w-5 h-5" />
              )}
            </div>
          );
        })()}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-none">Sneak Shop</p>
          <p className="text-[10px] text-blue-100 mt-0.5 truncate">
            {isSupport ? "Hỗ trợ trực tuyến" : effectiveCode}
          </p>
        </div>
        <button onClick={closeChat} className="w-7 h-7 rounded-full hover:bg-white/20 flex items-center justify-center transition">
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {pendingProduct && (
        <ProductPreviewCard product={pendingProduct} onDismiss={clearPendingProduct} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
        {loading ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-end gap-1.5">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-9 w-44 rounded-2xl rounded-bl-sm bg-gray-200 animate-pulse" />
            </div>
            <div className="flex items-end gap-1.5 flex-row-reverse">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-8 w-28 rounded-2xl rounded-br-sm bg-blue-100 animate-pulse" />
            </div>
            <div className="flex items-end gap-1.5">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-8 w-48 rounded-2xl rounded-bl-sm bg-gray-200 animate-pulse" />
                <div className="h-8 w-36 rounded-2xl bg-gray-200 animate-pulse" />
              </div>
            </div>
            <div className="flex items-end gap-1.5 flex-row-reverse">
              <div className="h-6 w-6 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-9 w-32 rounded-2xl rounded-br-sm bg-blue-100 animate-pulse" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-4 text-center">
            <MessengerIcon className="w-10 h-10 text-blue-200" />
            <div>
              <p className="text-sm font-medium text-gray-600">Chào mừng đến Sneak Shop!</p>
              <p className="text-xs mt-1">Nhắn tin để được hỗ trợ nhanh nhất.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === "USER";
            const parsed = decodeChatMessage(msg.content);
            const visibleText = parsed.text.trim();
            const hideText = visibleText.length > 0 && isPlaceholderText(visibleText);
            const userInitials = user?.fullName
              ? user.fullName.split(" ").slice(-2).map((w: string) => w[0]).join("").toUpperCase()
              : "U";
            return (
              <div key={msg.id} className={`flex items-end gap-1.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white mb-0.5 overflow-hidden">
                    {msg.senderAvatarUrl ? (
                      <img src={toFrontendImageUrl(msg.senderAvatarUrl)} alt={msg.senderName} className="h-full w-full object-cover" />
                    ) : (
                      <MessengerIcon className="w-4 h-4" />
                    )}
                  </div>
                )}
                {isMe && (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 mb-0.5 overflow-hidden bg-gray-300">
                    {(msg.senderAvatarUrl || user?.avatarUrl) ? (
                      <img
                        src={toFrontendImageUrl(msg.senderAvatarUrl ?? user?.avatarUrl ?? "")}
                        alt={user?.fullName ?? ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-blue-500 text-[9px] font-bold text-white">
                        {userInitials}
                      </div>
                    )}
                  </div>
                )}
                <div className={`max-w-[75%] text-sm leading-snug ${
                  isMe
                    ? "text-white"
                    : "text-gray-800"
                }`}>
                  {parsed.product && (
                    <div className="mb-2">
                      <ChatProductCard product={parsed.product} />
                    </div>
                  )}
                  {parsed.images.length > 0 && (
                    <div className={`${parsed.product ? "mt-2" : ""} grid grid-cols-2 gap-2`}>
                      {parsed.images.map((image, index) => {
                        const imageUrl = toFrontendImageUrl(image.url) || image.url;
                        const mediaType = inferMediaTypeFromUrl(imageUrl);
                        return (
                          <a
                            key={`${msg.id}-image-${index}`}
                            href={imageUrl}
                            target="_blank"
                            rel="noreferrer"
                          className="block overflow-hidden rounded-lg border border-gray-200 bg-white"
                        >
                          {mediaType === "video" ? (
                              <video src={imageUrl} controls className="h-20 w-full object-cover sm:h-28" />
                            ) : (
                              <img src={imageUrl} alt={`Ảnh đính kèm ${index + 1}`} className="h-20 w-full object-cover sm:h-28" />
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {!hideText && visibleText && (
                    <div
                      className={`mt-2 rounded-2xl px-3 py-2 ${
                        isMe
                          ? "rounded-br-sm bg-blue-600 text-white"
                          : "rounded-bl-sm bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{visibleText}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-white px-3 py-2.5 flex-shrink-0">
        {pendingImages.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((url, index) => {
              const imageUrl = toFrontendImageUrl(url) || url;
              const mediaType = inferMediaTypeFromUrl(imageUrl);
              return (
                <div key={`${url}-${index}`} className="group relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 sm:h-14 sm:w-14">
                  {mediaType === "video" ? (
                    <video src={imageUrl} className="h-full w-full object-cover" />
                  ) : (
                    <img src={imageUrl} alt={`Đính kèm ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPendingImages((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow transition hover:text-gray-900"
                    aria-label="Xóa ảnh đính kèm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => void handlePickFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            disabled={uploadingImages || pendingImages.length >= 5}
            aria-label="Đính kèm ảnh hoặc video"
          >
            {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Nhập tin nhắn..."
            className="flex-1 text-[16px] leading-tight bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            onClick={() => void handleSend()}
            disabled={(!input.trim() && pendingImages.length === 0) || sending || uploadingImages}
            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 flex items-center justify-center text-white transition flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
