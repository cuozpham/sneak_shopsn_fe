"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, ImagePlus, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { bannersApi } from "@/lib/api/banners";
import { categoriesApi } from "@/lib/api/categories";
import { toFrontendImageUrl } from "@/lib/image";
import type { Banner, Category } from "@/lib/types";

const sortBanners = (items: Banner[]) =>
  [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.id - a.id;
  });

const moveItem = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const OBJECT_POSITION_PRESETS = [
  { value: "center", label: "Chính giữa" },
  { value: "top", label: "Trên cùng" },
  { value: "bottom", label: "Dưới cùng" },
  { value: "left", label: "Trái" },
  { value: "right", label: "Phải" },
  { value: "top left", label: "Trên-trái" },
  { value: "top right", label: "Trên-phải" },
  { value: "bottom left", label: "Dưới-trái" },
  { value: "bottom right", label: "Dưới-phải" },
];

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [objectPosition, setObjectPosition] = useState("center");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const objectPositionInputRef = useRef<HTMLInputElement>(null);
  const draggingFocusRef = useRef(false);

  const limit = selectedCategoryId === null ? 9 : 3;

  const orderedBanners = useMemo(() => sortBanners(banners), [banners]);
  const canAdd = orderedBanners.length < limit;

  const load = async () => {
    setLoading(true);
    try {
      const r = await bannersApi.adminGetAll({
        categoryId: selectedCategoryId === null ? "null" : selectedCategoryId,
      });
      setBanners(sortBanners(r.data.result ?? []));
    } catch {
      toast.error("Không thể tải danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    categoriesApi
      .adminGetAll({ deleted: false })
      .then((r) => {
        if (alive) setCategories(r.data.result ?? []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    bannersApi
      .adminGetAll({
        categoryId: selectedCategoryId === null ? "null" : selectedCategoryId,
      })
      .then((r) => {
        if (alive) setBanners(sortBanners(r.data.result ?? []));
      })
      .catch(() => {
        if (alive) toast.error("Không thể tải danh sách banner");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [selectedCategoryId]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  const openPicker = (targetId: number | null = null) => {
    if (targetId === null && !canAdd) {
      toast.error(`Chỉ được tối đa ${limit} banner`);
      return;
    }
    setUploadTargetId(targetId);
    if (targetId !== null) {
      const current = orderedBanners.find((banner) => banner.id === targetId);
      setObjectPosition(current?.objectPosition || "center");
    } else {
      setObjectPosition("center");
    }
    fileInputRef.current?.click();
  };

  const persistOrder = async (next: Banner[]) => {
    const normalized = next.map((banner, index) => ({ ...banner, sortOrder: index }));
    setBanners(normalized);
    try {
      await bannersApi.adminReorder(normalized.map((banner) => banner.id));
    } catch {
      toast.error("Không thể lưu thứ tự banner");
      await load();
    } finally {
      setDraggedId(null);
    }
  };

  const handleDropOnBanner = async (targetId: number) => {
    if (draggedId == null || draggedId === targetId) return;
    const fromIndex = orderedBanners.findIndex((banner) => banner.id === draggedId);
    const toIndex = orderedBanners.findIndex((banner) => banner.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    await persistOrder(moveItem(orderedBanners, fromIndex, toIndex));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ nhận file ảnh");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ảnh tối đa 10MB");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    if (pendingPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingPreviewUrl);
    }
    setPendingFile(file);
    setPendingPreviewUrl(previewUrl);
  };

  const setFocusFromPointer = (clientX: number, clientY: number) => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setObjectPosition(`${Math.round(x)}% ${Math.round(y)}%`);
  };

  const savePendingBanner = async () => {
    if (!pendingFile) return;
    setBusyId(uploadTargetId ?? -1);
    try {
      const uploaded = await bannersApi.uploadImage(pendingFile);
      const imageUrl = uploaded.data.url;

      if (uploadTargetId === null) {
        await bannersApi.adminCreate({
          imageUrl,
          title: null,
          linkUrl: null,
          position: "hero",
          objectPosition,
          isActive: true,
          sortOrder: orderedBanners.length,
          categoryId: selectedCategoryId,
        });
        toast.success("Đã thêm banner");
      } else {
        const current = orderedBanners.find((banner) => banner.id === uploadTargetId);
        await bannersApi.adminUpdate(uploadTargetId, {
          imageUrl,
          title: current?.title ?? null,
          linkUrl: current?.linkUrl ?? null,
          position: current?.position ?? "hero",
          objectPosition,
          isActive: current?.isActive ?? true,
          sortOrder: current?.sortOrder ?? 0,
        });
        toast.success("Đã đổi ảnh banner");
      }

      await load();
    } catch {
      toast.error("Không thể lưu ảnh banner");
    } finally {
      if (pendingPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
      setPendingFile(null);
      setPendingPreviewUrl(null);
      setBusyId(null);
      setUploadTargetId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa banner này không?")) return;
    setBusyId(id);
    try {
      await bannersApi.adminDelete(id);
      toast.success("Đã xóa banner");
      await load();
    } catch {
      toast.error("Không thể xóa banner");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Quản lý Banner</h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-500">
              Kéo thả để đổi thứ tự, tối đa {limit} banner.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 shrink-0">Danh mục:</span>
              <select
                value={selectedCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategoryId(val === "" ? null : Number(val));
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm font-medium shadow-sm outline-none focus:border-black focus:ring-1 focus:ring-black min-w-[180px]"
              >
                <option value="">Trang chủ (Mặc định)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="h-9 px-3 text-sm">
            {orderedBanners.length}/{limit}
          </Badge>
          <Button variant="outline" onClick={() => void load()} className="w-full gap-2 sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </Button>
          <Button onClick={() => openPicker(null)} className="w-full gap-2 sm:w-auto" disabled={!canAdd}>
            <Upload className="h-4 w-4" />
            Tải ảnh mới
          </Button>
        </div>
      </div>

      {pendingPreviewUrl && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-gray-900">Ảnh banner đang chọn</p>
              <p className="text-sm text-gray-500">
                Kéo trên ảnh để chỉnh vùng focus, hoặc chọn preset / nhập giá trị tùy chỉnh.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={OBJECT_POSITION_PRESETS.some((p) => p.value === objectPosition) ? objectPosition : "__custom__"}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") {
                    objectPositionInputRef.current?.focus();
                    return;
                  }
                  setObjectPosition(v);
                }}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black"
              >
                {OBJECT_POSITION_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
                <option value="__custom__">Tùy chỉnh...</option>
              </select>
              <input
                ref={objectPositionInputRef}
                value={objectPosition}
                onChange={(e) => setObjectPosition(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black sm:w-56"
                placeholder="Vị trí focus (VD: 30% 70%)"
              />
              <Button onClick={() => void savePendingBanner()} disabled={!pendingFile || busyId !== null} className="shrink-0">
                Lưu banner
              </Button>
              <Badge variant="secondary" className="shrink-0">
                {busyId !== null ? "Đang tải lên" : "Xem trước"}
              </Badge>
            </div>
          </div>
          <div
            ref={previewRef}
            className="relative h-52 bg-gray-50 touch-none sm:h-64 md:h-80"
            onPointerDown={(e) => {
              draggingFocusRef.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              setFocusFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (!draggingFocusRef.current) return;
              setFocusFromPointer(e.clientX, e.clientY);
            }}
            onPointerUp={(e) => {
              draggingFocusRef.current = false;
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
            }}
            onPointerCancel={() => {
              draggingFocusRef.current = false;
            }}
          >
            <img
              src={pendingPreviewUrl}
              alt="Xem trước banner"
              className="block h-full w-full object-cover"
              style={{ objectPosition }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                Kéo để chỉnh vị trí
              </span>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedBanners.map((banner, index) => (
            <div
              key={banner.id}
              draggable
              onDragStart={() => setDraggedId(banner.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void handleDropOnBanner(banner.id)}
              className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[16/10] bg-gray-100">
                <img
                  src={toFrontendImageUrl(banner.imageUrl)}
                  alt={`Banner ${index + 1}`}
                  className="block h-full w-full object-cover"
                  style={{ objectPosition: banner.objectPosition || "center" }}
                />

                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                    <GripVertical className="h-3.5 w-3.5" />
                    Kéo thả
                  </span>
                </div>

                <div className="absolute right-3 top-3 flex gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-white/95 shadow-sm"
                    onClick={() => openPicker(banner.id)}
                    disabled={busyId === banner.id}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full bg-white/95 text-red-600 shadow-sm hover:text-red-700"
                    onClick={() => void handleDelete(banner.id)}
                    disabled={busyId === banner.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {canAdd && (
            <button
              type="button"
              onClick={() => openPicker(null)}
              className="flex min-h-[18rem] items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 transition hover:border-gray-400 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                  <ImagePlus className="h-7 w-7" />
                </span>
                <div className="text-center">
                  <p className="font-medium text-gray-900">Thêm banner mới</p>
                  <p className="text-sm text-gray-500">Chỉ cần chọn ảnh</p>
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
