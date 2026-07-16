import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/api/', '/cart', '/checkout', '/account/'],
        },
        sitemap: 'https://mandro.net/sitemap.xml',
    }
}