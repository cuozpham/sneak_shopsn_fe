import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { RealtimeSocketProvider } from "@/components/realtime/RealtimeSocketProvider";

const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "994384115409-obloh9pij7cr2uautentb5poc924rsnv.apps.googleusercontent.com";

export const metadata: Metadata = {
  metadataBase: new URL("https://mandro.net"),
  title: {
    default: "MANDRO - Giày Sneaker Chính Hãng",
    template: "%s | MANDRO",
  },
  description: "Cửa hàng giày sneaker chính hãng. Đa dạng mẫu mã, giao hàng toàn quốc.",
  keywords: [
    "giày sneaker",
    "giày sneaker nam",
    "giày thể thao nam chính hãng",
    "sneaker Nike Adidas",
    "MANDRO",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://mandro.net",
  },
  openGraph: {
    title: "MANDRO - Giày Sneaker Chính Hãng",
    description: "Cửa hàng giày sneaker chính hãng. Đa dạng mẫu mã, giao hàng toàn quốc.",
    url: "https://mandro.net",
    siteName: "MANDRO",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MANDRO - Giày Sneaker Chính Hãng",
    description: "Cửa hàng giày sneaker chính hãng.",
    images: ["/og-image.jpg"],
  },
  // verification: {
  //   google: "dán mã xác minh Google Search Console vào đây sau",
  // },
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
<script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
        __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MANDRO",
            url: "https://mandro.net",
            logo: "https://mandro.net/logo.png",
        }),
    }}
/>