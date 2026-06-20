import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 lg:flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
