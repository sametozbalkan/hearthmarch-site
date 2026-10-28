/**
 * The tale's audio files in `public/audio/`: each one's address (and its AAC copy), its own
 * length (s), its loop points in the file (s), its integrated loudness (LUFS), its true peak
 * (dBTP) and its size. Written by `scripts/encode-audio.ts`; do not edit.
 */
export interface SoundFile {
  url: string;
  alt?: string;
  duration: number;
  loop?: readonly [number, number];
  lufs: number;
  peak: number;
  bytes: number;
  altBytes?: number;
}

export const SOUND_FILES = {
  'bed/music': { url: '/audio/bed/music.webm', alt: '/audio/bed/music.m4a', duration: 89.5, loop: [0.5, 90], lufs: -16, peak: -3.2, bytes: 1373723, altBytes: 1475146 },
  'accent/tutulma-drums': { url: '/audio/accent/tutulma-drums.webm', alt: '/audio/accent/tutulma-drums.m4a', duration: 69.818188, loop: [0.5, 70.318188], lufs: -20.2, peak: -5, bytes: 848481, altBytes: 1157691 },
  'accent/dawn-sting': { url: '/audio/accent/dawn-sting.webm', alt: '/audio/accent/dawn-sting.m4a', duration: 4.2, lufs: -16.3, peak: -5.3, bytes: 75032, altBytes: 69168 },
  'voice/prologue': { url: '/audio/voice/prologue.mp3', duration: 7.85, lufs: -16.7, peak: -1.3, bytes: 63319 },
  'voice/hearth-1': { url: '/audio/voice/hearth-1.mp3', duration: 11.05, lufs: -16.5, peak: -2.1, bytes: 89024 },
  'voice/hearth-2': { url: '/audio/voice/hearth-2.mp3', duration: 11.72, lufs: -16.7, peak: -2.8, bytes: 94248 },
  'voice/day-1': { url: '/audio/voice/day-1.mp3', duration: 12.75, lufs: -16.8, peak: -2.8, bytes: 102608 },
  'voice/day-2': { url: '/audio/voice/day-2.mp3', duration: 10.24, lufs: -16.2, peak: -2.3, bytes: 82336 },
  'voice/steppe-1': { url: '/audio/voice/steppe-1.mp3', duration: 11.97, lufs: -16.2, peak: -1.5, bytes: 96338 },
  'voice/steppe-2': { url: '/audio/voice/steppe-2.mp3', duration: 13.02, lufs: -16.1, peak: -2.8, bytes: 104697 },
  'voice/night-1': { url: '/audio/voice/night-1.mp3', duration: 15, lufs: -16.6, peak: -2.8, bytes: 120580 },
  'voice/night-2': { url: '/audio/voice/night-2.mp3', duration: 10.65, lufs: -16.2, peak: -2.7, bytes: 85680 },
  'voice/eclipse-1': { url: '/audio/voice/eclipse-1.mp3', duration: 14.47, lufs: -16.2, peak: -2.4, bytes: 116191 },
  'voice/eclipse-2': { url: '/audio/voice/eclipse-2.mp3', duration: 11.05, lufs: -16.5, peak: -1.3, bytes: 89024 },
  'voice/goc-1': { url: '/audio/voice/goc-1.mp3', duration: 16.83, lufs: -16.3, peak: -1.7, bytes: 135208 },
  'voice/goc-2': { url: '/audio/voice/goc-2.mp3', duration: 9.41, lufs: -16.7, peak: -1.2, bytes: 75858 },
  'voice/together-1': { url: '/audio/voice/together-1.mp3', duration: 11.25, lufs: -16.4, peak: -1, bytes: 90487 },
  'voice/together-2': { url: '/audio/voice/together-2.mp3', duration: 3.63, lufs: -16.2, peak: -1.9, bytes: 29465 },
  'voice/outro': { url: '/audio/voice/outro.mp3', duration: 4.82, lufs: -16.5, peak: -1.2, bytes: 39078 },
} as const satisfies Record<string, SoundFile>;

export type SoundKey = keyof typeof SOUND_FILES;

/** The tiny Opus file that tells the player whether the browser decodes Opus. */
export const OPUS_PROBE = '/audio/probe.webm';
