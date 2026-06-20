"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, LayoutDashboard, Loader2, LogOut, Menu, Package, Search, ShoppingBag, User, UserCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import NotificationBell from "@/components/NotificationBell";
import { categoriesApi } from "@/lib/api/categories";
import { productsApi } from "@/lib/api/products";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type CategoryNode = Category & { children: CategoryNode[] };

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

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const count = useCartStore((s) => s.count());
  const router = useRouter();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState<Set<number>>(new Set());
  const [userHover, setUserHover] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMobileCatOpen(new Set());
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    categoriesApi.getAll()
      .then((r) => setCategories(r.data.result ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    return () => {
      if (categoryTimer.current) clearTimeout(categoryTimer.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTopBar = dropdownRef.current?.contains(target);
      const insideMobileMenu = mobileMenuRef.current?.contains(target);
      if (!insideTopBar && !insideMobileMenu) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
      setSuggestions([]);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await productsApi.search({ keyword: searchQuery.trim(), size: 6, status: "active" });
        setSuggestions(r.data.result?.content ?? []);
      } catch { setSuggestions([]); }
      setSearchLoading(false);
    }, 300);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    if (searchOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSearchOpen(false); };
    if (searchOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserHover(false);
      }
    };
    if (userHover) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userHover]);

  const handleSearchSubmit = () => {
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    router.push(`/products?keyword=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const categoryTree = buildCategoryTree(categories);
  const topCategories = categoryTree.filter((c) => c.parentId == null);
  const navLinks = [
    { href: "/products", label: "Mới" },
    { href: "/products?sort=sale", label: "Giảm giá" },
  ];

  const activeRoot = topCategories.find((c) => c.id === activeRootId) ?? null;
  const activeRootChildren = activeRoot?.children ?? [];
  const activeChild = activeRootChildren.find((child) => child.id === activeChildId) ?? null;

  const toggleMobileCat = (id: number) => {
    setMobileCatOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderMobileCategoryTree = (nodes: CategoryNode[], depth = 0) =>
    nodes
      .sort((a, b) => {
        const ao = a.sortOrder ?? 0;
        const bo = b.sortOrder ?? 0;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      })
      .map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = mobileCatOpen.has(node.id);
        return (
          <div key={node.id} className={depth === 0 ? "rounded-xl border border-black/5 bg-white" : "rounded-lg border border-black/5 bg-gray-50"}>
            <div className="flex items-center">
              <Link
                href={`/products?categorySlug=${encodeURIComponent(node.slug)}`}
                onClick={() => setMobileOpen(false)}
                className={`flex-1 truncate px-3 py-3 text-left text-sm font-medium uppercase tracking-[0.12em] text-black/80 ${depth > 0 ? "text-[12px] normal-case tracking-normal" : ""}`}
              >
                {depth > 0 ? "└ ".repeat(depth) : ""}
                {node.name}
              </Link>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleMobileCat(node.id)}
                  className="px-3 py-3 text-black/40 hover:text-black/70"
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>
            {hasChildren && isOpen && (
              <div className="border-t border-black/5 px-2 py-2">
                {renderMobileCategoryTree(node.children, depth + 1)}
              </div>
            )}
          </div>
        );
      });

  const openCategoryMenu = (category: CategoryNode) => {
    if (categoryTimer.current) clearTimeout(categoryTimer.current);
    if (!category.children.length) {
      setActiveRootId(null);
      setActiveChildId(null);
      return;
    }
    setActiveRootId(category.id);
    setActiveChildId(null);
  };

  const closeCategoryMenu = () => {
    categoryTimer.current = setTimeout(() => {
      setActiveRootId(null);
      setActiveChildId(null);
    }, 100);
  };

  const initials = user?.fullName
    ? user.fullName.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase()
    : "U";

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="bg-[#0d2021] text-white text-[11px] sm:text-xs">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-x-4 gap-y-1 px-4 sm:px-6 py-2 text-right">
            <span>Hotline: 0934762018</span>
            <span className="opacity-50">|</span>
            <a href="mailto:giaydepmandro@gmail.com" className="hover:underline">
              giaydepmandro@gmail.com
            </a>
          </div>
        </div>

        <nav className="border-b border-black/5 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
            <Link href="/" className="min-w-0 shrink-0">
              <div className="flex min-w-0 items-center">
                <div className="min-w-0">
                  <div className="max-w-[8.5rem] truncate font-serif text-[1.2rem] font-bold leading-none tracking-[0.12em] text-[#B89047] sm:max-w-none sm:text-[1.75rem]">
                    MANDRO
                  </div>
                </div>
              </div>
            </Link>

            <div className="hidden flex-1 items-center justify-center pr-[12%] gap-5 lg:flex">
              {navLinks.map((link) => {
                const active =
                  link.href === "/products"
                    ? pathname.startsWith("/products")
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-medium uppercase tracking-[0.12em] transition-colors ${
                      active ? "bg-black/5 text-black" : "text-black/60 hover:bg-black/5 hover:text-black"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {topCategories.map((category) => {
                const hasChildren = category.children.length > 0;
                const active = pathname.includes(`categorySlug=${encodeURIComponent(category.slug)}`);
                return (
                  <div
                    key={category.id}
                    className="relative"
                    onMouseEnter={() => openCategoryMenu(category)}
                    onMouseLeave={closeCategoryMenu}
                  >
                    <Link
                      href={`/products?categorySlug=${encodeURIComponent(category.slug)}`}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-medium uppercase tracking-[0.12em] transition-colors ${
                        active ? "bg-black/5 text-black" : "text-black/60 hover:bg-black/5 hover:text-black"
                      }`}
                    >
                      {category.name}
                      {hasChildren && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                    </Link>

                    {hasChildren && activeRootId === category.id && (
                      <div
                        className="absolute left-0 top-[calc(100%-1px)] z-50 pt-4"
                        onMouseEnter={() => {
                          if (categoryTimer.current) clearTimeout(categoryTimer.current);
                        }}
                        onMouseLeave={closeCategoryMenu}
                      >
                        <div className="relative w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-black/8 bg-white shadow-2xl">
                          <div className="max-h-96 overflow-y-auto py-2">
                            {activeRootChildren.map((child) => {
                              const hasGrandChildren = child.children.length > 0;
                              return (
                                <div key={child.id} className="relative px-2 py-1">
                                  {hasGrandChildren ? (
                                    <Link
                                      href={`/products?categorySlug=${encodeURIComponent(child.slug)}`}
                                      onMouseEnter={() => setActiveChildId(child.id)}
                                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                                        activeChildId === child.id ? "bg-gray-50 text-black" : "text-gray-800 hover:bg-gray-50 hover:text-black"
                                      }`}
                                    >
                                      <span>{child.name}</span>
                                      <ChevronDown className="h-4 w-4 -rotate-90 opacity-40" />
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/products?categorySlug=${encodeURIComponent(child.slug)}`}
                                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-50 hover:text-black"
                                    >
                                      <span>{child.name}</span>
                                      <span className="h-4 w-4" />
                                    </Link>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {activeChild?.children.length ? (
                            <div className="absolute left-[calc(100%-1px)] top-0 z-50 w-[min(18rem,calc(100vw-2rem))]">
                              <div className="rounded-2xl border border-black/8 bg-white shadow-2xl">
                                <div className="max-h-96 overflow-y-auto py-2">
                                  {activeChild.children.map((grandChild) => (
                                    <Link
                                      key={grandChild.id}
                                      href={`/products?categorySlug=${encodeURIComponent(grandChild.slug)}`}
                                      className="block px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-black"
                                    >
                                      {grandChild.name}
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2" ref={dropdownRef}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSearchOpen((v) => !v);
                }}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E7E2] shadow-sm transition hover:shadow-md sm:h-10 sm:w-10",
                  searchOpen
                    ? "bg-[#0B1F1A] text-white"
                    : "bg-white text-black hover:bg-[#0B1F1A] hover:text-white"
                )}
                aria-label={searchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
                aria-expanded={searchOpen}
              >
                <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </button>

              {user && <NotificationBell variant="light" />}

              <Link
                href="/cart"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E7E2] bg-white text-black shadow-sm transition hover:bg-[#0B1F1A] hover:text-white hover:shadow-md sm:h-10 sm:w-10"
                aria-label="Giỏ hàng"
              >
                <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                {mounted && count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-black px-1 text-[10px] font-semibold text-white sm:h-4.5 sm:min-w-4.5">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>

              {user ? (
                <>
                <div
                  ref={userRef}
                  className="relative"
                  onMouseEnter={() => {
                    if (hoverTimer.current) clearTimeout(hoverTimer.current);
                    setUserHover(true);
                  }}
                  onMouseLeave={() => {
                    hoverTimer.current = setTimeout(() => setUserHover(false), 150);
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setUserHover((v) => !v)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E7E2] bg-white text-black shadow-sm transition hover:bg-[#0B1F1A] hover:text-white hover:shadow-md sm:h-10 sm:w-10"
                    aria-label="Tài khoản"
                  >
                    {user.avatarUrl ? (
                      <span className="relative block h-9 w-9 overflow-hidden rounded-full sm:h-10 sm:w-10">
                        <Image
                          src={user.avatarUrl}
                          alt={user.fullName}
                          fill
                          className="object-cover"
                          sizes="40px"
                          unoptimized
                        />
                      </span>
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white sm:h-10 sm:w-10">
                        {initials}
                      </span>
                    )}
                  </button>

                  {userHover && (
                    <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
                      <div className="w-[min(15rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-black/8 bg-white shadow-xl">
                        {/* User info header */}
                        <div className="px-4 py-3 bg-gray-50 border-b border-black/5">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="relative h-10 w-10 overflow-hidden rounded-full bg-gray-900 flex-shrink-0">
                              {user.avatarUrl ? (
                                <Image
                                  src={user.avatarUrl}
                                  alt={user.fullName}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                  unoptimized
                                />
                              ) : (
                                <span className="flex h-full w-full items-center justify-center text-[11px] font-bold text-white">
                                  {initials}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900 truncate">{user.fullName}</p>
                              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                            </div>
                          </div>
                        </div>
                        {/* Menu items */}
                        <div className="py-1">
                          <Link
                            href="/profile"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserHover(false)}
                          >
                            <UserCircle className="h-4 w-4 text-gray-400" />
                            Thông tin cá nhân
                          </Link>
                          <Link
                            href="/orders"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserHover(false)}
                          >
                            <Package className="h-4 w-4 text-gray-400" />
                            Đơn hàng của tôi
                          </Link>
                          {user.role === "admin" && (
                            <Link
                              href="/admin"
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              onClick={() => setUserHover(false)}
                            >
                              <LayoutDashboard className="h-4 w-4 text-gray-400" />
                              Quản trị
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-black/5 py-1">
                          <button
                            type="button"
                            onClick={() => { setUserHover(false); handleLogout(); }}
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-black transition hover:bg-black hover:text-white sm:h-10 sm:w-10"
                  aria-label="Đăng nhập"
                >
                  <User className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                </Link>
              )}
              <button
                type="button"
                className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#E7E7E2] bg-white text-black shadow-sm transition hover:bg-[#0B1F1A] hover:text-white hover:shadow-md lg:hidden sm:h-10 sm:w-10"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Mở menu"
              >
                {mobileOpen ? <X className="h-4.5 w-4.5 sm:h-5 sm:w-5" /> : <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div ref={mobileMenuRef} className="border-t border-black/5 bg-[#f7f7f5] px-4 py-4 lg:hidden">
              <div className="mx-auto max-w-7xl space-y-3">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium uppercase tracking-[0.12em] text-black/80 hover:bg-black/5"
                  >
                    {link.label}
                  </Link>
                ))}
                {renderMobileCategoryTree(topCategories)}
                <div className="grid gap-2 pt-2 sm:flex sm:flex-wrap">
                  {user ? (
                    <>
                      <Link href="/profile" onClick={() => setMobileOpen(false)} className="inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm sm:w-auto">
                        Tài khoản
                      </Link>
                      {user.role === "admin" && (
                        <Link href="/admin" onClick={() => setMobileOpen(false)} className="inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm sm:w-auto">
                          Quản trị
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => { setMobileOpen(false); handleLogout(); }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm text-red-600 sm:w-auto"
                      >
                        <LogOut className="h-4 w-4" />
                        Đăng xuất
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex w-full items-center justify-center rounded-full border px-4 py-2 text-sm sm:w-auto">
                        Đăng nhập
                      </Link>
                      <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex w-full items-center justify-center rounded-full bg-black px-4 py-2 text-sm text-white sm:w-auto">
                        Đăng ký
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Search panel */}
        {searchOpen && (
          <div ref={searchPanelRef} className="border-t border-black/5 bg-white shadow-lg">
            <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-4">
              {/* Input */}
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearchSubmit(); }}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-base outline-none transition focus:border-black focus:ring-1 focus:ring-black sm:text-sm"
                />
                {searchLoading ? (
                  <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-gray-400" />
                ) : searchQuery ? (
                  <button onClick={() => setSearchQuery("")} className="absolute right-4 text-gray-400 hover:text-black">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-lg border border-black/8 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                  {suggestions.map((p) => {
                    const salePrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSearchOpen(false); router.push(`/products/${p.slug}`); }}
                        className="flex w-full items-center gap-3 border-b border-black/5 px-4 py-[10px] text-left transition-colors duration-200 hover:bg-[#f5f5f5] last:border-0"
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-black/8 bg-gray-100">
                          {p.coverImageUrl ? (
                            <Image src={p.coverImageUrl} alt={p.name} fill className="object-cover" sizes="48px" unoptimized />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{p.name}</p>
                          <div className="mt-0.5 flex items-center gap-2">
                            {salePrice ? (
                              <>
                                <span className="text-sm font-semibold text-black">{salePrice.toLocaleString("vi-VN")}₫</span>
                                <span className="text-xs text-gray-300 line-through">{p.price.toLocaleString("vi-VN")}₫</span>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-gray-900">{p.price.toLocaleString("vi-VN")}₫</span>
                            )}
                          </div>
                        </div>
                        <Search className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="flex w-full items-center justify-center gap-2 bg-gray-50 px-4 py-[10px] text-sm font-medium text-black/70 transition-colors duration-200 hover:bg-[#f5f5f5]"
                  >
                    <Search className="h-3.5 w-3.5" />
                    Xem tất cả kết quả cho &quot;{searchQuery}&quot;
                  </button>
                </div>
              )}

              {!searchLoading && searchQuery.trim() && suggestions.length === 0 && (
                <div className="mt-2 rounded-lg border border-black/8 bg-white px-4 py-6 text-center text-sm text-gray-400 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                  Không tìm thấy sản phẩm nào cho &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {showStoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-black/5 bg-[#F8F6F2] p-6 text-left shadow-2xl animate-in zoom-in-95 duration-200 sm:p-8">
            <button
              type="button"
              onClick={() => setShowStoreModal(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-sm transition hover:bg-[#0B1F1A] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-semibold text-[#1A1A1A] sm:text-2xl">
                Hệ thống cửa hàng
              </h3>
              <div className="h-[1px] bg-black/5" />
              
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#D4AF7A]/25 bg-white p-5 shadow-sm">
                  <h4 className="font-semibold text-[#1A1A1A] text-base">MANDRO STORE HÀ NỘI</h4>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    Địa chỉ: Số nhà 40, ngõ 438, đường La Phù, Thôn Thắng Lợi, Xã An Khánh, Thành Phố Hà Nội, Việt Nam
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Hotline: <span className="font-medium text-[#1A1A1A]">0934762018</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Giờ mở cửa: <span className="font-medium text-[#1A1A1A]">08:30 - 22:00</span> (Tất cả các ngày trong tuần)
                  </p>
                </div>
                
                <p className="text-xs text-slate-500 italic text-center">
                  Hiện MANDRO tập trung phát triển trải nghiệm mua sắm trực tuyến. Chúng tôi cam kết giao hàng nhanh chóng và hỗ trợ đổi trả dễ dàng.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
