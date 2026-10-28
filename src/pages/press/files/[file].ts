import type { APIRoute, GetStaticPaths } from 'astro';
import { PRESS_FILES } from '../../../art.ts';
import { readArt } from '../../../lib/files.ts';

/** The press kit's files at full size: the art sources as they are, under stable names. */
export const getStaticPaths = (() => Object.keys(PRESS_FILES).map((file) => ({ params: { file } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) => {
  const source = PRESS_FILES[params.file ?? ''];
  if (!source) {
    return new Response(null, { status: 404 });
  }
  const type = source.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return new Response(new Uint8Array(readArt(source)), { headers: { 'Content-Type': type } });
};
