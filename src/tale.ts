/**
 * The tale's stage: when each scene arrives, holds and leaves as the page scrolls, and the
 * keyframes of everything that moves on the stage.
 *
 * Time `t` is scroll distance in svh (1 = 1% of the small viewport's height). The stage pins
 * at t = 0; during the entry (t from -ENTRY to 0) the hero scrolls away while the stage rises
 * under it. Every scene holds still for its dwell, and a crossing joins it to the next one:
 * the old scene's content leaves, the next hour's wall rises over it, a cut-out may sweep
 * across, and the new content arrives.
 *
 * One list of tracks drives both engines: the build turns it into CSS scroll-driven keyframes
 * (`taleCss`), and `src/scripts/stage.ts` plays the same tracks from the scroll position in
 * browsers without scroll-driven animations. Tracks change only `opacity` and `transform`.
 */
import type { StationId } from './copy/types.ts';

/** The stage's scenes: the prologue, the seven chapters and the finale. */
export type SceneId = 'prologue' | StationId | 'finale';

/** The four cut-outs, each crossing the stage once. */
export type CutId = 'c1' | 'c2' | 'c3' | 'c4';

/** The scroll of the entry, while the hero leaves and the stage rises (svh). */
export const ENTRY = 100;

type Step = { scene: SceneId; dwell: number } | { cross: number; cut?: CutId };

/** The tale in order: each scene's dwell and each crossing's length, in svh of scroll. */
const STEPS: readonly Step[] = [
  { scene: 'prologue', dwell: 50 },
  { cross: 60 },
  { scene: 'hearth', dwell: 100 },
  { cross: 60 },
  { scene: 'day', dwell: 100 },
  { cross: 90, cut: 'c3' },
  { scene: 'steppe', dwell: 100 },
  { cross: 70 },
  { scene: 'night', dwell: 100 },
  { cross: 120, cut: 'c1' },
  { scene: 'eclipse', dwell: 100 },
  { cross: 60 },
  { scene: 'goc', dwell: 150 },
  { cross: 90, cut: 'c4' },
  { scene: 'together', dwell: 100 },
  { cross: 70 },
  { scene: 'finale', dwell: 210 },
];

/** A span of scroll time: [start, end]. */
export type Span = readonly [number, number];

export interface SceneTimes {
  id: SceneId;
  index: number;
  /** The crossing into the scene; the prologue arrives with the entry instead. */
  crossIn: Span | null;
  /** The scene holds still. */
  dwell: Span;
  /** The crossing out of the scene; the finale has none. */
  crossOut: Span | null;
  /** From this time the scene counts as the current one (the middle of its crossing in). */
  from: number;
}

export interface CutTimes {
  id: CutId;
  span: Span;
}

function layout(): { scenes: SceneTimes[]; cuts: CutTimes[]; total: number } {
  const scenes: SceneTimes[] = [];
  const cuts: CutTimes[] = [];
  let t = 0;
  let pendingIn: Span | null = null;
  for (const step of STEPS) {
    if ('scene' in step) {
      const index = scenes.length;
      const crossIn = pendingIn;
      const previous = scenes[index - 1];
      if (previous && crossIn) previous.crossOut = crossIn;
      scenes.push({
        id: step.scene,
        index,
        crossIn,
        dwell: [t, t + step.dwell],
        crossOut: null,
        from: crossIn ? (crossIn[0] + crossIn[1]) / 2 : -ENTRY / 2,
      });
      t += step.dwell;
      pendingIn = null;
    } else {
      pendingIn = [t, t + step.cross];
      if (step.cut) cuts.push({ id: step.cut, span: pendingIn });
      t += step.cross;
    }
  }
  // The felt clouds cross with the entry, from the hero into the tale, before the prologue shows.
  cuts.unshift({ id: 'c2', span: [-ENTRY * 0.88, -ENTRY * 0.12] });
  return { scenes, cuts, total: t };
}

const LAYOUT = layout();

/** Every scene's times, in the tale's order. */
export const SCENES: readonly SceneTimes[] = LAYOUT.scenes;

/** When each cut-out crosses the stage. */
export const CUTS: readonly CutTimes[] = LAYOUT.cuts;

/** The length of the pinned stage, in svh of scroll. */
export const TOTAL = LAYOUT.total;

