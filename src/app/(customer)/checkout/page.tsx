"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { api } from "@/lib/api";
import { ordersApi } from "@/lib/api/orders";
import { addressesApi } from "@/lib/api/addresses";
import { shippingFeesApi } from "@/lib/api/shipping-fees";
import { formatVND } from "@/lib/format";
import { vnRegions } from "@/lib/vn-regions";
import type { Province, District, Ward } from "@/lib/vn-regions";
import type { Address } from "@/lib/types";

type BuyNowItem = {
  productId: number;
  variantId?: number;
  colorId?: number;
  quantity: number;
  productName: string;
  variantName: string | null;
  colorName: string | null;
  productImage: string | null;
  unitPrice: number;
};

export default function CheckoutPage() {
  const { user, hydrated, setAuth } = useAuthStore();
  const { items, clear } = useCartStore();
  const router = useRouter();
  const [buyNowItems, setBuyNowItems] = useState<BuyNowItem[]>([]);
  const [ready, setReady] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);
  const [provinceName, setProvinceName] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const [form, setForm] = useState({
    recipientName: "",
    recipientPhone: "",
    paymentMethod: "cod",
    note: "",
  });
  const [addressForm, setAddressForm] = useState({
    address: "",
    provinceCode: null as number | null,
    districtCode: null as number | null,
    ward: "",
    district: "",
    city: "",
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);
  const [baseShippingFee, setBaseShippingFee] = useState(30000);

  useEffect(() => {
    shippingFeesApi.getCurrent()
      .then((response) => setBaseShippingFee(Number(response.data.result.fee)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setRegionsLoading(true);
    vnRegions.provinces()
      .then((pvs) => setProvinces(pvs))
      .catch(() => toast.error("Không tải được danh sách địa chính"))
      .finally(() => setRegionsLoading(false));
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || provinces.length === 0) return;
    let alive = true;

    const applySavedAddress = async (addr: Address) => {
      const provinceCode = addr.provinceCode ?? provinces.find((p) => p.name === addr.city)?.code ?? null;
      const districtCode = addr.districtCode ?? null;

      setForm((f) => ({
        ...f,
        recipientName: addr.recipientName || f.recipientName,
        recipientPhone: addr.recipientPhone || f.recipientPhone,
      }));
      setAddressForm((f) => ({
        ...f,
        address: addr.address,
        provinceCode,
        districtCode,
        ward: addr.ward ?? "",
        district: addr.district ?? "",
        city: addr.city,
        isDefault: addr.isDefault,
      }));
      setProvinceCode(provinceCode);
      setProvinceName(addr.city);
      setDistrictCode(districtCode);
      setDistrictName(addr.district ?? "");
      setSelectedAddressId(addr.id);

      if (provinceCode != null) {
        const dists = await vnRegions.districts(provinceCode);
        if (!alive) return;
        setDistricts(dists);

        const resolvedDistrictCode =
          districtCode ?? dists.find((d) => d.name === addr.district)?.code ?? null;
        setDistrictCode(resolvedDistrictCode);
        if (resolvedDistrictCode != null) {
          const ws = await vnRegions.wards(resolvedDistrictCode);
          if (!alive) return;
          setWards(ws);
        }
      }
    };

    const loadSavedAddresses = async () => {
      try {
        const r = await addressesApi.getAll();
        const list = r.data.result;
        setSavedAddresses(list);
        const addr = list.find((a) => a.isDefault) ?? list[0];
        if (!addr || !alive) return;
        await applySavedAddress(addr);
      } catch {
        // keep manual entry fallback
      }
    };

    void loadSavedAddresses();
    return () => {
      alive = false;
    };
  }, [hydrated, user, provinces]);

  const handleSelectSavedAddress = async (addr: Address) => {
    const provinceCode = addr.provinceCode ?? provinces.find((p) => p.name === addr.city)?.code ?? null;
    const districtCode = addr.districtCode ?? null;

    setForm((f) => ({
      ...f,
      recipientName: addr.recipientName || f.recipientName,
      recipientPhone: addr.recipientPhone || f.recipientPhone,
    }));
    setAddressForm((f) => ({
      ...f,
      address: addr.address,
      provinceCode,
      districtCode,
      ward: addr.ward ?? "",
      district: addr.district ?? "",
      city: addr.city,
      isDefault: addr.isDefault,
    }));
    setProvinceCode(provinceCode);
    setProvinceName(addr.city);
    setDistrictCode(districtCode);
    setDistrictName(addr.district ?? "");
    setSelectedAddressId(addr.id);

    if (provinceCode != null) {
      try {
        const dists = await vnRegions.districts(provinceCode);
        setDistricts(dists);

        const resolvedDistrictCode =
          districtCode ?? dists.find((d) => d.name === addr.district)?.code ?? null;
        setDistrictCode(resolvedDistrictCode);
        if (resolvedDistrictCode != null) {
          const ws = await vnRegions.wards(resolvedDistrictCode);
          setWards(ws);
        } else {
          setWards([]);
        }
      } catch {
        toast.error("Không tải được dữ liệu địa chỉ");
      }
    }
  };

  const handleProvinceChange = async (code: number, name: string) => {
    setSelectedAddressId(null);
    setProvinceCode(code);
    setProvinceName(name);
    setDistrictName("");
    setAddressForm((f) => ({ ...f, provinceCode: code, city: name, district: "", ward: "", districtCode: null }));
    setDistricts([]);
    setWards([]);
    setDistrictCode(null);
    if (!code) return;
    try {
      const dists = await vnRegions.districts(code);
      setDistricts(dists);
    } catch {
      toast.error("Không tải được quận/huyện");
    }
  };

  const handleDistrictChange = async (code: number, name: string) => {
    setSelectedAddressId(null);
    setDistrictCode(code);
    setDistrictName(name);
    setAddressForm((f) => ({ ...f, districtCode: code, district: name, ward: "" }));
    setWards([]);
    if (!code) return;
    try {
      const ws = await vnRegions.wards(code);
      setWards(ws);
    } catch {
      toast.error("Không tải được phường/xã");
    }
  };

  const handleSaveAddress = async () => {
    if (!addressForm.address.trim()) { toast.error("Vui lòng nhập địa chỉ"); return; }
    if (addressForm.provinceCode == null) { toast.error("Vui lòng chọn tỉnh / thành phố"); return; }
    if (addressForm.districtCode == null) { toast.error("Vui lòng chọn quận / huyện"); return; }
    if (!addressForm.ward.trim()) { toast.error("Vui lòng chọn phường / xã"); return; }

    setSavingAddress(true);
    try {
      await addressesApi.create({
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        address: addressForm.address,
        provinceCode: addressForm.provinceCode,
        districtCode: addressForm.districtCode,
        ward: addressForm.ward,
        district: addressForm.district,
        city: addressForm.city,
        isDefault: addressForm.isDefault,
      });
      setAddressForm({
        address: "",
        provinceCode: null,
        districtCode: null,
        ward: "",
        district: "",
        city: "",
        isDefault: false,
      });
      setProvinceCode(null);
      setDistrictCode(null);
      setProvinceName("");
      setDistrictName("");
      setDistricts([]);
      setWards([]);
      setSelectedAddressId(null);
      toast.success("Đã thêm địa chỉ");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setSavingAddress(false);
    }
  };

  useEffect(() => {
    const loadItems = (key: string) => {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as BuyNowItem[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch {
        sessionStorage.removeItem(key);
        return null;
      }
    };

    const selected = loadItems("sneakshop_selected_cart_items");
    if (selected) {
      setBuyNowItems(selected);
      setReady(true);
      return;
    }

    const raw = loadItems("sneakshop_buy_now_items");
    if (raw) {
      setBuyNowItems(raw);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!hydrated) return;
    // if (!user) {
    //   router.push("/login");
    //   return;
    // }
    if (buyNowItems.length === 0 && items.length === 0) {
      router.push("/cart");
      return;
    }
      setForm((f) => ({
      ...f,
      recipientName: f.recipientName || user?.fullName || "",
      recipientPhone: f.recipientPhone || user?.phone || "",
    }));
  }, [ready, hydrated, user, items.length, buyNowItems.length, router]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => {
      if (k === "recipientName" || k === "recipientPhone") {
        setSelectedAddressId(null);
      }
      return { ...f, [k]: e.target.value };
    });

  const checkoutItems = buyNowItems.length > 0
    ? buyNowItems.map((item) => ({
        id: item.productId,
        productName: item.productName,
        variantName: item.variantName,
        colorName: item.colorName,
        price: item.unitPrice,
        quantity: item.quantity,
        productImage: item.productImage,
      }))
    : items;

  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = baseShippingFee;
  const grandTotal = subtotal + shippingFee;
  const isBuyNow = buyNowItems.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientName.trim() || !form.recipientPhone.trim() || !addressForm.address.trim() || addressForm.provinceCode == null || addressForm.districtCode == null || !addressForm.ward.trim()) {
      toast.error("Vui lòng điền đầy đủ thông tin giao hàng");
      return;
    }
    setLoading(true);
    try {
      if (user && !user?.phone?.trim()) {
        const profileRes = await api.put("/api/user/profile", {
          phone: form.recipientPhone.trim(),
        });
        if (profileRes.data?.result) {
          setAuth(profileRes.data.result);
        }
      }

      await ordersApi.checkout({
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        shippingAddress: `${addressForm.address}, ${addressForm.ward}, ${addressForm.district}, ${addressForm.city}`,
        shippingCity: addressForm.city,
        addressId: selectedAddressId ?? undefined,
        paymentMethod: "cod",
        note: form.note,
        items: isBuyNow
          ? buyNowItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              colorId: item.colorId,
              quantity: item.quantity,
            }))
          : undefined,
      });
      if (isBuyNow) {
        sessionStorage.removeItem("sneakshop_buy_now_items");
        sessionStorage.removeItem("sneakshop_selected_cart_items");
      } else {
        clear();
      }
      toast.success("Đặt hàng thành công!");
      router.push(user ? "/orders" : "/");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || !ready || (items.length === 0 && buyNowItems.length === 0)) {
    return <div className="max-w-3xl mx-auto px-4 py-8"><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="mb-6 text-xl font-bold sm:mb-8 sm:text-2xl">Thanh toán</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <div className="space-y-6 lg:col-span-2">
            <div className="bg-white border rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-4">Thông tin giao hàng</h2>
              <div className="space-y-4">
                {savedAddresses.length > 1 && (
                  <div className="space-y-2">
                    <Label>Địa chỉ đã lưu</Label>
                    <div className="grid gap-3">
                      {savedAddresses.map((addr) => {
                        const selected = selectedAddressId === addr.id;
                        const label = [addr.address, addr.ward, addr.district, addr.city].filter(Boolean).join(", ");
                        return (
                          <button
                            key={addr.id}
                            type="button"
                            onClick={() => void handleSelectSavedAddress(addr)}
                            className={`text-left rounded-xl border px-4 py-3 transition ${
                              selected ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-sm">{addr.recipientName}</p>
                                <p className="text-sm text-gray-600">{addr.recipientPhone}</p>
                                <p className="text-sm text-gray-500 mt-1">{label}</p>
                              </div>
                              {addr.isDefault && (
                                <span className="rounded-full bg-black px-2 py-1 text-[11px] font-semibold text-white">
                                  Mặc định
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Người nhận *</Label>
                      <Input
                        value={form.recipientName}
                        onChange={(e) => setForm((f) => {
                          setSelectedAddressId(null);
                          return { ...f, recipientName: e.target.value };
                        })}
                      />
                  </div>
                  <div className="space-y-1">
                    <Label>Số điện thoại *</Label>
                      <Input
                        value={form.recipientPhone}
                        onChange={(e) => setForm((f) => {
                          setSelectedAddressId(null);
                          return { ...f, recipientPhone: e.target.value };
                        })}
                      />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Địa chỉ *</Label>
                    <Input
                      value={addressForm.address}
                      onChange={(e) => {
                        setSelectedAddressId(null);
                        setAddressForm((f) => ({ ...f, address: e.target.value }));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Tỉnh / Thành phố *</Label>
                    <Select
                      value={provinceCode != null ? String(provinceCode) : ""}
                      onValueChange={(v) => {
                        const p = provinces.find((x) => x.code === Number(v));
                        if (p) void handleProvinceChange(p.code, p.name);
                      }}
                      disabled={regionsLoading}
                    >
                      <SelectTrigger className="w-full">
                        <span>{provinceName || "-- Chọn tỉnh / thành phố --"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((p) => (
                          <SelectItem key={p.code} value={String(p.code)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {provinceName && <p className="text-xs text-gray-500">Đã chọn: {provinceName}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Quận / Huyện *</Label>
                    <Select
                      value={districtCode != null ? String(districtCode) : ""}
                      onValueChange={(v) => {
                        const d = districts.find((x) => x.code === Number(v));
                        if (d) void handleDistrictChange(d.code, d.name);
                      }}
                      disabled={!provinceCode || districts.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <span>{districtName || "-- Chọn quận / huyện --"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.code} value={String(d.code)}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {districtName && <p className="text-xs text-gray-500">Đã chọn: {districtName}</p>}
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Phường / Xã</Label>
                    <Select
                      value={addressForm.ward}
                      onValueChange={(v) => {
                        setSelectedAddressId(null);
                        setAddressForm((f) => ({ ...f, ward: v ?? "" }));
                      }}
                      disabled={!districtCode || wards.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <span>{addressForm.ward || "-- Chọn phường / xã --"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((w) => (
                          <SelectItem key={w.code} value={w.name}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </div>
            </div>

            {/* Payment */}
            <div className="bg-white border rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-4">Phương thức thanh toán</h2>
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                    💵
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-emerald-900">COD — Thanh toán khi nhận hàng</div>
                    <p className="mt-1 text-sm leading-6 text-emerald-800">
                      Hệ thống hiện chỉ hỗ trợ thanh toán khi nhận hàng. Bạn chỉ cần xác nhận đơn và thanh toán cho shipper khi nhận hàng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-white border rounded-xl p-4 sm:p-5">
              <h2 className="font-bold text-lg mb-4">Ghi chú</h2>
              <Textarea value={form.note} onChange={set("note")} rows={3} />
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white border rounded-xl p-4 sm:p-5 lg:sticky lg:top-24">
              <h2 className="font-bold text-lg mb-4">Đơn hàng</h2>
              <div className="space-y-3 mb-4">
                {checkoutItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 line-clamp-2 flex-1 pr-2">
                      {item.productName}
                      {item.variantName && <span className="text-gray-400"> · {item.variantName}</span>}
                      {" "}×{item.quantity}
                    </span>
                    <span className="font-medium flex-shrink-0">{formatVND(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phí vận chuyển</span>
                  <span>{shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatVND(shippingFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1 border-t">
                  <span>Tổng cộng</span>
                  <span className="text-black">{formatVND(grandTotal)}</span>
                </div>
              </div>
              <Button type="submit" className="w-full mt-4 h-11 font-bold" disabled={loading}>
                {loading ? "Đang đặt hàng..." : "Đặt hàng"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
