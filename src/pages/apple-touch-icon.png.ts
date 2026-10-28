import type { APIRoute } from 'astro';
import { iconPng } from '../lib/icons.ts';

/** The home-screen icon for iPhones and iPads; the system rounds its corners. */
export const GET: APIRoute = async () => new Response(await iconPng(180), { headers: { 'Content-Type': 'image/png' } });