export function sceneTimes(id: SceneId): SceneTimes {
  const scene = SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`No scene ${id}`);
  return scene;
}

/** The scene on the stage at time t: the hero before the tale's first half-entry. */
export function sceneIndexAt(t: number): number {
  let index = -1;
  for (const scene of SCENES) {
    if (t >= scene.from) index = scene.index;
  }
  return index;
}

/** Where a link to a scene lands: a little into its dwell, so it has fully arrived. */
export function anchorTime(id: SceneId): number {
  const { dwell } = sceneTimes(id);
  return dwell[0] + Math.min(12, (dwell[1] - dwell[0]) * 0.15);
}

/** Whether a scene is close enough to the stage to keep its pictures loaded and laid out. */
export function isNear(scene: SceneTimes, t: number): boolean {
  const start = (scene.crossIn ?? [-ENTRY, -ENTRY])[0] - 170;
  const end = (scene.crossOut ?? [TOTAL, TOTAL])[1] + 90;
  return t >= start && t <= end;
}

/** Whether a cut-out is close enough to its crossing to be loaded and laid out. */
export function isCutNear(cut: CutTimes, t: number): boolean {
  return t >= cut.span[0] - 170 && t <= cut.span[1] + 60;
}

/** A moment of the finale the sound follows. */
export type FinaleMoment = 'moonClear' | 'outroVoice';

/** The finale's moments, relative to its dwell's start. */
export const FINALE = {
  shadowFrom: 12,
  shadowTo: 88,
  /** The moon is clear: the dawn sting plays. */
  moonClear: 80,
  dawnFrom: 72,
  dawnTo: 135,
  logoFrom: 88,
  logoTo: 122,
  outroFrom: 118,
  outroTo: 142,
  /** The closing line is shown: the ozan reads it. */
  outroVoice: 128,
  ctaFrom: 134,
  ctaTo: 158,
} as const;

/* ---------- Tracks ---------- */

/** How a track's numbers become a CSS value. */
export type Fmt = 'opacity' | 'rise' | 'wall' | 'push' | 'sweep' | 'flight' | 'dragon' | 'kilim' | 'shadow' | 'grow';

const n = (v: number): string => String(Math.round(v * 1000) / 1000);

export const FORMATS: Record<Fmt, (v: readonly number[]) => string> = {
  opacity: (v) => n(v[0] ?? 0),
  rise: (v) => `translate3d(0, ${n(v[0] ?? 0)}svh, 0)`,
  wall: (v) => `translate3d(0, ${n(v[0] ?? 0)}lvh, 0)`,
  push: (v) => `scale(${n(v[0] ?? 1)})`,
  sweep: (v) => `translate3d(${n(v[0] ?? 0)}vw, ${n(v[1] ?? 0)}svh, 0) rotate(${n(v[2] ?? 0)}deg)`,
  // The Hüma's picture faces right and it flies up to the left: mirrored, and tilted by the
  // slope of its path on this screen (its rise in svh over its run in vw), so its head leads.
  flight: (v) => {
    const { rise, run } = flightSlope();
    return `translate3d(${n(v[0] ?? 0)}vw, ${n(v[1] ?? 0)}svh, 0) rotate(calc(atan2(${n(rise)}svh, ${n(run)}vw) + ${n(v[2] ?? 0)}deg)) scale(-1, 1)`;
  },
  // The dragon's x is a share of its reach (from the screen's middle to just past its edge,
  // plus half its own length), so its whole body passes at any width.
  dragon: (v) => `translate3d(calc(${n(v[0] ?? 0)} * var(--dragon-reach)), ${n(v[1] ?? 0)}svh, 0) rotate(${n(v[2] ?? 0)}deg)`,
  kilim: (v) => `translate3d(calc(-50% + ${n(v[0] ?? 0)} * var(--kilim-a)), 0, 0)`,
  shadow: (v) => `translate3d(${n(v[0] ?? 0)}%, ${n(v[1] ?? 0)}%, 0)`,
  grow: (v) => `translate3d(0, ${n(v[0] ?? 0)}svh, 0) scale(${n(v[1] ?? 1)})`,
};

/** Easing of the segment that ends at a key. */
type Ease = 'linear' | 'out' | 'inOut';

/** A keyframe: time, value(s), and the easing of the segment that ends here. */
type Key = readonly [t: number, value: number | readonly number[], ease?: Ease];

