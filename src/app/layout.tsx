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
        default: "MANDRO - Giày Tây Nam Cao Cấp, Loafer, Giày Lười Công Sở",
        template: "%s | MANDRO",
    },
    description: "MANDRO - Giày tây nam, loafer, giày lười công sở da thật cao cấp. Moccasin, Derby, Mules, Sandal. Giao hàng toàn quốc.",
    keywords: [
        "giày tây nam",
        "giày lười nam",
        "loafer nam",
        "giày derby",
        "giày công sở nam",
        "giày da nam cao cấp",
        "MANDRO",
    ],
    icons: {
        icon: "/favicon.ico",
        apple: "/apple-touch-icon.png",
    },
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
    openGraph: {
        title: "MANDRO - Giày Tây Nam Cao Cấp, Loafer, Giày Lười Công Sở",
        description: "Giày tây nam, loafer, giày lười công sở da thật cao cấp. Giao hàng toàn quốc.",
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
        title: "MANDRO - Giày Tây Nam Cao Cấp, Loafer, Giày Lười Công Sở",
        description: "Giày tây nam, loafer, giày lười công sở da thật cao cấp.",
        images: ["/og-image.jpg"],
    },
};

const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MANDRO",
    url: "https://mandro.net",
    logo: "https://mandro.net/og-image.jpg",
    description: "Cửa hàng giày tây nam, loafer, giày lười công sở da thật cao cấp",
    address: {
        "@type": "PostalAddress",
        streetAddress: "Số nhà 40, ngõ 438, đường La Phù, Thôn Thắng Lợi, Xã An Khánh",
        addressLocality: "Hà Nội",
        addressCountry: "VN",
    },
    contactPoint: {
        "@type": "ContactPoint",
        telephone: "+84934762018",
        contactType: "customer service",
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi" suppressHydrationWarning>
        <body className="min-h-full antialiased font-sans">
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <GoogleOAuthProvider clientId={googleClientId}>
            <RealtimeSocketProvider>{children}</RealtimeSocketProvider>
        </GoogleOAuthProvider>
        <Toaster richColors position="top-right" duration={7000} />
        </body>
        </html>
    );
}