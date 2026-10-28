/**
 * Build-time helpers for the art files in `src/assets/art/`.
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** The folder of the art sources. Astro builds from the project root. */
const ART_DIR = join(process.cwd(), 'src', 'assets', 'art');

/** The bytes of an art source file. */
export function readArt(name: string): Buffer {
  return readFileSync(join(ART_DIR, name));
}

/** The size of an art source file, written for people: "970 KB", "2.0 MB". */
export function artSizeLabel(name: string): string {
  const bytes = statSync(join(ART_DIR, name)).size;
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1000)} KB`;
}
