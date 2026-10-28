/**
 * What the tale sounds like. Change the sound here; the player in `src/scripts/sound.ts`
 * reads only this data.
 *
 * - The bed: quiet music under the whole tale, a kopuz and a ney, looping seamlessly. It
 *   starts by itself (on the visitor's first press or key where the browser asks for one),
 *   fading in to a fifth of its full volume; the control at the top right stops and restarts
 *   it, and a slider beside it sets its volume.
 * - The accents: a few short, quiet sounds from the game over the bed, at a scene or at a
 *   moment of the finale. They follow the bed: its volume, and whether it plays.
 * - The narration: the ozan's clips, read as each scene takes the stage once the visitor asks
 *   for them; at full level, with the bed and the accents ducking under him.
 *
 * Levels are loudness targets (LUFS) at full bed volume; the narration plays at about -16.
 */
import type { SoundKey } from './sound-files.ts';
import type { FinaleMoment, SceneId } from './tale.ts';

/** A sound brought to a loudness target, from its file's measured loudness. */
export interface Part {
  key: SoundKey;
  lufs: number;
}

/** An accent fades in when its scene takes the stage and out when it leaves. */
export interface Accent extends Part {
  fadeIn: number;
  fadeOut: number;
}

/** A scene's narration: its clips in order, and when the first one starts. */
export interface Narration {
  clips: readonly SoundKey[];
  /** Seconds between the scene taking the stage and its first clip. */
  delay?: number;
  /** The finale waits for its closing line to show before the ozan reads it. */
  onMoment?: FinaleMoment;
}

/** The bed, looping under the whole tale: the music alone. */
export const BED: readonly Part[] = [{ key: 'bed/music', lufs: -16 }];

/** The bed's volume when it starts, as a share of its full level (a linear gain). */
export const BED_VOLUME = 0.2;
/** The bed's fade-in from silence, in seconds. */
export const BED_FADE_IN = 3;
/** How long the bed takes to fade out when it is stopped, in seconds. */
export const BED_FADE_OUT = 0.6;
/** How far the bed and the accents duck under the narration. */
export const DUCK_DB = -10;

/** The accents of the scenes: the Tutulma's drums under chapter V. */
export const SCENE_ACCENTS: Partial<Record<SceneId, readonly Accent[]>> = {
  eclipse: [{ key: 'accent/tutulma-drums', lufs: -19, fadeIn: 3, fadeOut: 2.5 }],
};

/** The accents of the finale's moments: dawn's sting as the moon clears. */
export const MOMENT_ACCENTS: Partial<Record<FinaleMoment, Part>> = {
  moonClear: { key: 'accent/dawn-sting', lufs: -17 },
};

export const NARRATION: Record<SceneId, Narration> = {
  prologue: { clips: ['voice/prologue'], delay: 0.6 },
  hearth: { clips: ['voice/hearth-1', 'voice/hearth-2'] },
  day: { clips: ['voice/day-1', 'voice/day-2'] },
  steppe: { clips: ['voice/steppe-1', 'voice/steppe-2'] },
  night: { clips: ['voice/night-1', 'voice/night-2'] },
  eclipse: { clips: ['voice/eclipse-1', 'voice/eclipse-2'], delay: 1.6 },
  goc: { clips: ['voice/goc-1', 'voice/goc-2'] },
  together: { clips: ['voice/together-1', 'voice/together-2'] },
  finale: { clips: ['voice/outro'], onMoment: 'outroVoice' },
};

/** The scenes in order, for loading the next scene's sound ahead of time. */
export const SCENE_ORDER: readonly SceneId[] = ['prologue', 'hearth', 'day', 'steppe', 'night', 'eclipse', 'goc', 'together', 'finale'];
