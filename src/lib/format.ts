export function formatVND(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(safeAmount);
}

export function formatRating(value: unknown, fallback = "0.0"): string {
  const rating = typeof value === "number" ? value : Number(value);
  return Number.isFinite(rating) ? rating.toFixed(1) : fallback;
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

export function formatDateOnly(dateStr: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr));
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
  e_wallet: "Ví điện tử",
  momo: "MoMo",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Hoàn tiền",
};

export const ORDER_STATUS_COLOR: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  shipping: "default",
  delivered: "default",
  completed: "default",
  cancelled: "destructive",
};
