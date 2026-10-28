import type { APIRoute } from 'astro';
import { iconPng } from '../lib/icons.ts';

/** The web manifest's small icon. */
export const GET: APIRoute = async () => new Response(await iconPng(192), { headers: { 'Content-Type': 'image/png' } });
