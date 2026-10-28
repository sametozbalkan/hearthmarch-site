import type { APIRoute } from 'astro';
import { copyFor } from '../copy/index.ts';
import { DEFAULT_LANG } from '../i18n.ts';

/** A small web manifest: the name, the colours and the icons. */
export const GET: APIRoute = () => {
  const { site, home } = copyFor(DEFAULT_LANG);
  const manifest = {
    name: site.name,
    short_name: site.name,
    description: home.meta.description,
    lang: DEFAULT_LANG,
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#121838',
    theme_color: '#121838',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(`${JSON.stringify(manifest, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/manifest+json' },
  });
};
