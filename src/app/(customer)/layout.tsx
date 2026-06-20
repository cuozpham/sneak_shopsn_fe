"use client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
