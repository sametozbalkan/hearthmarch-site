/**
 * The site's art: every image in `src/assets/art/`, the seven stations in the tale's order,
 * and the files the press kit offers at full size.
 */
import type { ImageMetadata, ImageOutputFormat } from 'astro';
import type { StationId } from './copy/types.ts';

import c1Dragon from './assets/art/c1_dragon.png';
import c2FeltClouds from './assets/art/c2_felt_clouds.png';
import c3Standard from './assets/art/c3_standard.png';
import c4Huma from './assets/art/c4_huma.png';
import icon from './assets/art/icon.png';
import keyArt from './assets/art/key_art.jpg';
import logo from './assets/art/logo.png';
import s1OcakFelt from './assets/art/s1_ocak_felt.jpg';
import s2DayMiniature from './assets/art/s2_day_miniature.jpg';
import s3AnimalGold from './assets/art/s3_animal_gold.jpg';
import s4NightStele from './assets/art/s4_night_stele.jpg';
import s5TutulmaFresco from './assets/art/s5_tutulma_fresco.jpg';
import s6GocKilim from './assets/art/s6_goc_kilim.jpg';
import s7TogetherPetroglyph from './assets/art/s7_together_petroglyph.jpg';
import vista from './assets/art/vista.jpg';

export { c1Dragon, c2FeltClouds, c3Standard, c4Huma, icon, keyArt, logo, vista };

/**
 * The formats every <Picture> is made in: AVIF first, WebP for the browsers without it.
 * Both keep the cut-outs' transparency.
 */
export const PICTURE_FORMATS: { formats: ImageOutputFormat[]; fallbackFormat: ImageOutputFormat } = {
  formats: ['avif'],
  fallbackFormat: 'webp',
};

/** How a station hangs its work: beside the text, or as the kilim's full-width runner. */
export type StationShape = 'wide' | 'square' | 'runner';

/** The time of day a station's wall is painted in. */
export type Band = 'dawn' | 'day' | 'dusk' | 'night' | 'eclipse' | 'ember' | 'deep';

export interface Station {
  id: StationId;
  image: ImageMetadata;
  shape: StationShape;
  band: Band;
  /** The press kit's file name for the work. */
  fileName: string;
}

/** The seven stations, in the order the tale tells them. */
export const STATIONS: readonly Station[] = [
  { id: 'hearth', image: s1OcakFelt, shape: 'wide', band: 'dawn', fileName: 'hearthmarch-1-hearth-felt.jpg' },
  { id: 'day', image: s2DayMiniature, shape: 'wide', band: 'day', fileName: 'hearthmarch-2-day-miniature.jpg' },
  { id: 'steppe', image: s3AnimalGold, shape: 'square', band: 'dusk', fileName: 'hearthmarch-3-steppe-gold.jpg' },
  { id: 'night', image: s4NightStele, shape: 'wide', band: 'night', fileName: 'hearthmarch-4-night-stele.jpg' },
  { id: 'eclipse', image: s5TutulmaFresco, shape: 'wide', band: 'eclipse', fileName: 'hearthmarch-5-eclipse-mural.jpg' },
  { id: 'goc', image: s6GocKilim, shape: 'runner', band: 'ember', fileName: 'hearthmarch-6-goc-kilim.jpg' },
  { id: 'together', image: s7TogetherPetroglyph, shape: 'wide', band: 'deep', fileName: 'hearthmarch-7-together-rock-art.jpg' },
];

/** The source file of every image the press kit offers, by its published file name. */
export const PRESS_FILES: Readonly<Record<string, string>> = {
  'hearthmarch-logo.png': 'logo.png',
  'hearthmarch-icon.png': 'icon.png',
  'hearthmarch-key-art.jpg': 'key_art.jpg',
  'hearthmarch-ridge.jpg': 'vista.jpg',
  'hearthmarch-1-hearth-felt.jpg': 's1_ocak_felt.jpg',
  'hearthmarch-2-day-miniature.jpg': 's2_day_miniature.jpg',
  'hearthmarch-3-steppe-gold.jpg': 's3_animal_gold.jpg',
  'hearthmarch-4-night-stele.jpg': 's4_night_stele.jpg',
  'hearthmarch-5-eclipse-mural.jpg': 's5_tutulma_fresco.jpg',
  'hearthmarch-6-goc-kilim.jpg': 's6_goc_kilim.jpg',
  'hearthmarch-7-together-rock-art.jpg': 's7_together_petroglyph.jpg',
};

/** The press kit's path for a published file name. */
export function pressFilePath(fileName: string): string {
  return `/press/files/${fileName}`;
}
