import type { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";

const backendBaseUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.APP_BACKEND_BASE_URL ||
    "https://sneakshop-production.up.railway.app";

async function getProduct(slug: string) {
    const res = await fetch(`${backendBaseUrl}/api/products/slug/${slug}`, {
        cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
}

export async function generateMetadata({
                                           params,
                                       }: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProduct(slug);

    if (!product) {
        return { title: "Sản phẩm không tồn tại" };
    }

    return {
        title: product.name,
        description: product.description?.slice(0, 160) || `Mua ${product.name} chính hãng tại MANDRO`,
        alternates: {
            canonical: `https://mandro.net/products/${slug}`,
        },
        openGraph: {
            title: product.name,
            description: product.description?.slice(0, 160),
            images: product.coverImageUrl ? [product.coverImageUrl] : [],
        },
    };
}

export default function Page() {
    return <ProductDetailClient />;
}