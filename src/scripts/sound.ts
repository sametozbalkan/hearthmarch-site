/**
 * The tale's sound. What plays where is data, in `src/sound.ts`.
 *
 * - The music bed starts by itself. The page opens its Web Audio context once it has
 *   loaded; where the browser allows sound, the bed fades in at once. Elsewhere (the usual
 *   first visit) it starts on the visitor's first press or key anywhere on the page. The
 *   press only starts the bed; whatever it was pressed for still happens, and the narration
 *   never starts with it. The switch at the top right stops and restarts the bed.
 * - The ozan's narration plays only when the visitor asks for it, on its own switch. He reads
 *   each scene as it takes the stage, the bed ducking under him; a scene heard to the end is
 *   not read again unless its replay control is pressed.
 * - Nothing loads before the context runs: then the bed, then each scene's sound and the
 *   next scene's ahead of time. The loops are Opus where the browser decodes it and AAC
 *   elsewhere, looping between pads of their own sound, so they repeat without a gap.
 * - Nothing is stored: every visit starts the same way, the bed at its default volume.
 */
import {
  BED,
  BED_FADE_IN,
  BED_FADE_OUT,
  BED_VOLUME,
  DUCK_DB,
  MOMENT_ACCENTS,
  NARRATION,
  SCENE_ACCENTS,
  SCENE_ORDER,
  type Accent,
  type Part,
} from '../sound.ts';
import { OPUS_PROBE, SOUND_FILES, type SoundFile, type SoundKey } from '../sound-files.ts';
import type { FinaleMoment, SceneId } from '../tale.ts';
import type { OnStage, Stage } from './stage.ts';

const dbToGain = (db: number): number => 10 ** (db / 20);

/** A part's gain, from its file's measured loudness to its target. */
const partGain = (part: Part): number => dbToGain(part.lufs - SOUND_FILES[part.key].lufs);

/** Ramps a parameter with an equal-power curve, from where it is now. */
function ramp(ctx: BaseAudioContext, param: AudioParam, to: number, seconds: number): void {
  const start = ctx.currentTime;
  const from = param.value;
  param.cancelScheduledValues(start);
  param.setValueAtTime(from, start);
  const steps = 10;
  for (let i = 1; i <= steps; i += 1) {
    const x = i / steps;
    const shape = to > from ? Math.sin((x * Math.PI) / 2) : 1 - Math.cos((x * Math.PI) / 2);
    param.linearRampToValueAtTime(from + (to - from) * shape, start + seconds * x);
  }
}

interface Playing {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

interface PlayingClip extends Playing {
  mark: Element | null;
}

/**
 * What the music's switch shows: `on` only while the music is heard; `starting` from the
 * moment it is asked for until it is heard (loading); `off` otherwise, including while the
 * browser waits for the visitor's first press or key.
 */
export type MusicState = 'off' | 'starting' | 'on';

/** Calls back on a change of the music's or the narration's state, for the controls. */
type Listener = (music: MusicState, narration: boolean) => void;

class Sound {
  readonly ctx: AudioContext;
  private readonly stage: Stage;
  private readonly listener: Listener;
  private readonly master: GainNode;
  /** The bed's volume, set by its slider. The accents play under it too. */
  private readonly bedVolume: GainNode;
  /** Ducks the bed and the accents under the narration. */
  private readonly duckBus: GainNode;
  private readonly voiceBus: GainNode;
  private readonly bytes = new Map<string, Promise<ArrayBuffer>>();
  private readonly buffers = new Map<SoundKey, Promise<AudioBuffer>>();
  private readonly heard = new Set<SceneId>();
  private readonly resumeAt = new Map<SceneId, number>();
  private readonly accents = new Map<SoundKey, Playing>();
  private bed: Playing[] = [];
  private bedLoading = false;
  private opus: Promise<boolean> | null = null;
  private scene: OnStage;
  private clip: PlayingClip | null = null;
  private voiceToken = 0;
  private timers: number[] = [];
  private volume = BED_VOLUME;
  /** What the visitor wants: the bed is on unless stopped; the narration off unless asked for. */
  bedWanted = true;
  narrationWanted = false;

