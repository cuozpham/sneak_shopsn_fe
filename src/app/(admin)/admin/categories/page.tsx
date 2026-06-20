"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SaveOnExitDialog } from "@/components/ui/save-on-exit-dialog";
import { categoriesApi } from "@/lib/api/categories";
import type { Category } from "@/lib/types";
import { Pencil, Trash2, Plus, RotateCcw } from "lucide-react";

const toSlug = (name: string) =>
  name.toLowerCase()
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");

interface CreateLevelState {
  enabled: boolean;
  id: number | null;
  name: string;
  sortOrder: string;
}

interface CreateFormState {
  status: "active" | "inactive";
  main: CreateLevelState;
  parent: CreateLevelState;
  child: CreateLevelState;
}

const emptyCreateLevel = (enabled = false): CreateLevelState => ({
  enabled,
  id: null,
  name: "",
  sortOrder: "",
});

const categoryToLevel = (category?: Category): CreateLevelState => category
  ? {
      enabled: true,
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder != null ? String(category.sortOrder) : "",
    }
  : emptyCreateLevel(false);

const emptyCreateForm = (): CreateFormState => ({
  status: "active",
  main: emptyCreateLevel(true),
  parent: emptyCreateLevel(false),
  child: emptyCreateLevel(false),
});

const getDescendantIds = (items: Category[], id: number): number[] => {
  const children = items.filter((i) => i.parentId === id).map((i) => i.id);
  return children.flatMap((cid) => [cid, ...getDescendantIds(items, cid)]);
};

type CategoryNode = Category & { children: CategoryNode[] };
const PARENT_DATALIST_ID = "category-parent-options";

