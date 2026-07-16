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
        const res = await fetch('https://api.mandro.net/api/products?status=active&size=1000');
        if (!res.ok) return staticUrls;

        const data = await res.json();
        const products = data.content ?? data;

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