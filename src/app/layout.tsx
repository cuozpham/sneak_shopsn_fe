import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { RealtimeSocketProvider } from "@/components/realtime/RealtimeSocketProvider";

const googleClientId =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "994384115409-obloh9pij7cr2uautentb5poc924rsnv.apps.googleusercontent.com";

export const metadata: Metadata = {
  title: "MANDRO - Thời trang nam cao cấp",
  description: "Cửa hàng giày sneaker chính hãng",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-full antialiased font-sans">
        <GoogleOAuthProvider clientId={googleClientId}>
          <RealtimeSocketProvider>{children}</RealtimeSocketProvider>
        </GoogleOAuthProvider>
        <Toaster richColors position="top-right" duration={7000} />
      </body>
    </html>
  );
}