const buildCategoryTree = (items: Category[]): CategoryNode[] => {
  const map = new Map<number, CategoryNode>();
  const roots: CategoryNode[] = [];

  const sorted = [...items].sort((a, b) => {
    const ao = a.sortOrder ?? 0;
    const bo = b.sortOrder ?? 0;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });

  sorted.forEach((item) => {
    map.set(item.id, { ...item, children: [] });
  });

  sorted.forEach((item) => {
    const node = map.get(item.id);
    if (!node) return;
    if (item.parentId == null) {
      roots.push(node);
      return;
    }
    const parent = map.get(item.parentId);
    if (parent) parent.children.push(node);
    else roots.push(node);
  });

  const sortTree = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes
      .sort((a, b) => {
        const ao = a.sortOrder ?? 0;
        const bo = b.sortOrder ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({ ...node, children: sortTree(node.children) }));

  return sortTree(roots);
};

const getNodeAndDescendants = (node: CategoryNode): CategoryNode[] => {
  const result: CategoryNode[] = [node];
  const collect = (n: CategoryNode) => {
    n.children.forEach((child) => { result.push(child); collect(child); });
  };
  collect(node);
  return result;
};

const firstChildOf = (items: Category[], parentId: number) =>
  items
    .filter((item) => !item.deleted && item.parentId === parentId)
    .sort((a, b) => {
      const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      return orderDiff || a.name.localeCompare(b.name);
    })[0];

const categoryIndex = (items: Category[]) =>
  new Map(items.map((item) => [item.id, item] as const));

const rootAncestorOf = (items: Category[], category: Category) => {
  const byId = categoryIndex(items);
  let current = category;
  while (current.parentId != null) {
    const parent = byId.get(current.parentId);
    if (!parent || parent.deleted) break;
    current = parent;
  }
  return current;
};

const directParentOf = (items: Category[], category: Category) => {
  if (category.parentId == null) return undefined;
  return categoryIndex(items).get(category.parentId);
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm());
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const initialFormRef = useRef<CreateFormState>(emptyCreateForm());
  const saveActionRef = useRef<(() => Promise<void>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);

  const isDirty = JSON.stringify(createForm) !== JSON.stringify(initialFormRef.current);
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
  const requestClose = () => {
    if (isDirty) {
      promptSave(saveCategory, () => setOpen(false));
      return;
    }
    setOpen(false);
  };

  const load = () => {
    setLoading(true);
    categoriesApi.adminGetAll()
      .then((r) => setCategories(r.data.result))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveCategory = async () => {
    if (!createForm.main.name.trim()) { toast.error("Vui lòng nhập danh mục chính"); return; }
    if (createForm.child.enabled && createForm.child.name.trim() && !createForm.parent.name.trim()) {
      toast.error("Danh mục con cần có danh mục cha");
      return;
    }

    setSaving(true);
    try {
      const createCategory = async (name: string, parentId: number | null, sortOrder: string) =>
        categoriesApi.adminCreate({
          name: name.trim(),
          slug: toSlug(name.trim()),
          parentId,
          sortOrder: sortOrder ? Number(sortOrder) : 0,
          status: createForm.status,
        });

      if (editing !== null) {
        const payload = {
          name: createForm.main.name.trim(),
          slug: toSlug(createForm.main.name.trim()),
          parentId: null,
          sortOrder: createForm.main.sortOrder ? Number(createForm.main.sortOrder) : 0,
          status: createForm.status,
        };
        await categoriesApi.adminUpdate(editing, payload);

        const parentName = createForm.parent.name.trim();
        let parentId: number | null = null;
        if (createForm.parent.enabled && parentName) {
          const parentRes = createForm.parent.id !== null
            ? await categoriesApi.adminUpdate(createForm.parent.id, {
                name: parentName,
                slug: toSlug(parentName),
                parentId: editing,
                sortOrder: createForm.parent.sortOrder ? Number(createForm.parent.sortOrder) : 0,
                status: createForm.status,
              })
            : await createCategory(parentName, editing, createForm.parent.sortOrder);
          parentId = parentRes.data.result.id;
        }

        if (createForm.child.enabled && createForm.child.name.trim()) {
          const childName = createForm.child.name.trim();
          if (createForm.child.id !== null) {
            await categoriesApi.adminUpdate(createForm.child.id, {
              name: childName,
              slug: toSlug(childName),
              parentId: parentId ?? editing,
              sortOrder: createForm.child.sortOrder ? Number(createForm.child.sortOrder) : 0,
              status: createForm.status,
            });
          } else {
            await createCategory(childName, parentId ?? editing, createForm.child.sortOrder);
          }
        }
        toast.success("Đã cập nhật");
      }

      if (editing === null) {
        const mainRes = await createCategory(createForm.main.name, null, createForm.main.sortOrder);
        const mainId = mainRes.data.result.id;
        const parentName = createForm.parent.name.trim();
        let parentId: number | null = null;

        if (createForm.parent.enabled && parentName) {
          const parentRes = await createCategory(parentName, mainId, createForm.parent.sortOrder);
          parentId = parentRes.data.result.id;
        }

        if (createForm.child.enabled && createForm.child.name.trim()) {
          await createCategory(
            createForm.child.name,
            parentId ?? mainId,
            createForm.child.sortOrder
          );
        }
        toast.success("Đã tạo danh mục");
      }
      setOpen(false);
      load();
    } catch { toast.error("Có lỗi xảy ra"); }
    finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCategory();
  };

  const handleDeleteClick = (node: CategoryNode) => {
    setDeleteTarget(node);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const all = getNodeAndDescendants(deleteTarget);
      for (const cat of [...all].reverse()) {
        await categoriesApi.adminDelete(cat.id);
      }
      const count = all.length;
      toast.success(count > 1
        ? `Đã chuyển ${count} danh mục vào thùng rác`
        : `Đã chuyển "${deleteTarget.name}" vào thùng rác`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Không thể xóa danh mục");
    } finally {
      setDeleting(false);
    }
  };

  const handleRestore = async (c: Category) => {
    const byId = categoryIndex(categories);
    if (c.parentId != null) {
      const parent = byId.get(c.parentId);
      if (parent?.deleted) {
        if (parent.parentId == null) {
          toast.error(`Không thể khôi phục: danh mục chính "${parent.name}" chưa được khôi phục`);
        } else {
          toast.error(`Không thể khôi phục: danh mục cha "${parent.name}" chưa được khôi phục`);
        }
        return;
      }
      if (parent && parent.parentId != null) {
        const grandparent = byId.get(parent.parentId);
        if (grandparent?.deleted) {
          toast.error(`Không thể khôi phục: danh mục chính "${grandparent.name}" chưa được khôi phục`);
          return;
        }
      }
    }
    try {
      await categoriesApi.adminRestore(c.id);
      toast.success(`Đã khôi phục "${c.name}"`);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Không thể khôi phục");
    }
  };

  const openCreate = () => {
    const next = emptyCreateForm();
    initialFormRef.current = next;
    setCreateForm(next);
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (c: Category, depth = 0) => {
    const root = rootAncestorOf(categories, c);
    const rootFirstChild = firstChildOf(categories, root.id);
    const rootSecondChild = rootFirstChild ? firstChildOf(categories, rootFirstChild.id) : undefined;
    const currentFirstChild = firstChildOf(categories, c.id);
    const directParent = directParentOf(categories, c);

    let main = categoryToLevel(root);
    let parent = emptyCreateLevel(false);
    let child = emptyCreateLevel(false);

    if (depth <= 0) {
      main = categoryToLevel(c);
      parent = rootFirstChild ? categoryToLevel(rootFirstChild) : emptyCreateLevel(false);
      child = rootSecondChild ? categoryToLevel(rootSecondChild) : emptyCreateLevel(false);
    } else if (depth === 1) {
      parent = categoryToLevel(c);
      child = currentFirstChild ? categoryToLevel(currentFirstChild) : emptyCreateLevel(false);
    } else {
      parent = directParent ? categoryToLevel(directParent) : emptyCreateLevel(false);
      child = categoryToLevel(c);
    }

    const nextForm: CreateFormState = {
      status: root.status === "inactive" ? "inactive" : "active",
      main,
      parent,
      child,
    };
    initialFormRef.current = nextForm;
    setCreateForm(nextForm);
    setEditing(root.id);
    setOpen(true);
  };

  const activeCategories = categories.filter((c) => !c.deleted);
  const editingDescendants = editing !== null
    ? new Set<number>([editing, ...getDescendantIds(activeCategories, editing)])
    : new Set<number>();
  const parentOptions = activeCategories.filter((c) => !c.parentId && !editingDescendants.has(c.id));

  const categoryTree = buildCategoryTree(categories);
  const rows: Array<{ node: CategoryNode; depth: number }> = [];
  const pushRows = (nodes: CategoryNode[], depth = 0) => {
    nodes.forEach((node) => {
      rows.push({ node, depth });
      if (node.children.length > 0) pushRows(node.children, depth + 1);
    });
  };
  pushRows(categoryTree);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Quản lý danh mục</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => openCreate()} className="w-full gap-1 sm:w-auto">
            <Plus className="w-4 h-4" />Thêm danh mục
          </Button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-xl border bg-white sm:block">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[50%]" />
            <col className="w-[10%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-left">Tên danh mục</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-center">STT</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-left">Trạng thái</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5" /></td></tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12 text-gray-400">Chưa có dữ liệu</td></tr>
            ) : rows.map(({ node: c, depth }) => {
              const isRoot = depth === 0;
              return (
                <tr key={c.id} className={`border-b last:border-0 ${c.deleted ? "bg-red-50" : "hover:bg-gray-50"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!isRoot && <span className="text-gray-300 select-none" style={{ paddingLeft: `${depth * 16}px` }}>↳</span>}
                      <span className={`font-medium ${isRoot ? "text-gray-900" : "text-gray-700"} ${c.deleted ? "line-through text-red-400" : ""}`}>
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{c.sortOrder ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.deleted ? (
                      <Badge variant="destructive" className="text-xs">Đã xóa</Badge>
                    ) : (
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-xs">
                        {c.status === "active" ? "Hoạt động" : "Ẩn"}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      {c.deleted ? (
                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleRestore(c)}>
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                      ) : (
                        <>
                          {isRoot && <Button size="sm" variant="outline" onClick={() => openEdit(c, depth)}><Pencil className="w-3 h-3" /></Button>}
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteClick(c)}><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
        ) : rows.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center text-sm text-gray-400">Chưa có dữ liệu</div>
        ) : (
          rows.map(({ node: c, depth }) => {
            const isRoot = depth === 0;
            return (
              <div key={c.id} className={`rounded-xl border bg-white p-3 shadow-sm ${c.deleted ? "bg-red-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${c.deleted ? "line-through text-red-400" : "text-gray-900"}`}>
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-500">STT: {c.sortOrder ?? "—"}</p>
                  </div>
                  {c.deleted ? (
                    <Badge variant="destructive" className="text-[10px]">Đã xóa</Badge>
                  ) : (
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {c.status === "active" ? "Hoạt động" : "Ẩn"}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400">{isRoot ? "Danh mục gốc" : `Cấp ${depth + 1}`}</span>
                  <div className="flex gap-1">
                    {c.deleted ? (
                      <Button size="sm" variant="outline" className="h-8 px-2 text-green-600 hover:text-green-700" onClick={() => handleRestore(c)}>
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    ) : (
                      <>
                        {isRoot && (
                          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => openEdit(c, depth)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-8 px-2 text-red-500 hover:text-red-600" onClick={() => handleDeleteClick(c)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={open} onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          return;
        }
        requestClose();
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-4 sm:w-[56vw] sm:min-w-[720px] sm:p-6">
          <DialogHeader>
            <DialogTitle>{editing !== null ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
            <div className="space-y-3 rounded-xl border bg-gray-50 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Danh mục chính <span className="text-red-500">*</span></p>
                <span className="text-xs text-gray-400">Bắt buộc</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium mb-1">Tên danh mục chính</p>
                  <Input
                    value={createForm.main.name}
                    onChange={(e) => setCreateForm((f) => ({
                      ...f,
                      main: { ...f.main, name: e.target.value },
                    }))}
                    required
                  />
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">STT</p>
                  <Input
                    type="number"
                    min={1}
                    value={createForm.main.sortOrder}
                    onChange={(e) => setCreateForm((f) => ({
                      ...f,
                      main: { ...f.main, sortOrder: e.target.value },
                    }))}
                  />
                </div>
              </div>
            </div>

            {createForm.parent.enabled ? (
              <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Danh mục cha</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateForm((f) => ({
                      ...f,
                      parent: emptyCreateLevel(false),
                      child: emptyCreateLevel(false),
                    }))}
                  >
                    Bỏ
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Tên danh mục cha</p>
                    <Input
                      list={PARENT_DATALIST_ID}
                      value={createForm.parent.name}
                      onChange={(e) => setCreateForm((f) => ({
                        ...f,
                        parent: { ...f.parent, name: e.target.value },
                      }))}
                      placeholder="Gõ để chọn hoặc nhập"
                    />
                    <datalist id={PARENT_DATALIST_ID}>
                      {parentOptions.map((c) => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">STT</p>
                    <Input
                      type="number"
                      min={1}
                      value={createForm.parent.sortOrder}
                      onChange={(e) => setCreateForm((f) => ({
                        ...f,
                        parent: { ...f.parent, sortOrder: e.target.value },
                      }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateForm((f) => ({ ...f, parent: emptyCreateLevel(true) }))}
              >
                Thêm danh mục cha
              </Button>
            )}

            {createForm.child.enabled ? (
              <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">Danh mục con</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCreateForm((f) => ({ ...f, child: emptyCreateLevel(false) }))}
                  >
                    Bỏ
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium mb-1">Tên danh mục con</p>
                    <Input
                      value={createForm.child.name}
                      onChange={(e) => setCreateForm((f) => ({
                        ...f,
                        child: { ...f.child, name: e.target.value },
                      }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">STT</p>
                    <Input
                      type="number"
                      min={1}
                      value={createForm.child.sortOrder}
                      onChange={(e) => setCreateForm((f) => ({
                        ...f,
                        child: { ...f.child, sortOrder: e.target.value },
                      }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateForm((f) => ({
                  ...f,
                  parent: f.parent.enabled ? f.parent : emptyCreateLevel(true),
                  child: emptyCreateLevel(true),
                }))}
              >
                Thêm danh mục con
              </Button>
            )}

            <div className="grid gap-4 rounded-xl border bg-white p-3 sm:grid-cols-2 sm:p-4">
              <div>
                <p className="text-sm font-medium mb-1">Trạng thái</p>
                <Select
                  value={createForm.status}
                  onValueChange={(v) => setCreateForm((f) => ({ ...f, status: v === "inactive" ? "inactive" : "active" }))}
                >
                  <SelectTrigger className="w-full"><SelectValue>{(v: string) => v === "active" ? "Hoạt động" : "Ẩn"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Ẩn</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" onClick={requestClose}>Hủy</Button>
                <Button type="submit" disabled={saving}>{saving ? "Đang lưu..." : editing !== null ? "Cập nhật" : "Lưu"}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(next) => { if (!next && !deleting) { setDeleteOpen(false); setDeleteTarget(null); } }}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-red-600">Xóa danh mục</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-700">
              Bạn có chắc muốn xóa danh mục <span className="font-semibold">"{deleteTarget?.name}"</span>?
            </p>
            {deleteTarget && getNodeAndDescendants(deleteTarget).length > 1 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-xs font-semibold text-red-600">Các danh mục sau cũng sẽ bị chuyển vào thùng rác:</p>
                <ul className="space-y-1">
                  {getNodeAndDescendants(deleteTarget).slice(1).map((d) => (
                    <li key={d.id} className="text-xs text-red-500">• {d.name}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500">Danh mục đã xóa có thể khôi phục lại từ thùng rác.</p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => { setDeleteOpen(false); setDeleteTarget(null); }}>Hủy</Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
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
