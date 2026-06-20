"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { SaveOnExitDialog } from "@/components/ui/save-on-exit-dialog";
import { usersApi } from "@/lib/api/users";
import { formatDate } from "@/lib/format";
import type { User } from "@/lib/types";
import { Lock, Unlock, UserCog } from "lucide-react";
import AdminPagination from "@/components/admin/AdminPagination";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [locking, setLocking] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [nextRole, setNextRole] = useState<"user" | "admin">("user");
  const [updatingRole, setUpdatingRole] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);

  const promptSave = (save: () => Promise<void>, discard: () => void) => {
    saveActionRef.current = save;
    discardActionRef.current = discard;
    setSavePromptOpen(true);
  };
  const confirmSave = async () => {
    const action = saveActionRef.current;
    saveActionRef.current = null;
    discardActionRef.current = null;
    setSavePromptOpen(false);
    if (action) await action();
  };
  const confirmDiscard = () => {
    const action = discardActionRef.current;
    saveActionRef.current = null;
    discardActionRef.current = null;
    setSavePromptOpen(false);
    if (action) action();
  };

  const load = async (kw: string) => {
    setLoading(true);
    try {
      const r = await usersApi.getAll({ keyword: kw || undefined, role: role || undefined, page, size: 10 });
      setUsers(r.data.result.content);
      setTotalPages(r.data.result.totalPages);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(debouncedKeyword); }, [role, page, debouncedKeyword]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(0);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [keyword]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedKeyword(keyword);
    setPage(0);
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    const next = { email: "", fullName: "", password: "", phone: "", role: "user" };
    setCreateForm(next);
    createInitialRef.current = next;
  };
  const closeLockDialog = () => {
    setLockOpen(false);
    setLockTarget(null);
    setLockReason("");
  };
  const closeRoleDialog = () => {
    setRoleOpen(false);
    setRoleTarget(null);
  };

  const createDirty = JSON.stringify(createForm) !== JSON.stringify(createInitialRef.current);
  const lockDirty = lockReason.trim().length > 0;
  const roleDirty = Boolean(roleTarget) && nextRole !== roleTarget?.role;

  const requestCloseCreate = () => {
    if (createDirty) {
      promptSave(saveCreate, closeCreateDialog);
      return;
    }
    closeCreateDialog();
  };
  const requestCloseLock = () => {
    if (lockDirty) {
      promptSave(saveLock, closeLockDialog);
      return;
    }
    closeLockDialog();
  };
  const requestCloseRole = () => {
    if (roleDirty) {
      promptSave(saveRole, closeRoleDialog);
      return;
    }
    closeRoleDialog();
  };

  const handleLock = (user: User) => {
    if (user.locked) {
      void (async () => {
        try {
          await usersApi.unlock(user.id);
          toast.success("Đã mở khóa tài khoản");
          load(debouncedKeyword);
        } catch {
          toast.error("Thao tác thất bại");
        }
      })();
      return;
    }
    setLockTarget(user);
    setLockReason("");
    setLockOpen(true);
  };

  const saveLock = async () => {
    if (!lockTarget) return;
    const trimmed = lockReason.trim();
    if (trimmed.length < 2 || trimmed.length > 500) {
      toast.error("Bạn phải nhập lý do trong khoảng 2-500 chữ");
      return;
    }
    setLocking(true);
    try {
      await usersApi.lock(lockTarget.id, { reason: lockReason.trim() });
      toast.success("Đã khóa tài khoản");
      setLockOpen(false);
      setLockTarget(null);
      setLockReason("");
      load(debouncedKeyword);
    } catch {
      toast.error("Thao tác thất bại");
    } finally {
      setLocking(false);
    }
  };

  const submitLock = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveLock();
  };

  const saveCreate = async () => {
    setCreating(true);
    try {
      await usersApi.create(createForm);
      toast.success("Tạo tài khoản thành công");
      closeCreateDialog();
      load(debouncedKeyword);
    } catch { toast.error("Có lỗi xảy ra"); }
    setCreating(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCreate();
  };

  const openCreateDialog = () => {
    const next = { email: "", fullName: "", password: "", phone: "", role: "user" };
    createInitialRef.current = next;
    setCreateForm(next);
    setCreateOpen(true);
  };

  const handleRoleChange = (user: User) => {
    setRoleTarget(user);
    setNextRole(user.role);
    setRoleOpen(true);
  };

  const saveRole = async () => {
    if (!roleTarget) return;
    setUpdatingRole(true);
    try {
      await usersApi.updateRole(roleTarget.id, nextRole);
      toast.success("Đã cập nhật vai trò");
      closeRoleDialog();
      setRoleTarget(null);
      await load(debouncedKeyword);
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Không thể cập nhật vai trò");
    } finally {
      setUpdatingRole(false);
    }
  };

  const submitRoleChange = async () => {
    await saveRole();
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCreateForm((f) => ({ ...f, [k]: e.target.value }));

  const roleLabel = (value: string) => {
    if (value === "admin") return "Quản trị";
    if (value === "user") return "Người dùng";
    return value;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Quản lý người dùng</h1>
        <Button className="w-full sm:w-auto" onClick={openCreateDialog}>+ Tạo tài khoản</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="flex w-full gap-2 sm:max-w-sm">
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button type="submit" size="icon" variant="outline"><Search className="w-4 h-4" /></Button>
        </form>
        <Select value={role || "all"} onValueChange={(v) => { setRole(!v || v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-full bg-white sm:w-36">
            <SelectValue>{(v: string) => ({ all: "Tất cả", user: "Người dùng", admin: "Quản trị" })[v] ?? v}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="user">Người dùng</SelectItem>
            <SelectItem value="admin">Quản trị</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border bg-white sm:block">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["ID", "Họ tên", "Email", "SĐT", "Vai trò", "Trạng thái", "Ngày tạo", ""].map((h) => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Không tìm thấy</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{user.id}</td>
                  <td className="px-4 py-3 font-medium">{user.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-gray-500">{user.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize text-xs">{roleLabel(user.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.locked ? (
                      <div className="space-y-1">
                        <Badge variant="destructive" className="text-xs">Đã khóa</Badge>
                        {user.lockReason && (
                          <p className="max-w-xs whitespace-pre-wrap break-words text-xs text-red-500">
                            Lý do: {user.lockReason}
                          </p>
                        )}
                        {user.lockedAt && (
                          <p className="text-[11px] text-gray-400">
                            Thời gian khóa: {formatDate(user.lockedAt)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Hoạt động</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRoleChange(user)} className="gap-1">
                        <UserCog className="w-3 h-3" />
                        Đổi vai trò
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleLock(user)} className="gap-1">
                        {user.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {user.locked ? "Mở khóa" : "Khóa"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-3">
              <Skeleton className="h-24 w-full" />
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">Không tìm thấy</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.fullName}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                  {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-[10px]">{roleLabel(user.role)}</Badge>
                  {user.locked ? (
                    <Badge variant="destructive" className="text-[10px]">Đã khóa</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Hoạt động</Badge>
                  )}
                </div>
              </div>
              {user.locked && user.lockReason && (
                <p className="mt-1 text-xs text-red-500">Lý do: {user.lockReason}</p>
              )}
              <p className="mt-1 text-[11px] text-gray-400">Ngày tạo: {formatDate(user.createdAt)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => handleRoleChange(user)}>
                  <UserCog className="w-3 h-3" />Đổi vai trò
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => handleLock(user)}>
                  {user.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {user.locked ? "Mở khóa" : "Khóa"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Dialog open={createOpen} onOpenChange={(next) => {
        if (next) {
          setCreateOpen(true);
          return;
        }
        requestCloseCreate();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Tạo tài khoản mới</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            {[
              { id: "fullName", label: "Họ tên", type: "text" },
              { id: "email", label: "Email", type: "email" },
              { id: "phone", label: "SĐT", type: "tel" },
              { id: "password", label: "Mật khẩu", type: "password" },
            ].map(({ id, label, type }) => (
              <div key={id}>
                <p className="text-sm font-medium mb-1">{label}</p>
                <Input type={type} value={createForm[id as keyof typeof createForm]} onChange={set(id)} required={id !== "phone"} />
              </div>
            ))}
            <div>
              <p className="text-sm font-medium mb-1">Vai trò</p>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v ?? "user" }))}>
                <SelectTrigger><SelectValue>{(v: string) => v === "admin" ? "Quản trị" : "Người dùng"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Người dùng</SelectItem>
                  <SelectItem value="admin">Quản trị</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 justify-end pt-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={requestCloseCreate}>Hủy</Button>
              <Button type="submit" disabled={creating}>{creating ? "Đang tạo..." : "Tạo"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={lockOpen} onOpenChange={(next) => {
        if (next) {
          setLockOpen(true);
          return;
        }
        requestCloseLock();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Khóa tài khoản</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitLock} className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Người dùng</p>
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                {lockTarget?.fullName} <span className="text-gray-400">({lockTarget?.email})</span>
              </div>
            </div>
            {lockTarget?.lockedAt && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Đang khóa từ</p>
                <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                  {formatDate(lockTarget.lockedAt)}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">Lý do khóa</p>
              <Textarea
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                rows={4}
                required
              />
            </div>
            <div className="flex flex-col gap-2 justify-end pt-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={requestCloseLock}>Hủy</Button>
              <Button type="submit" disabled={locking}>{locking ? "Đang khóa..." : "Khóa tài khoản"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={roleOpen} onOpenChange={(next) => {
        if (next) {
          setRoleOpen(true);
          return;
        }
        requestCloseRole();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi vai trò tài khoản</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
              <p className="font-medium">{roleTarget?.fullName}</p>
              <p className="text-gray-500">{roleTarget?.email}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Vai trò mới</p>
              <Select value={nextRole} onValueChange={(value) => setNextRole((value ?? "user") as "user" | "admin")}>
                <SelectTrigger><SelectValue>{(v: string) => v === "admin" ? "Quản trị" : "Người dùng"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Người dùng</SelectItem>
                  <SelectItem value="admin">Quản trị</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={requestCloseRole}>Hủy</Button>
              <Button
                onClick={() => void submitRoleChange()}
                disabled={updatingRole || nextRole === roleTarget?.role}
              >
                {updatingRole ? "Đang lưu..." : "Lưu vai trò"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SaveOnExitDialog
        open={savePromptOpen}
        onSave={() => void confirmSave()}
        onDiscard={confirmDiscard}
      />
    </div>
  );
}