/** One animated property of a track, with its keys already expanded into linear segments. */
export interface TrackProp {
  prop: 'opacity' | 'transform';
  fmt: Fmt;
  keys: ReadonlyArray<readonly [number, readonly number[]]>;
}

/** Everything one element on the stage does over the tale. */
export interface Track {
  /** The element, by a selector inside the stage. */
  sel: string;
  props: readonly TrackProp[];
}

const EASES: Record<Ease, (x: number) => number> = {
  linear: (x) => x,
  out: (x) => 1 - (1 - x) * (1 - x),
  inOut: (x) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x)),
};

const asArray = (v: number | readonly number[]): readonly number[] => (typeof v === 'number' ? [v] : v);

/** Expands eased segments into short linear ones, so both engines interpolate linearly. */
function expand(keys: readonly Key[]): ReadonlyArray<readonly [number, readonly number[]]> {
  const out: Array<readonly [number, readonly number[]]> = [];
  keys.forEach(([t, value, ease = 'linear'], i) => {
    const v = asArray(value);
    const prev = keys[i - 1];
    if (prev && ease !== 'linear' && t > prev[0]) {
      const pv = asArray(prev[1]);
      const steps = 6;
      for (let s = 1; s < steps; s += 1) {
        const x = EASES[ease](s / steps);
        out.push([prev[0] + ((t - prev[0]) * s) / steps, v.map((b, j) => (pv[j] ?? b) + (b - (pv[j] ?? b)) * x)]);
      }
    }
    out.push([t, v]);
  });
  return out;
}

function prop(propName: TrackProp['prop'], fmt: Fmt, keys: readonly Key[]): TrackProp {
  return { prop: propName, fmt, keys: expand([...keys].sort((a, b) => a[0] - b[0])) };
}

const at = (span: Span, f: number): number => span[0] + (span[1] - span[0]) * f;

const sceneSel = (id: SceneId): string => `[data-scene="${id}"]`;

/** Whether a cut-out crosses the stage during this crossing. */
const hasCut = (span: Span | null): boolean => span !== null && CUTS.some((c) => c.id !== 'c2' && c.span[0] === span[0]);

/** The tracks of a chapter: the wall rises, the work and the text arrive, hold and leave. */
function chapterTracks(scene: SceneTimes): Track[] {
  const { crossIn, crossOut, dwell } = scene;
  const s = sceneSel(scene.id);
  const tracks: Track[] = [];
  // Where a cut-out crosses, the old scene leaves sooner and the new one waits for it to pass,
  // so it never crosses text.
  const cutIn = hasCut(crossIn);
  const cutOut = hasCut(crossOut);
  const arriveWork = crossIn ? at(crossIn, cutIn ? 0.82 : 0.52) : dwell[0] - 10;
  const arriveText = crossIn ? at(crossIn, cutIn ? 0.86 : 0.62) : dwell[0] - 10;
  const arrived = crossIn ? crossIn[1] : dwell[0];
  const leave = crossOut ? crossOut[0] : dwell[1];
  const gone = crossOut ? at(crossOut, cutOut ? 0.2 : 0.36) : dwell[1] + 20;
  const textGone = crossOut ? at(crossOut, cutOut ? 0.14 : 0.3) : dwell[1] + 20;
  if (crossIn) {
    tracks.push({
      sel: `${s} > .wall`,
      props: [
        prop('transform', 'wall', [
          [at(crossIn, 0.08), 150],
          [at(crossIn, 0.72), 0, 'inOut'],
        ]),
      ],
    });
  }
  tracks.push({
    sel: `${s} .work`,
    props: [
      prop('opacity', 'opacity', [
        [arriveWork, 0],
        [arrived, 1, 'out'],
        [leave, 1],
        [gone, 0],
      ]),
      prop('transform', 'rise', [
        [arriveWork, 4],
        [arrived, 0.6, 'out'],
        [leave, -0.6],
        [gone, -3.5],
      ]),
    ],
  });
  tracks.push({
    sel: `${s} .work-art img`,
    props: [
      prop('transform', 'push', [
        [arriveWork, 1],
        [gone, 1.075],
      ]),
    ],
  });
  tracks.push({
    sel: `${s} .panel`,
    props: [
      prop('opacity', 'opacity', [
        [arriveText, 0],
        [arrived + 4, 1, 'out'],
        [leave, 1],
        [textGone, 0],
      ]),
      prop('transform', 'rise', [
        [arriveText, 3],
        [arrived + 4, 0.3, 'out'],
        [leave, -0.3],
        [textGone, -2.5],
      ]),
    ],
  });
  tracks.push(...stepTracks(scene));
  return tracks;
}

