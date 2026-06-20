"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ordersApi } from "@/lib/api/orders";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  formatVND, formatDate,
  ORDER_STATUS_LABEL, ORDER_STATUS_COLOR,
  PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL,
} from "@/lib/format";
import type { Order } from "@/lib/types";

const ORDER_STATUSES = ["pending", "confirmed", "shipping", "delivered", "completed", "cancelled"];
const CANCEL_REASONS = [
  "Hết hàng",
  "Không chuẩn bị kịp hàng",
  "Sản phẩm bị lỗi/hỏng",
  "Sai giá sản phẩm",
];

const ALLOWED_NEXT: Record<string, string[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["shipping",  "cancelled"],
  shipping:  ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selected, setSelected] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [updating, setUpdating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGenRef = useRef(0);

  const load = async (kw: string) => {
    const gen = ++loadGenRef.current;
    setLoading(true);
    try {
      const r = await ordersApi.adminGetAll({ status: status || undefined, keyword: kw.trim() || undefined, page, size: 20 });
      if (gen !== loadGenRef.current) return;
      setOrders(r.data.result.content);
      setTotalPages(r.data.result.totalPages);
    } catch {}
    if (gen === loadGenRef.current) setLoading(false);
  };

  useEffect(() => { load(debouncedKeyword); }, [status, debouncedKeyword, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKeyword(params.get("keyword") ?? "");
  }, []);

  const handleUpdateStatus = async () => {
    if (!selected || !newStatus) return;
    if (newStatus === "cancelled" && !cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy đơn");
      return;
    }
    setUpdating(true);
    try {
      const r = await ordersApi.adminUpdateStatus(selected.orderCode, {
        status: newStatus,
        cancelReason: newStatus === "cancelled" ? cancelReason.trim() : undefined,
      });
      setOrders((prev) => prev.map((o) => o.id === r.data.result.id ? r.data.result : o));
      setSelected(null);
      setCancelReason("");
      toast.success("Cập nhật trạng thái thành công");
    } catch {
      toast.error("Không thể cập nhật");
    }
    setUpdating(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Quản lý đơn hàng</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              placeholder="Tìm mã đơn, tên, SĐT..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <Select value={status || "all"} onValueChange={(v) => { setStatus(!v || v === "all" ? "" : v); setPage(0); }}>
            <SelectTrigger className="w-full bg-white sm:w-44">
              <SelectValue>{(v: string) => (!v || v === "all") ? "Tất cả" : ORDER_STATUS_LABEL[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-white sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Mã đơn", "Khách hàng", "Sản phẩm", "Tổng tiền", "Phương thức", "Trạng thái", "Thời gian", ""].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Không có đơn hàng</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">#{order.orderCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.recipientName}</p>
                    <p className="text-gray-400 text-xs">{order.recipientPhone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{order.items.length} sản phẩm</td>
                  <td className="px-4 py-3 font-medium">{formatVND(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-gray-500">{PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ORDER_STATUS_COLOR[order.status]}>
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => { setSelected(order); setNewStatus(ALLOWED_NEXT[order.status]?.[0] ?? order.status); setCancelReason(""); }}>
                      Cập nhật
                    </Button>
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
        ) : orders.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">Không có đơn hàng</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">#{order.orderCode}</p>
                  <p className="text-xs text-gray-500">{order.recipientName}</p>
                  <p className="text-xs text-gray-400">{order.recipientPhone}</p>
                </div>
                <Badge variant={ORDER_STATUS_COLOR[order.status]} className="shrink-0">
                  {ORDER_STATUS_LABEL[order.status] || order.status}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">Sản phẩm:</span> {order.items.length}
                </div>
                <div>
                  <span className="text-gray-400">TT:</span> {PAYMENT_STATUS_LABEL[order.paymentStatus] || order.paymentStatus}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Phương thức:</span> {PAYMENT_METHOD_LABEL[order.paymentMethod] || order.paymentMethod}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Tổng tiền:</span> <span className="font-semibold">{formatVND(order.totalAmount)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">Thời gian:</span> {formatDate(order.createdAt)}
                </div>
              </div>

              <div className="mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSelected(order); setNewStatus(ALLOWED_NEXT[order.status]?.[0] ?? order.status); setCancelReason(""); }}
                >
                  Cập nhật
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Đơn hàng #{selected?.orderCode}</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 sm:space-y-5">
              {/* Thông tin người nhận */}
              <div className="grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-2 sm:gap-3 sm:p-4">
                <div><span className="text-gray-400">Người nhận:</span> <span className="font-medium">{selected.recipientName}</span></div>
                <div><span className="text-gray-400">SĐT:</span> <span className="font-medium">{selected.recipientPhone}</span></div>
                <div className="sm:col-span-2"><span className="text-gray-400">Địa chỉ:</span> {selected.shippingAddress}, {selected.shippingCity}</div>
                <div><span className="text-gray-400">Thanh toán:</span> {PAYMENT_METHOD_LABEL[selected.paymentMethod] || selected.paymentMethod}</div>
                <div><span className="text-gray-400">Trạng thái TT:</span> {PAYMENT_STATUS_LABEL[selected.paymentStatus] || selected.paymentStatus}</div>
                {selected.note && (
                  <div className="sm:col-span-2"><span className="text-gray-400">Ghi chú:</span> <span className="text-gray-700">{selected.note}</span></div>
                )}
              </div>

              {/* Danh sách sản phẩm */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Sản phẩm ({selected.items.length})</p>
                {selected.items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                    {item.productImage && (
                      <Image src={item.productImage} alt={item.productName} width={48} height={48} className="h-12 w-12 flex-shrink-0 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-gray-400">
                        {[item.variantName, item.colorName].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right text-sm flex-shrink-0">
                      <p className="font-medium">{formatVND(item.finalPrice)}</p>
                      <p className="text-gray-400 text-xs">x{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng tiền */}
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-gray-500"><span>Tạm tính</span><span>{formatVND(selected.subtotal)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Phí ship</span><span>{formatVND(selected.shippingFee)}</span></div>
                {selected.discountAmount > 0 && <div className="flex justify-between text-green-600"><span>Giảm giá</span><span>-{formatVND(selected.discountAmount)}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Tổng cộng</span><span>{formatVND(selected.totalAmount)}</span></div>
              </div>

              {/* Cập nhật trạng thái */}
              {(ALLOWED_NEXT[selected.status] ?? []).length > 0 && (
                <div className="space-y-3 border-t pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative w-full sm:flex-1">
                    <select
                      value={newStatus}
                      onChange={(e) => { setNewStatus(e.target.value); setCancelReason(""); }}
                      className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 pr-10 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                    >
                      {(ALLOWED_NEXT[selected.status] ?? []).map((s) => (
                        <option key={s} value={s}>
                          {ORDER_STATUS_LABEL[s] || s}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                  <Button className="w-full sm:w-auto" onClick={handleUpdateStatus} disabled={updating || (newStatus === "cancelled" && !cancelReason.trim())}>
                    {updating ? "Đang lưu..." : "Cập nhật"}
                  </Button>
                </div>
                  {newStatus === "cancelled" && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lý do hủy từ phía người bán</p>
                      <div className="flex flex-wrap gap-2">
                        {CANCEL_REASONS.map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setCancelReason(reason)}
                            className={`rounded-full border px-3 py-2 text-xs transition ${
                              cancelReason === reason
                                ? "border-black bg-black text-white"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                      </div>
                      <input
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Có thể nhập thêm chi tiết nếu cần..."
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
