"use client";

import { useEffect, useState } from "react";
import { Save, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { shippingFeesApi } from "@/lib/api/shipping-fees";
import { formatVND } from "@/lib/format";
import type { ShippingFeeConfig } from "@/lib/types";
import AdminPagination from "@/components/admin/AdminPagination";

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

const formatMonth = (value: string) => {
  const [year, month] = value.split("-");
  return `Tháng ${Number(month)}/${year}`;
};

export default function AdminShippingFeesPage() {
  const [items, setItems] = useState<ShippingFeeConfig[]>([]);
  const [month, setMonth] = useState(currentMonth());
  const [fee, setFee] = useState("30000");
  const [currentFee, setCurrentFee] = useState(30000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const [configs, current] = await Promise.all([
        shippingFeesApi.adminGetAll({ page: p, size: 12 }),
        shippingFeesApi.getCurrent(),
      ]);
      setItems(configs.data.result.content);
      setTotalPages(configs.data.result.totalPages);
      setCurrentFee(Number(current.data.result.fee));
    } catch {
      toast.error("Không tải được cấu hình phí vận chuyển");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(page); }, [page]);

  const edit = (item: ShippingFeeConfig) => {
    setMonth(item.month);
    setFee(String(item.fee));
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Đang sửa ${formatMonth(item.month)} — chỉnh phí rồi bấm Lưu cấu hình`);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(fee);
    if (!month) {
      toast.error("Vui lòng chọn tháng áp dụng");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Phí vận chuyển không hợp lệ");
      return;
    }
    setSaving(true);
    try {
      await shippingFeesApi.adminSave({ month, fee: amount });
      toast.success("Đã lưu phí vận chuyển");
      await load(page);
    } catch {
      toast.error("Không thể lưu phí vận chuyển");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Cấu hình phí vận chuyển</h1>
        <p className="mt-1 text-sm text-gray-500">
          Phí được áp dụng từ tháng đã chọn cho đến khi có cấu hình mới.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-5">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-4">
            <Truck className="h-6 w-6 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">Phí đang áp dụng</p>
              <p className="text-xl font-bold">{formatVND(currentFee)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Tháng áp dụng</span>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={month.split("-")[1] ?? ""}
                onValueChange={(v) => setMonth((m) => `${m.split("-")[0]}-${v}`)}
              >
                <SelectTrigger><SelectValue placeholder="Tháng" /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1).padStart(2, "0")}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={month.split("-")[0] ?? ""}
                onValueChange={(v) => setMonth((m) => `${v}-${m.split("-")[1]}`)}
              >
                <SelectTrigger><SelectValue placeholder="Năm" /></SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Phí vận chuyển</span>
            <Input
              type="number"
              min="0"
              step="1000"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              required
            />
            <span className="text-xs text-gray-500">Mặc định: 30.000đ. Nhập 0 để miễn phí.</span>
          </label>

          <Button type="submit" disabled={saving} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </form>

        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Lịch sử phí theo tháng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-5 py-3">Tháng áp dụng</th>
                  <th className="px-5 py-3">Mức phí</th>
                  <th className="px-5 py-3">Cập nhật</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-t">
                      <td colSpan={4} className="px-5 py-4"><Skeleton className="h-5" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-400">Chưa có cấu hình</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-5 py-4 font-medium">{formatMonth(item.month)}</td>
                    <td className="px-5 py-4 font-semibold">{formatVND(item.fee)}</td>
                    <td className="px-5 py-4 text-gray-500">
                      {new Date(item.updatedAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => edit(item)}>
                        Sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