/** On short screens the second paragraph comes as a second step, halfway through the dwell. */
function stepTracks(scene: SceneTimes): Track[] {
  const mid = at(scene.dwell, 0.5);
  const s = `${sceneSel(scene.id)}[data-steps="2"]`;
  return [
    {
      sel: `${s} .p1`,
      props: [
        prop('opacity', 'opacity', [
          [mid - 6, 1],
          [mid, 0],
        ]),
      ],
    },
    {
      sel: `${s} .p2`,
      props: [
        prop('opacity', 'opacity', [
          [mid, 0],
          [mid + 6, 1],
        ]),
      ],
    },
  ];
}

function prologueTracks(scene: SceneTimes): Track[] {
  const out = scene.crossOut;
  if (!out) return [];
  // The line shows once the clouds have crossed and the stage has nearly pinned.
  return [
    {
      sel: `${sceneSel(scene.id)} .prologue-line`,
      props: [
        prop('opacity', 'opacity', [
          [-ENTRY * 0.2, 0],
          [-ENTRY * 0.02, 1, 'out'],
          [out[0], 1],
          [at(out, 0.3), 0],
        ]),
        prop('transform', 'rise', [
          [-ENTRY * 0.2, 2.5],
          [-ENTRY * 0.02, 0, 'out'],
          [out[0], 0],
          [at(out, 0.3), -2.5],
        ]),
      ],
    },
  ];
}

function finaleTracks(scene: SceneTimes): Track[] {
  const { crossIn } = scene;
  if (!crossIn) return [];
  const s = sceneSel(scene.id);
  const d = scene.dwell[0];
  const f = FINALE;
  const arrive = at(crossIn, 0.5);
  const arrived = crossIn[1];
  const fade = (sel: string, from: number, to: number, ease: Ease = 'linear'): Track => ({
    sel: `${s} ${sel}`,
    props: [
      prop('opacity', 'opacity', [
        [from, 0],
        [to, 1, ease],
      ]),
    ],
  });
  const fadeOut = (sel: string, from: number, to: number): Track => ({
    sel: `${s} ${sel}`,
    props: [
      prop('opacity', 'opacity', [
        [from, 1],
        [to, 0],
      ]),
    ],
  });
  return [
    {
      sel: `${s} > .wall`,
      props: [
        prop('transform', 'wall', [
          [at(crossIn, 0.08), 150],
          [at(crossIn, 0.72), 0, 'inOut'],
        ]),
      ],
    },
    {
      sel: `${s} .moon`,
      props: [
        prop('opacity', 'opacity', [
          [arrive, 0],
          [arrived, 1, 'out'],
        ]),
        prop('transform', 'grow', [
          [arrive, [3, 0.96]],
          [arrived + 20, [0, 1], 'out'],
        ]),
      ],
    },
    {
      sel: `${s} .moon-shadow`,
      props: [
        prop('transform', 'shadow', [
          [d + f.shadowFrom, [0, 0]],
          [d + f.shadowTo, [-118, -34], 'inOut'],
        ]),
      ],
    },
    fadeOut('.moon-rim', d + 30, d + f.shadowTo),
    fadeOut('.moon-glow-copper', d + 40, d + f.shadowTo),
    fade('.moon-glow-silver', d + 38, d + 98),
    fade('.finale-night', d + 30, d + 100),
    fade('.finale-dawn', d + f.dawnFrom, d + f.dawnTo, 'out'),
    fade('.finale-fire', at(crossIn, 0.6), arrived + 6),
    fade('.finale-embers', arrived, arrived + 16),
    {
      sel: `${s} .finale-logo`,
      props: [
        prop('opacity', 'opacity', [
          [d + f.logoFrom, 0],
          [d + f.logoTo, 1, 'out'],
        ]),
        prop('transform', 'grow', [
          [d + f.logoFrom, [2.5, 0.94]],
          [d + f.logoTo, [0, 1], 'out'],
        ]),
      ],
    },
    fade('.finale-logo-glow', d + f.logoFrom + 14, d + f.logoTo + 22),
    {
      sel: `${s} .finale-outro`,
      props: [
        prop('opacity', 'opacity', [
          [d + f.outroFrom, 0],
          [d + f.outroTo, 1, 'out'],
        ]),
        prop('transform', 'rise', [
          [d + f.outroFrom, 2],
          [d + f.outroTo, 0, 'out'],
        ]),
      ],
    },
    {
      sel: `${s} .finale-cta`,
      props: [
        prop('opacity', 'opacity', [
          [d + f.ctaFrom, 0],
          [d + f.ctaTo, 1, 'out'],
        ]),
        prop('transform', 'rise', [
          [d + f.ctaFrom, 2],
          [d + f.ctaTo, 0, 'out'],
        ]),
      ],
    },
  ];
}

