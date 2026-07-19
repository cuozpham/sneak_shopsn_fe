import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const staticUrls: MetadataRoute.Sitemap = [
        {
            url: 'https://mandro.net',
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: 'https://mandro.net/products',
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.9,
        },
    ];

    try {
        const backendBaseUrl =
            process.env.NEXT_PUBLIC_API_URL ||
            process.env.APP_BACKEND_BASE_URL ||
            "https://sneakshop-production.up.railway.app";

        const res = await fetch(`${backendBaseUrl}/api/products?status=active&size=1000&page=0&sort=newest`);
        if (!res.ok) {
            console.error('Sitemap: API tra ve loi', res.status, await res.text());
            return staticUrls;
        }
        const data = await res.json();
        const products = data.result?.content ?? data.content ?? [];

        const productUrls: MetadataRoute.Sitemap = products.map((product: any) => ({
            url: `https://mandro.net/products/${product.slug}`,
            lastModified: new Date(product.updatedAt ?? Date.now()),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        return [...staticUrls, ...productUrls];
    } catch (error) {
        console.error('Không thể lấy sản phẩm cho sitemap:', error);
        return staticUrls;
    }
}