  constructor(stage: Stage, listener: Listener) {
    this.stage = stage;
    this.listener = listener;
    this.scene = stage.current();
    this.ctx = new AudioContext({ latencyHint: 'playback' });
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.duckBus = this.ctx.createGain();
    this.duckBus.connect(this.master);
    this.bedVolume = this.ctx.createGain();
    this.bedVolume.gain.value = 0;
    this.bedVolume.connect(this.duckBus);
    this.voiceBus = this.ctx.createGain();
    this.voiceBus.connect(this.master);
    this.ctx.addEventListener('statechange', () => {
      this.sync();
      this.notify();
    });
  }

  get running(): boolean {
    return this.ctx.state === 'running';
  }

  /** What the music's switch shows. */
  get music(): MusicState {
    if (!this.running || !this.bedWanted) return 'off';
    if (this.bed.length > 0) return 'on';
    return this.bedLoading ? 'starting' : 'off';
  }

  /** Tells the controls what is heard now. */
  notify(): void {
    this.listener(this.music, this.narrationWanted);
  }

  /** Inside a press or a key: asks the browser for sound (iOS also needs a sound played). */
  unlock(): void {
    if (this.running) return;
    const unlock = this.ctx.createBufferSource();
    unlock.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    unlock.connect(this.ctx.destination);
    unlock.start(0);
    void this.ctx.resume().catch(() => undefined);
  }

  /** Brings what plays in line with what is wanted, once the browser allows sound. */
  sync(): void {
    if (!this.running) return;
    if (this.bedWanted) this.startBed();
    this.setAccents();
  }

  /**
   * The music's switch acts on what is heard: it stops the music that plays, and starts it
   * otherwise, the press itself being the gesture that lets the browser play sound.
   */
  toggleBed(): void {
    if (this.music === 'on') {
      this.bedWanted = false;
      this.stopBed();
    } else {
      this.bedWanted = true;
      this.unlock();
      this.sync();
    }
    this.notify();
  }

  /** The narration's switch. */
  toggleNarration(): void {
    this.narrationWanted = !this.narrationWanted;
    if (this.narrationWanted) {
      // Asked for: on iOS the voice plays even with the ringer off, like any media.
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
      this.unlock();
      this.sync();
      const scene = this.scene;
      if (scene !== 'hero' && !NARRATION[scene].onMoment) {
        this.heard.delete(scene);
        this.later(() => this.playClip(scene, this.resumeAt.get(scene) ?? 0), 300);
      }
    } else {
      this.clearTimers();
      this.stopVoice(0.35);
    }
    this.showReplay();
    this.prepare(this.scene);
    this.notify();
  }

  /** The bed's volume (0 to 1). */
  setVolume(volume: number): void {
    this.volume = volume;
    if (this.bed.length > 0) ramp(this.ctx, this.bedVolume.gain, volume, 0.08);
  }

  /** The visitor moves on: the ozan stops within half a second. */
  leave(): void {
    this.clearTimers();
    this.stopVoice(0.35);
  }

  /** Another scene takes the stage. */
  enter(id: OnStage): void {
    this.scene = id;
    this.clearTimers();
    this.stopVoice(0.35);
    this.setAccents();
    if (this.narrationWanted && id !== 'hero') {
      const narration = NARRATION[id];
      if (!narration.onMoment && !this.heard.has(id)) {
        this.later(() => this.playClip(id, this.resumeAt.get(id) ?? 0), (narration.delay ?? 1.1) * 1000);
      }
    }
    this.showReplay();
    this.prepare(id);
  }

  /** The finale's moments: dawn's sting as the moon clears, the ozan with the closing line. */
  moment(moment: FinaleMoment): void {
    if (this.scene !== 'finale' || !this.running) return;
    const accent = MOMENT_ACCENTS[moment];
    if (accent && this.bedWanted) this.playOnce(accent);
    if (this.narrationWanted && NARRATION.finale.onMoment === moment && !this.heard.has('finale')) this.playClip('finale', 0);
  }

  /** The replay control: reads the scene again from its first clip. */
  replay(id: SceneId): void {
    if (!this.narrationWanted) return;
    this.unlock();
    this.heard.delete(id);
    this.resumeAt.delete(id);
    this.stopVoice(0.2);
    this.later(() => this.playClip(id, 0), 250);
  }

  /** The tab is hidden or shown again. */
  pause(hidden: boolean): void {
    if (hidden) {
      if (!this.running) return;
      ramp(this.ctx, this.master.gain, 0, 0.25);
      window.setTimeout(() => {
        if (document.hidden) void this.ctx.suspend();
      }, 300);
    } else if (this.bedWanted || this.narrationWanted) {
      void this.ctx
        .resume()
        .then(() => ramp(this.ctx, this.master.gain, 1, 0.6))
        .catch(() => undefined);
    }
  }