/** Where each cut-out comes from and goes: x in vw, y in svh, rotation in degrees. */
const CUT_PATHS: Record<CutId, ReadonlyArray<readonly [number, readonly number[]]>> = {
  // The felt clouds drift in from the right and leave to the left, rising a little.
  c2: [
    [0, [105, 5, 2]],
    [1, [-105, -5, -2]],
  ],
  // The standard is carried across from left to right, bobbing like a rider's.
  c3: [
    [0, [-100, 3, -4]],
    [0.25, [-50, -1, -1]],
    [0.5, [0, 2, 2]],
    [0.75, [50, -1, -1]],
    [1, [100, 3, 4]],
  ],
  // The dragon crosses head first from left to right, its whole body passing, with a gentle
  // serpent's sway that keeps its head level (x as a share of its reach: the 'dragon' format).
  c1: [
    [0, [-1, 1.5, 0.6]],
    [0.33, [-0.34, -1.5, -0.6]],
    [0.66, [0.32, 1.5, 0.6]],
    [1, [1, -1, -0.4]],
  ],
  // The Hüma flies off up and to the left, its head along its path (the 'flight' format).
  c4: [
    [0, [100, 22, 1.5]],
    [1, [-100, -26, -1.5]],
  ],
};

/** How far the Hüma rises (svh) over how far it travels (vw), from the ends of its path. */
function flightSlope(): { rise: number; run: number } {
  const path = CUT_PATHS.c4;
  const first = path[0]?.[1] ?? [0, 0];
  const last = path[path.length - 1]?.[1] ?? [0, 0];
  return { rise: (first[1] ?? 0) - (last[1] ?? 0), run: (first[0] ?? 0) - (last[0] ?? 0) };
}

function cutTracks(cut: CutTimes): Track[] {
  const path = CUT_PATHS[cut.id];
  // The sweep runs inside the crossing, after the old text has gone and before the new arrives.
  const span: Span = cut.id === 'c2' ? cut.span : [at(cut.span, 0.16), at(cut.span, 0.8)];
  return [
    {
      sel: `[data-cut="${cut.id}"] .deco`,
      props: [
        prop(
          'transform',
          cut.id === 'c4' ? 'flight' : cut.id === 'c1' ? 'dragon' : 'sweep',
          path.map(([f, v]) => [at(span, f), v] as const),
        ),
      ],
    },
  ];
}

function kilimTracks(): Track[] {
  const scene = sceneTimes('goc');
  const from = scene.crossIn ? at(scene.crossIn, 0.52) : scene.dwell[0];
  const to = scene.crossOut ? at(scene.crossOut, 0.36) : scene.dwell[1];
  return [
    {
      sel: `${sceneSel('goc')} .kilim-track`,
      props: [
        prop('transform', 'kilim', [
          [from, -1],
          [to, 1],
        ]),
      ],
    },
  ];
}

/** The chapter rail shows as the stage pins (focus on it pins the stage first: stage.ts). */
function railTracks(): Track[] {
  return [
    {
      sel: '.rail',
      props: [
        prop('opacity', 'opacity', [
          [-ENTRY * 0.22, 0],
          [0, 1],
        ]),
      ],
    },
  ];
}

/** Everything that moves on the stage when motion is welcome. */
export function fullTracks(): Track[] {
  const tracks: Track[] = [...railTracks()];
  for (const scene of SCENES) {
    if (scene.id === 'prologue') tracks.push(...prologueTracks(scene));
    else if (scene.id === 'finale') tracks.push(...finaleTracks(scene));
    else tracks.push(...chapterTracks(scene));
  }
  tracks.push(...kilimTracks());
  for (const cut of CUTS) tracks.push(...cutTracks(cut));
  return tracks;
}

