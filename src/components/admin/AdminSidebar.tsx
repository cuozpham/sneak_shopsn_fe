"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Star,
  Tag, Image as ImageIcon, LogOut, ChevronLeft,
  MessageSquare, Truck, Menu, X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { chatApi } from "@/lib/api/chat";
import { dashboardApi } from "@/lib/api/dashboard";
import { cn } from "@/lib/utils";
import { useRealtimeSocket } from "@/lib/useRealtimeSocket";

const navItems = [
  { href: "/admin", label: "Bảng điều khiển", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/shipping-fees", label: "Phí vận chuyển", icon: Truck },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/reviews", label: "Đánh giá", icon: Star },
  { href: "/admin/categories", label: "Danh mục", icon: Tag },
  { href: "/admin/banners", label: "Ảnh banner", icon: ImageIcon },
  { href: "/admin/chat", label: "Chat hỗ trợ", icon: MessageSquare },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const router = useRouter();
  const [chatUnread, setChatUnread] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadCounts = useCallback(async () => {
    if (!token) {
      setChatUnread(0);
      setPendingOrders(0);
      setNewUsersToday(0);
      return;
    }
    try {
      const [chatRes, dashRes] = await Promise.all([
        chatApi.adminUnreadCount(),
        dashboardApi.get(7),
      ]);
      setChatUnread(chatRes.data.result ?? 0);
      setPendingOrders(Number(dashRes.data.result?.pendingOrders ?? 0));
      setNewUsersToday(Number(dashRes.data.result?.newUsersToday ?? 0));
    } catch {
      setChatUnread(0);
      setPendingOrders(0);
      setNewUsersToday(0);
    }
  }, [token]);

  useRealtimeSocket(Boolean(user && token), (event) => {
    if (event.channel === "notification" || event.channel === "chat" || event.channel === "dashboard") {
      void loadCounts();
    }
  });

  useEffect(() => {
    loadCounts();
    const timer = setInterval(loadCounts, 30000);
    return () => clearInterval(timer);
  }, [loadCounts]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className="relative z-40 flex-shrink-0 lg:min-h-screen lg:w-56">
        {/* Mobile header bar */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-4 py-3 lg:hidden">
          <div className="min-w-0">
            <h1 className="font-black text-white">MANDRO ADMIN</h1>
            {user && <p className="truncate text-xs text-gray-400">{user.email}</p>}
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="ml-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-40 border-b border-gray-700 bg-gray-900 shadow-xl transition-all duration-200 lg:hidden",
            mobileOpen ? "max-h-screen opacity-100" : "max-h-0 overflow-hidden opacity-0 pointer-events-none"
          )}
        >
          <nav className="space-y-0.5 p-2">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const badge =
                href === "/admin/chat" ? chatUnread :
                href === "/admin/orders" ? pendingOrders :
                href === "/admin/users" ? newUsersToday :
                0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                    active ? "bg-white text-gray-900" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                  {badge > 0 && (
                    <span className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="grid grid-cols-2 gap-2 border-t border-gray-700 p-2">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Về trang chủ
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-red-900 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden min-h-screen flex-col border-r border-gray-800 bg-gray-900 text-gray-300 lg:flex">
          <div className="border-b border-gray-700 px-4 py-5">
            <h1 className="font-black text-white text-lg">MANDRO ADMIN</h1>
            {user && <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p>}
          </div>

          <nav className="flex flex-1 flex-col gap-0 space-y-0.5 p-2">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const badge =
                href === "/admin/chat" ? chatUnread :
                href === "/admin/orders" ? pendingOrders :
                href === "/admin/users" ? newUsersToday :
                0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative",
                    active ? "bg-white text-gray-900" : "hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                  {badge > 0 && (
                    <span className="ml-auto inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="space-y-1 border-t border-gray-700 p-2">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" /> Về trang chủ
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-red-900 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