  /* ---------- The bed and the accents ---------- */

  private startBed(): void {
    if (this.bed.length > 0 || this.bedLoading) return;
    this.bedLoading = true;
    this.notify();
    void Promise.all(BED.map((part) => this.load(part.key)))
      .then((buffers) => {
        this.bedLoading = false;
        if (!this.bedWanted || !this.running || this.bed.length > 0) {
          this.notify();
          return;
        }
        // Every part starts at the same instant; then the whole bed fades in from silence.
        const when = this.ctx.currentTime + 0.05;
        this.bed = BED.map((part, i) => this.loop(part, buffers[i], when, partGain(part)));
        const gain = this.bedVolume.gain;
        gain.cancelScheduledValues(when);
        gain.setValueAtTime(0, when);
        gain.linearRampToValueAtTime(this.volume * 0.45, when + BED_FADE_IN * 0.6);
        gain.linearRampToValueAtTime(this.volume, when + BED_FADE_IN);
        this.setAccents();
        this.notify();
      })
      .catch(() => {
        this.bedLoading = false;
        this.notify();
      });
  }

  private stopBed(): void {
    const playing = [...this.bed, ...this.accents.values()];
    this.bed = [];
    this.accents.clear();
    ramp(this.ctx, this.bedVolume.gain, 0, BED_FADE_OUT);
    window.setTimeout(() => {
      for (const p of playing) this.dispose(p);
    }, BED_FADE_OUT * 1000 + 100);
  }

  /** The scene's accents play while the bed does; others fade out. */
  private setAccents(): void {
    const wanted = this.bed.length > 0 && this.scene !== 'hero' ? (SCENE_ACCENTS[this.scene] ?? []) : [];
    const keys = new Set(wanted.map((a) => a.key));
    for (const [key, playing] of this.accents) {
      if (keys.has(key)) continue;
      this.accents.delete(key);
      const fadeOut = this.accentOf(key)?.fadeOut ?? 2;
      ramp(this.ctx, playing.gain.gain, 0, fadeOut);
      window.setTimeout(() => this.dispose(playing), fadeOut * 1000 + 120);
    }
    for (const accent of wanted) {
      if (this.accents.has(accent.key)) continue;
      const scene = this.scene;
      void this.load(accent.key)
        .then((buffer) => {
          if (this.scene !== scene || this.bed.length === 0 || this.accents.has(accent.key)) return;
          const playing = this.loop(accent, buffer, this.ctx.currentTime + 0.05, 0);
          ramp(this.ctx, playing.gain.gain, partGain(accent), accent.fadeIn);
          this.accents.set(accent.key, playing);
        })
        .catch(() => undefined);
    }
  }

  private accentOf(key: SoundKey): Accent | undefined {
    for (const list of Object.values(SCENE_ACCENTS)) {
      const found = list?.find((a) => a.key === key);
      if (found) return found;
    }
    return undefined;
  }

  /** Starts a looping part under the bed's volume. */
  private loop(part: Part, buffer: AudioBuffer | undefined, when: number, gain: number): Playing {
    const source = this.ctx.createBufferSource();
    const node = this.ctx.createGain();
    node.gain.value = gain;
    source.connect(node).connect(this.bedVolume);
    const file: SoundFile = SOUND_FILES[part.key];
    const loop = file.loop;
    if (buffer) {
      source.buffer = buffer;
      if (loop) {
        source.loop = true;
        source.loopStart = loop[0];
        source.loopEnd = Math.min(loop[1], buffer.duration);
      }
      source.start(when, loop?.[0] ?? 0);
    }
    return { source, gain: node };
  }

  private playOnce(part: Part): void {
    void this.load(part.key)
      .then((buffer) => {
        if (this.bed.length === 0) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = partGain(part);
        source.connect(gain).connect(this.bedVolume);
        source.start(this.ctx.currentTime + 0.03);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
      })
      .catch(() => undefined);
  }

  private dispose(playing: Playing): void {
    try {
      playing.source.stop();
    } catch {
      // Already stopped, or never started.
    }
    playing.source.disconnect();
    playing.gain.disconnect();
  }

  /* ---------- The ozan ---------- */

