import type { APIRoute } from 'astro';
import { readArt } from '../lib/files.ts';

/** The link card that Open Graph and Twitter cards show, at a stable address. */
export const GET: APIRoute = () => new Response(new Uint8Array(readArt('link_card.jpg')), { headers: { 'Content-Type': 'image/jpeg' } });
