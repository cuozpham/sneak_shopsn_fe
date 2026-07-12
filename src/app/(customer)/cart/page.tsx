"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cartApi } from "@/lib/api/cart";
import { shippingFeesApi } from "@/lib/api/shipping-fees";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { formatVND } from "@/lib/format";
import type { CartItem } from "@/lib/types";

export default function CartPage() {
  const { user, hydrated } = useAuthStore();
  const { items, setItems, total, updateQuantity, removeItem } = useCartStore();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectionReady, setSelectionReady] = useState(false);
  const [baseShippingFee, setBaseShippingFee] = useState(30000);
  const router = useRouter();

  useEffect(() => {
    shippingFeesApi.getCurrent()
      .then((response) => setBaseShippingFee(Number(response.data.result.fee)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { setLoading(false); return; }
    cartApi.getCart()
      .then((r) => setItems(r.data.result))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hydrated, user, setItems]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const existing = new Set(items.map((item) => item.id));
      const next = new Set(Array.from(prev).filter((id) => existing.has(id)));
      if (!selectionReady && items.length > 0) {
        items.forEach((item) => next.add(item.id));
        setSelectionReady(true);
      }
      return next;
    });
  }, [items, selectionReady]);

  const handleUpdateQty = async (item: CartItem, qty: number) => {
    if (qty < 1) return;
    setUpdating(item.id);
    try {
      if (user) {
        await cartApi.updateQuantity(item.id, qty);
        const r = await cartApi.getCart();
        setItems(r.data.result);
      } else {
        updateQuantity(item.id, qty);
      }
    } catch {
      toast.error("Không thể cập nhật số lượng");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    setUpdating(itemId);
    try {
      if (user) {
        await cartApi.removeItem(itemId);
        setItems(items.filter((i) => i.id !== itemId));
      } else {
        removeItem(itemId);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
      toast.success("Đã xóa sản phẩm");
    } catch {
      toast.error("Không thể xóa sản phẩm");
    } finally {
      setUpdating(null);
    }
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));
  const selectedSubtotal = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = baseShippingFee;
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((item) => item.id));
    });
  };

  const toggleItem = (itemId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.size} sản phẩm đã chọn?`)) return;
    const ids = Array.from(selectedIds);
    try {
      if (user) {
        await Promise.all(ids.map((id) => cartApi.removeItem(id).catch(() => {})));
        const r = await cartApi.getCart();
        setItems(r.data.result);
      } else {
        ids.forEach((id) => removeItem(id));
      }
      setSelectedIds(new Set());
      toast.success(`Đã xóa ${ids.length} sản phẩm`);
    } catch {
      toast.error("Không thể xóa các sản phẩm đã chọn");
    }
  };

  const handleCheckoutSelected = () => {
    if (selectedItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm");
      return;
    }
    sessionStorage.setItem(
      "sneakshop_selected_cart_items",
      JSON.stringify(
        selectedItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          colorId: item.colorId ?? undefined,
          quantity: item.quantity,
          productName: item.productName,
          variantName: item.variantName,
          colorName: item.colorName,
          productImage: item.productImage,
          unitPrice: item.price,
        }))
      )
    );
    router.push("/checkout");
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  // if (!user) {
  //   return (
  //     <div className="mx-auto max-w-3xl px-4 py-20 text-center">
  //       <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
  //       <h2 className="text-xl font-semibold mb-2">Vui lòng đăng nhập</h2>
  //       <p className="text-gray-500 mb-6">Đăng nhập để xem giỏ hàng của bạn</p>
  //       <Link href="/login"><Button>Đăng nhập</Button></Link>
  //     </div>
  //   );
  // }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Giỏ hàng trống</h2>
        <p className="text-gray-500 mb-6">Hãy thêm sản phẩm vào giỏ hàng</p>
        <Link href="/products"><Button>Mua sắm ngay</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-6 text-xl font-bold sm:mb-8 sm:text-2xl">Giỏ hàng ({items.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-4 lg:col-span-2">
          <div className="bg-white border rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              Chọn tất cả
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Đã chọn {selectedItems.length} sản phẩm
              </span>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
          {items.map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4 flex flex-col gap-4 sm:flex-row">
              <label className="pt-1 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                />
              </label>
              <div className="relative h-36 w-full flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white sm:h-20 sm:w-20">
                {item.productImage ? (
                  <Image src={item.productImage} alt={item.productName} fill className="object-contain p-2" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">👟</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">{item.productName}</p>
                {(item.variantName || item.colorName) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[item.variantName, item.colorName].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="font-bold text-sm mt-1">{formatVND(item.price)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateQty(item, item.quantity - 1)}
                    disabled={updating === item.id || item.quantity <= 1}
                    className="w-7 h-7 border rounded-md flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdateQty(item, item.quantity + 1)}
                    disabled={updating === item.id}
                    className="w-7 h-7 border rounded-md flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={updating === item.id}
                    className="ml-auto text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

          <div className="bg-white border rounded-xl p-5 h-fit lg:sticky lg:top-24">
          <h3 className="font-bold text-lg mb-4">Tóm tắt đơn hàng</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Tạm tính</span>
              <span>{formatVND(selectedSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phí vận chuyển</span>
              <span>{shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatVND(shippingFee)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>Tổng cộng</span>
              <span>{formatVND(selectedSubtotal + shippingFee)}</span>
            </div>
          </div>

          <Button
            className="w-full mt-4 h-11 font-bold"
            onClick={handleCheckoutSelected}
            disabled={selectedItems.length === 0}
          >
            Tiến hành thanh toán ({selectedCount})
          </Button>
          <Link href="/products">
            <Button variant="outline" className="w-full mt-2">Tiếp tục mua sắm</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
