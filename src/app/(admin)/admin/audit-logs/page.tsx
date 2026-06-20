"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import AdminPagination from "@/components/admin/AdminPagination";
import { formatDate, formatVND } from "@/lib/format";

interface FinancialLog {
  id: number;
  email: string;
  usersId: number | null;
  addressesId: number | null;
  addressText: string | null;
  ordersId: number | null;
  orderCode: string | null;
  transactionsId: number | null;
  transactionCode: string | null;
  productsId: number | null;
  productsShopId: number | null;
  amount: number;
  bankName: string;
  note: string | null;
  createdAt: string;
}

const HEADERS = [
  "Người mua", "orderCode", "Mã GD", "Hình thức",
  "Số tiền", "Địa chỉ giao hàng", "Ghi chú", "Thời gian",
];

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<FinancialLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [email, setEmail] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const totalAmount = logs.reduce((sum, log) => sum + (log.amount || 0), 0);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/audit-logs", {
        params: {
          email: email || undefined,
          orderCode: orderCode || undefined,
          transactionCode: transactionCode || undefined,
          page,
          size: 20,
        },
      });
      setLogs(r.data.result.content);
      setTotalPages(r.data.result.totalPages);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Đối soát thanh toán</h1>
        <p className="text-sm text-gray-500">
          Ghi nhận các đơn hàng và giao dịch phát sinh để admin dễ theo dõi đối soát.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-400">Bản ghi</div>
          <div className="mt-1 text-xl font-bold">{logs.length}</div>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-gray-400">Tổng tiền trang này</div>
          <div className="mt-1 text-xl font-bold text-emerald-700">{formatVND(totalAmount)}</div>
        </div>
        <div className="rounded-2xl border bg-white px-4 py-3 sm:col-span-2 xl:col-span-2">
          <div className="text-xs uppercase tracking-wide text-gray-400">Lọc nhanh</div>
          <div className="mt-2 grid gap-3 lg:grid-cols-4">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Lọc theo email người mua"
              className="bg-white"
            />
            <Input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="Lọc theo mã đơn"
              className="bg-white"
            />
            <Input
              value={transactionCode}
              onChange={(e) => setTransactionCode(e.target.value)}
              placeholder="Lọc theo mã giao dịch"
              className="bg-white"
            />
            <Button variant="outline" onClick={() => { setPage(0); load(); }}>Lọc</Button>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden bg-white rounded-xl border overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={HEADERS.length} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={HEADERS.length} className="text-center py-12 text-gray-400">Chưa có giao dịch</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <div>{log.email}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{log.orderCode || `#${log.ordersId ?? "—"}`}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{log.transactionCode || `#${log.transactionsId ?? "—"}`}</td>
                  <td className="px-4 py-3 text-gray-600">{log.bankName}</td>
                  <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">{formatVND(log.amount)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-64 whitespace-normal">{log.addressText || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-40 truncate text-xs">{log.note || "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
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
        ) : logs.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">Chưa có giao dịch</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold">{log.email}</p>
                <p className="shrink-0 text-sm font-bold text-emerald-700">{formatVND(log.amount)}</p>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <div><span className="text-gray-400">Đơn:</span> {log.orderCode || `#${log.ordersId ?? "—"}`}</div>
                <div><span className="text-gray-400">Mã GD:</span> {log.transactionCode || `#${log.transactionsId ?? "—"}`}</div>
                <div><span className="text-gray-400">Hình thức:</span> {log.bankName}</div>
                <div><span className="text-gray-400">Thời gian:</span> {formatDate(log.createdAt)}</div>
              </div>
              {log.addressText && <p className="mt-1 text-xs text-gray-500">{log.addressText}</p>}
              {log.note && <p className="mt-1 text-xs text-gray-400">{log.note}</p>}
            </div>
          ))
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
