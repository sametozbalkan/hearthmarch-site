import type { APIRoute } from 'astro';
import { icoFromPngs, iconPng } from '../lib/icons.ts';

/** The favicon: the icon's emblem at 16, 32 and 48 pixels. */
export const GET: APIRoute = async () => {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(async (size) => ({ size, png: await iconPng(size, 1.35) })));
  return new Response(icoFromPngs(images), { headers: { 'Content-Type': 'image/x-icon' } });
};