  private playClip(scene: SceneId, index: number): void {
    const clips = NARRATION[scene].clips;
    const key = clips[index];
    if (!key || !this.narrationWanted) return;
    const token = ++this.voiceToken;
    void this.load(key)
      .then((buffer) => {
        if (token !== this.voiceToken || !this.narrationWanted || this.scene !== scene || !this.running) return;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        source.connect(gain).connect(this.voiceBus);
        source.start(this.ctx.currentTime + 0.03);
        const mark = this.markFor(scene, index);
        mark?.classList.add('is-reading');
        this.clip = { source, gain, mark };
        this.resumeAt.set(scene, index);
        this.duck(true);
        source.onended = () => {
          if (this.clip?.source !== source) return;
          mark?.classList.remove('is-reading');
          this.clip = null;
          source.disconnect();
          gain.disconnect();
          const next = index + 1;
          if (next < clips.length) {
            this.resumeAt.set(scene, next);
            this.later(() => this.playClip(scene, next), 650);
          } else {
            this.heard.add(scene);
            this.resumeAt.delete(scene);
            this.duck(false);
          }
        };
      })
      .catch(() => undefined);
  }

  private stopVoice(fade: number): void {
    this.voiceToken += 1;
    const clip = this.clip;
    if (!clip) return;
    this.clip = null;
    clip.mark?.classList.remove('is-reading');
    ramp(this.ctx, clip.gain.gain, 0, fade);
    try {
      clip.source.stop(this.ctx.currentTime + fade + 0.02);
    } catch {
      // Already stopped.
    }
    this.duck(false);
  }

  private duck(down: boolean): void {
    ramp(this.ctx, this.duckBus.gain, down ? dbToGain(DUCK_DB) : 1, down ? 0.3 : 1.4);
  }

  /** The text a clip reads: the chapter's first or second paragraph, or the scene's line. */
  private markFor(scene: SceneId, index: number): Element | null {
    const el = this.stage.sceneElement(scene);
    if (!el) return null;
    if (scene === 'prologue') return el.querySelector('.prologue-line');
    if (scene === 'finale') return el.querySelector('.finale-outro');
    return el.querySelector(index === 0 ? '.p1' : '.p2');
  }

  /** Only the scene on the stage offers its replay control, and only while the ozan reads. */
  showReplay(): void {
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-replay]')) {
      button.hidden = !this.narrationWanted || button.dataset.replay !== this.scene;
    }
  }

  /* ---------- Loading ---------- */

  /** Whether the browser decodes Opus: a tiny file, decoded once. */
  private decodesOpus(): Promise<boolean> {
    this.opus ??= this.fetchBytes(OPUS_PROBE)
      .then((bytes) => this.ctx.decodeAudioData(bytes.slice(0)))
      .then((buffer) => buffer.length > 0)
      .catch(() => false);
    return this.opus;
  }

  private load(key: SoundKey): Promise<AudioBuffer> {
    let decoded = this.buffers.get(key);
    if (!decoded) {
      const file: { url: string; alt?: string } = SOUND_FILES[key];
      decoded = (file.alt ? this.decodesOpus() : Promise.resolve(true))
        .then((opus) => this.fetchBytes(file.alt && !opus ? file.alt : file.url))
        .then((bytes) => this.ctx.decodeAudioData(bytes.slice(0)));
      decoded.catch(() => this.buffers.delete(key));
      this.buffers.set(key, decoded);
    }
    return decoded;
  }

  private fetchBytes(url: string): Promise<ArrayBuffer> {
    let bytes = this.bytes.get(url);
    if (!bytes) {
      bytes = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
        return response.arrayBuffer();
      });
      bytes.catch(() => this.bytes.delete(url));
      this.bytes.set(url, bytes);
    }
    return bytes;
  }

  /** Loads what the scene and the next one need, as far as the visitor has asked for sound;
      lets go of the decoded sound of scenes far from the stage (their files stay). */
  private prepare(id: OnStage): void {
    if (!this.running) return;
    const at = id === 'hero' ? -1 : SCENE_ORDER.indexOf(id);
    const keysOf = (scene: SceneId | undefined): SoundKey[] => {
      if (!scene) return [];
      const keys: SoundKey[] = [];
      if (this.bedWanted) {
        keys.push(...(SCENE_ACCENTS[scene] ?? []).map((a) => a.key));
        if (scene === 'finale') {
          for (const accent of Object.values(MOMENT_ACCENTS)) if (accent) keys.push(accent.key);
        }
      }
      if (this.narrationWanted) keys.push(...NARRATION[scene].clips);
      return keys;
    };
    const near = [SCENE_ORDER[at - 1], SCENE_ORDER[at], SCENE_ORDER[at + 1]];
    const keep = new Set<SoundKey>([...BED.map((b) => b.key), ...near.flatMap(keysOf)]);
    for (const key of [...keysOf(SCENE_ORDER[at]), ...keysOf(SCENE_ORDER[at + 1])]) void this.load(key).catch(() => undefined);
    for (const key of this.buffers.keys()) {
      if (!keep.has(key)) this.buffers.delete(key);
    }
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(): void {
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
  }
}