/**
 * Under reduced motion nothing moves. Scenes change by plain fades in three beats, so two
 * texts never show at once: the old text fades, the wall fades to the next hour, the new text
 * fades in. The second step still changes.
 */
export function reducedTracks(): Track[] {
  const tracks: Track[] = [...railTracks()];
  for (const scene of SCENES) {
    const next = SCENES[scene.index + 1];
    const wall: Key[] = [];
    const text: Key[] = [];
    if (scene.crossIn) {
      wall.push([at(scene.crossIn, 0.36), 0], [at(scene.crossIn, 0.64), 1]);
      text.push([at(scene.crossIn, 0.68), 0], [scene.crossIn[1], 1]);
    } else {
      wall.push([scene.dwell[0], 1]);
      text.push([scene.dwell[0], 1]);
    }
    if (scene.crossOut) text.push([scene.crossOut[0], 1], [at(scene.crossOut, 0.32), 0]);
    if (next?.crossIn) {
      // Covered by the next scene's wall once it has fully arrived: hide it then.
      const covered = at(next.crossIn, 0.64) + 0.5;
      wall.push([covered, 1], [covered + 0.2, 0]);
    }
    tracks.push({ sel: sceneSel(scene.id), props: [prop('opacity', 'opacity', wall)] });
    tracks.push({ sel: `${sceneSel(scene.id)} > .scene-body`, props: [prop('opacity', 'opacity', text)] });
    if (scene.id !== 'prologue' && scene.id !== 'finale') tracks.push(...stepTracks(scene));
  }
  return tracks;
}

/* ---------- Playing the tracks ---------- */

/** The share (0 to 1) of the timeline `entry 0% contain 100%` that time t falls on. */
export function timelineShare(t: number): number {
  return Math.min(1, Math.max(0, (t + ENTRY) / (TOTAL + ENTRY)));
}

/** A track property's value at time t, interpolated between its keys. */
export function valueAt(p: TrackProp, t: number): readonly number[] {
  const keys = p.keys;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) return [];
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  for (let i = 1; i < keys.length; i += 1) {
    const b = keys[i];
    const a = keys[i - 1];
    if (a && b && t <= b[0]) {
      const x = b[0] === a[0] ? 1 : (t - a[0]) / (b[0] - a[0]);
      return b[1].map((bv, j) => {
        const av = a[1][j] ?? bv;
        return av + (bv - av) * x;
      });
    }
  }
  return last[1];
}

/* ---------- The CSS engine ---------- */

function keyframes(name: string, track: Track): string {
  const times = new Set<number>();
  for (const p of track.props) for (const [t] of p.keys) times.add(t);
  const sorted = [...times].sort((a, b) => a - b);
  const frames: string[] = [];
  const write = (pct: number, t: number): void => {
    const decls = track.props.map((p) => `${p.prop}:${FORMATS[p.fmt](valueAt(p, t))}`).join(';');
    frames.push(`${Math.round(pct * 10000) / 10000}%{${decls}}`);
  };
  const first = sorted[0] ?? 0;
  const last = sorted[sorted.length - 1] ?? 0;
  write(0, first);
  for (const t of sorted) {
    const pct = timelineShare(t) * 100;
    if (pct > 0 && pct < 100) write(pct, t);
  }
  write(100, last);
  return `@keyframes ${name}{${frames.join('')}}`;
}

function trackRules(tracks: readonly Track[], prefix: string): string {
  return tracks
    .map((track, i) => {
      const name = `${prefix}${i}`;
      return `${keyframes(name, track)}:root.stage.sda ${track.sel}{animation:${name} linear both;animation-timeline:--tale;animation-range:entry 0% contain 100%}`;
    })
    .join('');
}

/**
 * The stage's scroll-driven keyframes, for the page's head. They apply only while the page
 * runs as a stage driven by CSS (`html.stage.sda`, set by the page's first script).
 */
export function taleCss(): string {
  return [
    `@media (prefers-reduced-motion: no-preference){${trackRules(fullTracks(), 'tf')}}`,
    `@media (prefers-reduced-motion: reduce){${trackRules(reducedTracks(), 'tr')}}`,
  ].join('');
}
