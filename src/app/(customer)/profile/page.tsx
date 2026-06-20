"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Check, ChevronDown, Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { api, getError } from "@/lib/api";
import { addressesApi } from "@/lib/api/addresses";
import { formatDate } from "@/lib/format";
import { vnRegions } from "@/lib/vn-regions";
import type { Province, District, Ward } from "@/lib/vn-regions";
import type { Address } from "@/lib/types";

type Gender = "MALE" | "FEMALE" | "OTHER" | "";

const EMPTY_ADDR = {
  recipientName: "",
  recipientPhone: "",
  address: "",
  provinceCode: null as number | null,
  districtCode: null as number | null,
  ward: "",
  district: "",
  city: "",
  isDefault: false,
};

const GENDER_OPTIONS: { value: Exclude<Gender, "">; label: string }[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
];

export default function ProfilePage() {
  const { user, hydrated, setAuth, logout } = useAuthStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ username: "", email: "", fullName: "", phone: "", gender: "" as Gender, birthDate: "" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrModal, setAddrModal] = useState<null | "new" | number>(null);
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);

  // Cascading dropdown state
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [districtCode, setDistrictCode] = useState<number | null>(null);
  const [regionsLoading, setRegionsLoading] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    setForm({
      username: user.username ?? "",
      email: user.email ?? "",
      fullName: user.fullName,
      phone: user.phone ?? "",
      gender: (user.gender ?? "") as Gender,
      birthDate: user.birthDate ?? "",
    });
  }, [hydrated, user, router]);

  useEffect(() => {
    if (hydrated && user) loadAddresses();
  }, [hydrated, user]);

  const loadAddresses = async () => {
    setAddrLoading(true);
    try {
      const r = await addressesApi.getAll();
      setAddresses(r.data.result);
    } catch { } finally { setAddrLoading(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const uploadRes = await api.post("/api/user/avatar", fd);
      const uploadedUrl = uploadRes.data?.url || uploadRes.data?.result?.url || null;
      if (uploadedUrl) {
        setAvatarPreview(uploadedUrl);
      }
      const r = await api.get("/api/user/me");
      setAuth({ ...r.data.result, accessToken: localStorage.getItem("token") ?? "", tokenType: "Bearer" });
      toast.success("Cập nhật ảnh thành công");
    } catch (err) { toast.error(getError(err)); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { toast.error("Tên không được để trống"); return; }
    setSaving(true);
    try {
      const r = await api.put("/api/user/profile", {
        email: form.email || null,
        fullName: form.fullName,
        phone: form.phone || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
      });
      setAuth({ ...r.data.result, accessToken: localStorage.getItem("token") ?? "", tokenType: "Bearer" });
      toast.success("Cập nhật thành công");
    } catch (err) { toast.error(getError(err)); }
    finally { setSaving(false); }
  };

  // Load provinces once when modal opens
  const openAddrModal = async (addr?: Address) => {
    setDistricts([]);
    setWards([]);
    setProvinceCode(null);
    setDistrictCode(null);

    if (addr) {
      setAddrForm({
        recipientName: addr.recipientName,
        recipientPhone: addr.recipientPhone,
        address: addr.address,
        provinceCode: addr.provinceCode ?? null,
        districtCode: addr.districtCode ?? null,
        ward: addr.ward ?? "",
        district: addr.district ?? "",
        city: addr.city,
        isDefault: addr.isDefault,
      });
      setAddrModal(addr.id);
    } else {
      setAddrForm({
        ...EMPTY_ADDR,
        recipientName: user?.fullName ?? "",
        recipientPhone: user?.phone ?? "",
      });
      setAddrModal("new");
    }

    setRegionsLoading(true);
    try {
      const pvs = await vnRegions.provinces();
      setProvinces(pvs);

      const provinceCode = addr?.provinceCode ?? null;
      const districtCode = addr?.districtCode ?? null;
      if (provinceCode) {
        const pv = pvs.find((p) => p.code === provinceCode) ?? pvs.find((p) => p.name === addr?.city);
        if (pv) {
          setProvinceCode(pv.code);
          const dists = await vnRegions.districts(pv.code);
          setDistricts(dists);
          if (districtCode) {
            const dist = dists.find((d) => d.code === districtCode) ?? dists.find((d) => d.name === addr?.district);
            if (dist) {
              setDistrictCode(dist.code);
              const ws = await vnRegions.wards(dist.code);
              setWards(ws);
            }
          }
        }
      }
    } catch { toast.error("Không tải được danh sách địa chính"); }
    finally { setRegionsLoading(false); }
  };

  const openNewAddr = () => openAddrModal();
  const openEditAddr = (a: Address) => openAddrModal(a);

  const handleProvinceChange = async (code: number, name: string) => {
    setProvinceCode(code);
    setAddrForm((f) => ({ ...f, provinceCode: code, city: name, districtCode: null, district: "", ward: "" }));
    setDistricts([]);
    setWards([]);
    setDistrictCode(null);
    if (!code) return;
    try {
      const dists = await vnRegions.districts(code);
      setDistricts(dists);
    } catch { toast.error("Không tải được quận/huyện"); }
  };

  const handleDistrictChange = async (code: number, name: string) => {
    setDistrictCode(code);
    setAddrForm((f) => ({ ...f, districtCode: code, district: name, ward: "" }));
    setWards([]);
    if (!code) return;
    try {
      const ws = await vnRegions.wards(code);
      setWards(ws);
    } catch { toast.error("Không tải được phường/xã"); }
  };

  const handleSaveAddr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrForm.recipientName.trim()) { toast.error("Vui lòng nhập tên người nhận"); return; }
    if (!addrForm.recipientPhone.trim()) { toast.error("Vui lòng nhập số điện thoại"); return; }
    if (!addrForm.address.trim()) { toast.error("Vui lòng nhập địa chỉ"); return; }
    if (addrForm.provinceCode == null) { toast.error("Vui lòng chọn tỉnh / thành phố"); return; }
    if (addrForm.districtCode == null) { toast.error("Vui lòng chọn quận / huyện"); return; }
    setAddrSaving(true);
    try {
      const payload = {
        ...addrForm,
        provinceCode: addrForm.provinceCode,
        districtCode: addrForm.districtCode,
      };
      if (addrModal === "new") {
        await addressesApi.create(payload);
        toast.success("Thêm địa chỉ thành công");
      } else {
        await addressesApi.update(addrModal as number, payload);
        toast.success("Cập nhật địa chỉ thành công");
      }
      setAddrModal(null);
      loadAddresses();
    } catch (err) { toast.error(getError(err)); }
    finally { setAddrSaving(false); }
  };

  const handleDeleteAddr = async (id: number) => {
    if (!confirm("Xóa địa chỉ này?")) return;
    try {
      await addressesApi.delete(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Đã xóa địa chỉ");
    } catch (err) { toast.error(getError(err)); }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await addressesApi.setDefault(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) { toast.error(getError(err)); }
  };

  if (!hydrated) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4" />
      <div className="h-5 w-48 mx-auto mb-2 rounded bg-gray-100" />
      <div className="h-4 w-64 mx-auto rounded bg-gray-100" />
    </div>
  );

  if (!user) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <Camera className="w-7 h-7 text-gray-400" />
      </div>
      <p className="font-bold text-lg mb-1">Bạn chưa đăng nhập</p>
      <p className="text-gray-500 text-sm mb-6">Đăng nhập để xem và chỉnh sửa thông tin cá nhân</p>
      <div className="flex justify-center gap-3">
        <button onClick={() => router.push("/login")}
          className="px-6 py-2.5 bg-black text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition">
          Đăng nhập
        </button>
        <button onClick={() => router.push("/register")}
          className="px-6 py-2.5 border text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
          Đăng ký
        </button>
      </div>
    </div>
  );

  const initials = user.fullName.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">

      {/* Header card */}
      <div className="bg-white rounded-2xl border p-6 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-900 flex items-center justify-center">
            {(avatarPreview || user.avatarUrl) ? (
              <Image
                src={avatarPreview || user.avatarUrl || ""}
                alt={user.fullName}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <span className="text-white text-2xl font-bold">{initials}</span>
            )}
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-700 transition disabled:opacity-60">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{user.fullName}</p>
          <p className="text-gray-500 text-sm truncate">{user.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{user.role}</span>
            {user.createdAt && <span className="text-xs text-gray-400">Tham gia {formatDate(user.createdAt)}</span>}
          </div>
        </div>
      </div>

      {/* Thông tin cá nhân */}
      <div className="bg-white rounded-2xl border p-6">
          <form onSubmit={handleSaveInfo} className="space-y-4">
            {/* Read-only fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Tên đăng nhập">
                <div className="space-y-1.5">
                  <input
                    value={form.username}
                    readOnly
                    className="input-base bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </Field>
              <Field label="Email">
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  type="email"
                  className="input-base"
                />
              </Field>
              <Field label="Vai trò">
                <input value={user.role === "admin" ? "Quản trị viên" : "Khách hàng"} disabled className="input-base bg-gray-50 text-gray-400 cursor-not-allowed" />
              </Field>
            </div>
            {/* Editable fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Họ và tên *">
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required className="input-base" />
              </Field>
              <Field label="Số điện thoại">
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  type="tel" className="input-base" />
              </Field>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Giới tính">
                <div className="grid grid-cols-3 gap-2">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, gender: opt.value }))}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        form.gender === opt.value ? "border-black bg-black text-white" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Ngày sinh">
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="input-base"
                />
              </Field>
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 disabled:opacity-60 transition">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
      </div>

      {/* Địa chỉ */}
      <div className="bg-white rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Địa chỉ</h2>
          <button onClick={openNewAddr}
            className="flex items-center gap-2 bg-black text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 transition">
            <Plus className="w-4 h-4" /> Thêm
          </button>
        </div>
        <div className="space-y-3">
          {addrLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Đang tải...</div>
          ) : addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có địa chỉ nào</p>
            </div>
          ) : (
            addresses.map((addr) => (
              <div key={addr.id} className={`bg-white rounded-xl border p-4 ${addr.isDefault ? "border-black" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{addr.recipientName}</p>
                      <span className="text-gray-400 text-sm">·</span>
                      <p className="text-gray-600 text-sm">{addr.recipientPhone}</p>
                      {addr.isDefault && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-black text-white flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {[addr.address, addr.ward, addr.district, addr.city].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)}
                        className="text-xs text-gray-500 hover:text-black px-2 py-1 rounded-lg hover:bg-gray-100 transition">
                        Đặt mặc định
                      </button>
                    )}
                    <button onClick={() => openEditAddr(addr)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-black transition">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteAddr(addr.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Address modal */}
      {addrModal !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex-shrink-0">
              <h2 className="font-bold text-base">{addrModal === "new" ? "Thêm địa chỉ mới" : "Chỉnh sửa địa chỉ"}</h2>
            </div>
            <form onSubmit={handleSaveAddr} className="p-6 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Người nhận *">
                  <input value={addrForm.recipientName} onChange={(e) => setAddrForm((f) => ({ ...f, recipientName: e.target.value }))}
                    required className="input-base" />
                </Field>
                <Field label="Số điện thoại *">
                  <input value={addrForm.recipientPhone} onChange={(e) => setAddrForm((f) => ({ ...f, recipientPhone: e.target.value }))}
                    required type="tel" className="input-base" />
                </Field>
              </div>
              <Field label="Địa chỉ *">
                <input value={addrForm.address} onChange={(e) => setAddrForm((f) => ({ ...f, address: e.target.value }))}
                  required className="input-base" />
              </Field>
              {/* Cascading dropdowns: Tỉnh → Quận → Phường */}
              {regionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Đang tải danh sách địa chính...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {/* Tỉnh / Thành phố */}
                  <Field label="Tỉnh / Thành phố *">
                    <div className="relative">
                      <select
                        required
                        value={provinceCode ?? ""}
                        onChange={(e) => {
                          const code = Number(e.target.value);
                          const name = provinces.find((p) => p.code === code)?.name ?? "";
                          handleProvinceChange(code, name);
                        }}
                        className="input-base appearance-none pr-8"
                      >
                        <option value="">-- Chọn tỉnh / thành phố --</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Quận / Huyện */}
                  <Field label="Quận / Huyện *">
                    <div className="relative">
                      <select
                        required
                        disabled={!provinceCode}
                        value={districtCode ?? ""}
                        onChange={(e) => {
                          const code = Number(e.target.value);
                          const name = districts.find((d) => d.code === code)?.name ?? "";
                          handleDistrictChange(code, name);
                        }}
                        className="input-base appearance-none pr-8 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Chọn quận / huyện --</option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>

                  {/* Phường / Xã */}
                  <Field label="Phường / Xã">
                    <div className="relative">
                      <select
                        disabled={!districtCode}
                        value={addrForm.ward}
                        onChange={(e) => setAddrForm((f) => ({ ...f, ward: e.target.value }))}
                        className="input-base appearance-none pr-8 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Chọn phường / xã --</option>
                        {wards.map((w) => (
                          <option key={w.code} value={w.name}>{w.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </Field>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 pt-1">
                <input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded" />
                Đặt làm địa chỉ mặc định
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAddrModal(null)}
                  className="px-4 py-2 text-sm rounded-xl border hover:bg-gray-50 transition">Hủy</button>
                <button type="submit" disabled={addrSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-60 transition">
                  {addrSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {addrSaving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
