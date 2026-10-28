/**
 * The site's icons, cut at build time from the game's icon (`src/assets/art/icon.png`).
 */
import sharp from 'sharp';
import { readArt } from './files.ts';

/**
 * The icon as a square PNG of `size` pixels. `zoom` above 1 keeps only the middle of the
 * icon, where its emblem is, which reads better at favicon sizes.
 */
export async function iconPng(size: number, zoom = 1): Promise<Uint8Array<ArrayBuffer>> {
  const source = readArt('icon.png');
  let image = sharp(source);
  if (zoom > 1) {
    const { width = 1024, height = 1024 } = await image.metadata();
    const side = Math.round(Math.min(width, height) / zoom);
    image = sharp(source).extract({
      left: Math.round((width - side) / 2),
      top: Math.round((height - side) / 2),
      width: side,
      height: side,
    });
  }
  const png = await image.resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();
  return new Uint8Array(png);
}

/** An .ico file holding the given PNG images (the PNG-in-ICO format every current browser reads). */
export function icoFromPngs(images: readonly { size: number; png: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const HEADER = 6;
  const ENTRY = 16;
  let offset = HEADER + ENTRY * images.length;
  const total = images.reduce((sum, image) => sum + image.png.length, offset);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  images.forEach((image, i) => {
    const at = HEADER + i * ENTRY;
    const side = image.size >= 256 ? 0 : image.size;
    view.setUint8(at, side);
    view.setUint8(at + 1, side);
    view.setUint8(at + 2, 0);
    view.setUint8(at + 3, 0);
    view.setUint16(at + 4, 1, true);
    view.setUint16(at + 6, 32, true);
    view.setUint32(at + 8, image.png.length, true);
    view.setUint32(at + 12, offset, true);
    out.set(image.png, offset);
    offset += image.png.length;
  });
  return out;
}
