import type { APIRoute } from 'astro';
import { iconPng } from '../lib/icons.ts';

/** The web manifest's large icon; its emblem sits inside the middle two thirds, so masks never cut it. */
export const GET: APIRoute = async () => new Response(await iconPng(512), { headers: { 'Content-Type': 'image/png' } });
