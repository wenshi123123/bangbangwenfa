import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

const publicRoutes = [
  '/',
  '/consult',
  '/civil',
  '/register',
  '/about',
  '/privacy-policy',
  '/user-agreement',
  '/lawyer-commitment',
  '/lawyer-entry-agreement',
  '/lawyer',
  '/lawyer/join',
  '/lawyer/login',
  '/guardian',
  '/pay',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return publicRoutes.map((path) => ({
    url: new URL(path, siteUrl).toString(),
    lastModified,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
