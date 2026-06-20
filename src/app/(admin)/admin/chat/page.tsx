"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, Send, Paperclip, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { chatApi, type ChatMessage, type Conversation } from "@/lib/api/chat";
import { decodeChatMessage, encodeChatMessage, type ChatProductContext } from "@/lib/chat-message";
import { formatDate, formatVND } from "@/lib/format";
import { publicApi } from "@/lib/api/public";
import { toFrontendImageUrl } from "@/lib/image";
import { useRealtimeSocket } from "@/lib/useRealtimeSocket";

function ChatProductCard({ product }: { product: ChatProductContext }) {
  const imageUrl = toFrontendImageUrl(product.imageUrl);
  const originalPrice = product.discountPrice && product.discountPrice > product.price ? product.discountPrice : null;
  return (
    <Link
      href={`/products/${product.slug}`}
      className="relative w-full max-w-[260px] overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm transition hover:border-gray-300"
    >
      <button
        type="button"
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        aria-label="Thao tác sản phẩm"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-2 p-2 pr-8">
        <div className="h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">Sản phẩm</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-medium leading-4 text-gray-900">{product.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-blue-600">{formatVND(product.price)}</span>
            {originalPrice && (
              <span className="text-[11px] text-gray-400 line-through">{formatVND(originalPrice)}</span>
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

const isPlaceholderText = (text: string) => text.trim().toLowerCase() === "zz";

function summarizeMessage(content: string) {
  const parsed = decodeChatMessage(content);
  if (parsed.text.trim()) return parsed.text;
  if (parsed.product) return "Đính kèm sản phẩm";
  if (parsed.images.length > 0) return `Đã gửi ${parsed.images.length} ảnh/video`;
  return "";
}

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = async () => {
    try {
      const r = await chatApi.adminGetConversations();
      setConversations(r.data.result ?? []);
    } catch {}
    setLoadingConvs(false);
  };

  const loadMessages = async (orderCode: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const r = await chatApi.adminGetMessages(orderCode);
      setMessages(r.data.result ?? []);
      // Mark read → refresh unread counts
      if (!silent) loadConversations();
    } catch {}
    if (!silent) setLoadingMsgs(false);
  };

  useRealtimeSocket(true, (event) => {
    if (event.channel !== "chat" || !event.orderCode) return;
    void loadConversations();
    if (selected === event.orderCode) {
      void loadMessages(event.orderCode, true);
    }
  });

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected);
    pollRef.current = setInterval(() => {
      loadMessages(selected, true);
      loadConversations();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = (orderCode: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setMessages([]);
    setSelected(orderCode);
    setMobileView("chat");
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingImages.length === 0) || !selected || sending || uploadingImages) return;
    setSending(true);
    try {
      await chatApi.adminSendMessage(selected, encodeChatMessage(input.trim(), null, pendingImages));
      setInput("");
      setPendingImages([]);
      await loadMessages(selected, true);
      loadConversations();
    } catch { toast.error("Gửi thất bại"); }
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
    } catch {
      toast.error("Upload ảnh thất bại");
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col lg:h-[calc(100vh-64px)] lg:flex-row">
      {/* Left: Conversation list */}
      <div className={`${mobileView === "list" ? "flex" : "hidden"} w-full flex-col border-b bg-white lg:flex lg:w-80 lg:flex-shrink-0 lg:border-b-0 lg:border-r`}>
        <div className="px-4 py-4 border-b">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Chat hỗ trợ
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-3 space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2 py-10">
              <MessageSquare className="w-8 h-8 opacity-20" />
              Chưa có cuộc trò chuyện
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.orderCode}
                onClick={() => handleSelect(c.orderCode)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition border-b border-gray-50 ${
                  selected === c.orderCode ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-blue-100 flex-shrink-0 mt-0.5 overflow-hidden">
                  {c.avatarUrl ? (
                    <img src={toFrontendImageUrl(c.avatarUrl)} alt={c.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-blue-600 font-bold text-sm">
                      {c.displayName.trim().slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-800 truncate">{c.displayName}</span>
                    {c.unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 truncate">{c.orderCode}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {c.lastSenderRole === "ADMIN" ? "Bạn: " : ""}
                    {summarizeMessage(c.lastContent)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(c.lastTime)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Messages */}
      <div className={`${mobileView === "chat" ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-gray-50 lg:flex`}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b bg-white px-4 py-3.5 sm:px-5">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 lg:hidden"
                aria-label="Quay lại danh sách"
              >
                <X className="h-4 w-4" />
              </button>
              {(() => {
                const conv = conversations.find((c) => c.orderCode === selected);
                return (
                  <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex-shrink-0">
                    {conv?.avatarUrl ? (
                      <img src={toFrontendImageUrl(conv.avatarUrl)} alt={conv.displayName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-blue-600 font-bold text-xs">
                        {conv?.displayName.trim().slice(0, 2).toUpperCase() || "CS"}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div>
                <p className="font-semibold text-sm">{conversations.find((c) => c.orderCode === selected)?.displayName || selected}</p>
                <p className="text-xs text-gray-400">{selected}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : messages.map((msg) => {
                const isAdmin = msg.senderRole === "ADMIN";
                const parsed = decodeChatMessage(msg.content);
                const visibleText = parsed.text.trim();
                const hideText = visibleText.length > 0 && isPlaceholderText(visibleText);
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-6 h-6 rounded-full flex-shrink-0 mb-0.5 overflow-hidden bg-blue-600">
                      {msg.senderAvatarUrl ? (
                        <img src={toFrontendImageUrl(msg.senderAvatarUrl)} alt={msg.senderName} className="h-full w-full object-cover" />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center text-[9px] font-bold text-white ${isAdmin ? "bg-blue-600" : "bg-gray-400"}`}>
                          {msg.senderName?.[0]?.toUpperCase() ?? (isAdmin ? "S" : "U")}
                        </div>
                      )}
                    </div>
                    <div className={`max-w-[82%] text-sm leading-snug sm:max-w-[65%] ${isAdmin ? "text-white" : "text-gray-800"}`}>
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
                                  <video src={imageUrl} controls className="h-28 w-full object-cover" />
                                ) : (
                                  <img src={imageUrl} alt={`Ảnh đính kèm ${index + 1}`} className="h-28 w-full object-cover" />
                                )}
                              </a>
                            );
                          })}
                        </div>
                      )}
                      {!hideText && visibleText && (
                        <div
                          className={`mt-2 rounded-2xl px-3 py-2 ${
                            isAdmin
                              ? "rounded-br-sm bg-blue-600 text-white"
                              : "rounded-bl-sm bg-white border border-gray-200 shadow-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{visibleText}</p>
                        </div>
                      )}
                      <p className={`text-[10px] mt-1 ${isAdmin ? "text-blue-200" : "text-gray-400"}`}>{formatDate(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex flex-col gap-3 border-t bg-white px-4 py-3">
              {pendingImages.length > 0 && (
                <div className="flex w-full flex-wrap gap-2">
                  {pendingImages.map((url, index) => {
                    const imageUrl = toFrontendImageUrl(url) || url;
                    const mediaType = inferMediaTypeFromUrl(imageUrl);
                    return (
                      <div key={`${url}-${index}`} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
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
              <div className="flex w-full items-center gap-2">
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
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                  disabled={uploadingImages || pendingImages.length >= 5}
                  aria-label="Đính kèm ảnh hoặc video"
                >
                  {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder="Nhập phản hồi..."
                  className="flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={() => void handleSend()} disabled={(!input.trim() && pendingImages.length === 0) || sending || uploadingImages}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
