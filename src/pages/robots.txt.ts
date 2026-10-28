import type { APIRoute } from 'astro';
import { SITE_URL } from '../config.ts';

/** Every crawler is welcome; the sitemap lists the pages. */
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