/** The events that let a page start sound: a press of the mouse, the end of a tap, a key. */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;

/** Shows the sound's controls and wires them, the replay controls and the stage to the sound. */
export function startSound(stage: Stage): void {
  const dock = document.querySelector<HTMLElement>('[data-sound-dock]');
  const bedToggle = dock?.querySelector<HTMLButtonElement>('[data-bed-toggle]') ?? null;
  const narrationToggle = dock?.querySelector<HTMLButtonElement>('[data-narration-toggle]') ?? null;
  const slider = dock?.querySelector<HTMLInputElement>('input[type="range"]') ?? null;
  if (!dock || !bedToggle || !narrationToggle || typeof AudioContext === 'undefined') return;
  dock.hidden = false;

  // The music's switch shows what is heard; while the music loads its waves pulse faintly.
  const show = (music: MusicState, narration: boolean): void => {
    bedToggle.setAttribute('aria-pressed', String(music === 'on'));
    bedToggle.toggleAttribute('data-starting', music === 'starting');
    narrationToggle.setAttribute('aria-pressed', String(narration));
  };

  const readVolume = (): number => {
    const value = Number(slider?.value ?? BED_VOLUME * 100);
    slider?.setAttribute('aria-valuetext', `${value}%`);
    slider?.style.setProperty('--fill', `${value}%`);
    return value / 100;
  };
  if (slider) {
    slider.value = String(Math.round(BED_VOLUME * 100));
    readVolume();
  }

  let sound: Sound | null = null;
  let sceneTimer = 0;

  const open = (): Sound => {
    if (!sound) {
      sound = new Sound(stage, show);
      sound.setVolume(readVolume());
      sound.sync();
    }
    return sound;
  };

  // The first press or key anywhere starts the music. It never stops the event, so a link or
  // a button still does what it was pressed for; a press on the music's own switch is left to
  // the switch, which starts the music when none is heard.
  const onGesture = (event: Event): void => {
    if (event instanceof PointerEvent && event.type === 'pointerdown' && event.pointerType !== 'mouse') return;
    if (event instanceof KeyboardEvent && event.key === 'Escape') return;
    if (event.target instanceof Node && bedToggle.contains(event.target)) return;
    const s = open();
    if (s.bedWanted) s.unlock();
  };
  const arm = (): void => {
    for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true });
  };
  const disarm = (): void => {
    for (const type of GESTURES) window.removeEventListener(type, onGesture, { capture: true });
  };
  arm();

  // Once the page has loaded and is idle, open the context: where the browser allows sound,
  // the bed starts.
  const openSoon = (): void => {
    const go = (): void => {
      const s = open();
      s.ctx.addEventListener('statechange', () => {
        if (s.running) disarm();
        else if (s.bedWanted || s.narrationWanted) arm();
      });
      if (s.running) disarm();
    };
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(go, { timeout: 2000 });
    else window.setTimeout(go, 400);
  };
  if (document.readyState === 'complete') openSoon();
  else window.addEventListener('load', openSoon, { once: true });

  bedToggle.addEventListener('click', () => {
    open().toggleBed();
  });
  narrationToggle.addEventListener('click', () => {
    open().toggleNarration();
  });
  slider?.addEventListener('input', () => sound?.setVolume(readVolume()));

  document.addEventListener('click', (event) => {
    const replay = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-replay]');
    const id = replay?.dataset.replay;
    if (id) sound?.replay(id as SceneId);
  });

  // A scene must hold the stage for a moment before its sound starts, so a fast scroll
  // through several scenes does not start them all; the voice stops at once.
  stage.onScene((id) => {
    window.clearTimeout(sceneTimer);
    if (!sound) return;
    sound.leave();
    sceneTimer = window.setTimeout(() => sound?.enter(id), 380);
  });
  stage.onMoment((moment) => sound?.moment(moment));

  document.addEventListener('visibilitychange', () => sound?.pause(document.hidden));
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && sound && !sound.running) arm();
  });
}
