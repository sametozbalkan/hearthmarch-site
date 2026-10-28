import type { APIRoute } from 'astro';
import { SITE_URL } from '../config.ts';
import { LANGS, localePath } from '../i18n.ts';

/** The pages every language has, by their path in the language's tree. */
const PAGES = ['/', '/press/', '/privacy/'];

/** The sitemap: every page in every language. */
export const GET: APIRoute = () => {
  const urls = LANGS.flatMap((lang) => PAGES.map((path) => `  <url><loc>${new URL(localePath(lang, path), SITE_URL).href}</loc></url>`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
