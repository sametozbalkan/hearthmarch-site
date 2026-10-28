/**
 * Encodes the tale's sound for the web into `public/audio/`, and writes `src/sound-files.ts`
 * with each file's length, loop points, loudness and size.
 *
 * - The loops (the music bed and the accents) go straight from their masters to Opus in
 *   WebM (about 96 kbps) and to AAC in MP4 (about 128 kbps) for browsers without Opus, both
 *   stereo at 48 kHz. Each loop is written with half a second of its own tail before it and
 *   of its own head after it; the player loops between the two pads, so the seam lies inside
 *   continuous sound and stays gapless whatever a decoder does at a file's edges. Their level
 *   changes only by a fixed gain (never a dynamic loudness filter, which would pump the hiss).
 * - The one-off sting is written the same way, without pads.
 * - The narration: mono MP3 at 64 kbps, its head and tail trimmed to about 0.1 s, pauses
 *   longer than 0.9 s tightened to 0.7 s, its loudness brought to -16 LUFS with a gentle,
 *   oversampled limiter keeping true peaks under -1 dBTP.
 *
 * The masters are not part of this repository. Run it with the files and folders that hold them:
 *   node scripts/encode-audio.ts --music <file> --accents <folder> --voice <folder>
 * `--music` is the bed's seamless loop master, `--accents` holds `tutulma_drums.ogg` and
 * `dawn_sting.ogg`. It needs ffmpeg on the PATH. With `--voice-only` it encodes only the
 * narration and keeps the other files as they are.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RATE = 44100;
/** The loops' rate: Opus's own, so nothing is resampled on the way to it. */
const LOOP_RATE = 48000;
const OUT = join(process.cwd(), 'public', 'audio');
/** The pad of each loop's own sound on either side, in seconds. */
const PAD = 0.5;

/** The narration's clips, by the page's ids. */
const VOICE = [
  'prologue',
  'hearth-1',
  'hearth-2',
  'day-1',
  'day-2',
  'steppe-1',
  'steppe-2',
  'night-1',
  'night-2',
  'eclipse-1',
  'eclipse-2',
  'goc-1',
  'goc-2',
  'together-1',
  'together-2',
  'outro',
] as const;

const VOICE_TARGET = -16;
const PEAK_CEILING = -1;

function arg(name: string): string {
  const i = process.argv.indexOf(name);
  const value = i >= 0 ? process.argv[i + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function ffmpeg(args: string[], input?: Buffer): { stdout: Buffer; stderr: string } {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { input, maxBuffer: 1 << 30 });
  if (result.status !== 0) {
    throw new Error(`ffmpeg ${args.join(' ')} failed:\n${result.stderr?.toString() ?? ''}`);
  }
  return { stdout: result.stdout, stderr: result.stderr.toString() };
}

/** Decodes a file to interleaved 32-bit float PCM, at 44.1 kHz unless told otherwise. */
function decode(path: string, channels: number, rate = RATE): Float32Array {
  const { stdout } = ffmpeg(['-i', path, '-f', 'f32le', '-ac', String(channels), '-ar', String(rate), '-']);
  return new Float32Array(stdout.buffer, stdout.byteOffset, stdout.byteLength / 4);
}

const asBuffer = (pcm: Float32Array): Buffer => Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
const rawInput = (channels: number, rate = RATE): string[] => ['-f', 'f32le', '-ar', String(rate), '-ac', String(channels), '-i', '-'];

/** Integrated loudness (LUFS) and true peak (dBTP) of a file, or of raw PCM. */
function measure(source: string | Float32Array, channels = 1, rate = RATE): { lufs: number; peak: number } {
  const input = typeof source === 'string' ? ['-i', source] : rawInput(channels, rate);
  const pcm = typeof source === 'string' ? undefined : asBuffer(source);
  const { stderr } = ffmpeg([...input, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], pcm);
  const summary = stderr.slice(stderr.lastIndexOf('Summary:'));
  const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]);
  const peak = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]);
  if (!Number.isFinite(lufs) || !Number.isFinite(peak)) throw new Error(`No loudness in:\n${summary}`);
  return { lufs, peak };
}

const round = (v: number, places = 3): number => Math.round(v * 10 ** places) / 10 ** places;
const kb = (bytes: number): string => `${Math.round(bytes / 1024)} KB`;

/** A stereo loop with its own tail before it and its own head after it. */
function padLoop(pcm: Float32Array): Float32Array {
  const pad = Math.round(PAD * LOOP_RATE) * 2;
  const out = new Float32Array(pcm.length + 2 * pad);
  out.set(pcm.subarray(pcm.length - pad), 0);
  out.set(pcm, pad);
  out.set(pcm.subarray(0, pad), pad + pcm.length);
  return out;
}

/** Writes 48 kHz stereo PCM as Opus in WebM and as AAC in MP4; returns both sizes. */
function encodeStereo(pcm: Float32Array, base: string): { webm: number; m4a: number } {
  const input = asBuffer(pcm);
  const raw = rawInput(2, LOOP_RATE);
  ffmpeg(['-y', ...raw, '-map_metadata', '-1', '-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', '-application', 'audio', `${base}.webm`], input);
  ffmpeg(['-y', ...raw, '-map_metadata', '-1', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', `${base}.m4a`], input);
  return { webm: statSync(`${base}.webm`).size, m4a: statSync(`${base}.m4a`).size };
}

interface Entry {
  /** Opus in WebM, or the narration's MP3. */
  url: string;
  /** AAC in MP4, for browsers that cannot decode Opus. */
  alt?: string;
  /** The sound's own length, without pads (s). */
  duration: number;
  /** For a loop: where it starts and ends in the file (s). */
  loop?: readonly [number, number];
  lufs: number;
  peak: number;
  bytes: number;
  altBytes?: number;
}

function encodeLoop(master: string, name: string, loop: boolean, gainDb: number): Entry {
  const pcm = decode(master, 2, LOOP_RATE);
  // A fixed linear gain only: the loop's sound and its seam stay exactly as mastered.
  const gain = 10 ** (gainDb / 20);
  if (gain !== 1) for (let i = 0; i < pcm.length; i += 1) pcm[i] = (pcm[i] ?? 0) * gain;
  const duration = pcm.length / 2 / LOOP_RATE;
  const { lufs, peak } = measure(pcm, 2, LOOP_RATE);
  const base = join(OUT, name);
  const sizes = encodeStereo(loop ? padLoop(pcm) : pcm, base);
  return {
    url: `/audio/${name}.webm`,
    alt: `/audio/${name}.m4a`,
    duration: round(duration, 6),
    ...(loop ? { loop: [PAD, round(PAD + duration, 6)] as const } : {}),
    lufs,
    peak,
    bytes: sizes.webm,
    altBytes: sizes.m4a,
  };
}

/** Trims the head and tail to about 0.1 s and tightens pauses longer than 0.9 s to 0.7 s. */
function tighten(pcm: Float32Array): { pcm: Float32Array; pauses: number } {
  const frame = Math.round(RATE * 0.01);
  const frames = Math.floor(pcm.length / frame);
  const level: number[] = [];
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = f * frame; i < (f + 1) * frame; i += 1) sum += (pcm[i] ?? 0) ** 2;
    level.push(10 * Math.log10(sum / frame + 1e-12));
  }
  const loudest = Math.max(...level);
  const threshold = Math.max(-55, loudest - 42);
  const voiced = level.map((l) => l > threshold);
  const first = voiced.indexOf(true);
  const last = voiced.lastIndexOf(true);
  const keep: Array<[number, number]> = [];
  let start = Math.max(0, first - 10);
  let pauses = 0;
  let run = 0;
  for (let f = first; f <= last; f += 1) {
    if (!voiced[f]) {
      run += 1;
      continue;
    }
    if (run > 90) {
      // A pause of more than 0.9 s: keep 0.35 s after the words and 0.35 s before the next.
      keep.push([start, f - run + 35]);
      start = f - 35;
      pauses += 1;
    }
    run = 0;
  }
  keep.push([start, Math.min(frames, last + 13)]);
  const fade = Math.round(RATE * 0.012);
  const parts = keep.map(([a, b]) => pcm.slice(a * frame, b * frame));
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const part of parts) {
    // Short fades at every cut; the cuts fall in near-silence, so nothing clicks.
    for (let i = 0; i < fade && i < part.length; i += 1) {
      const g = i / fade;
      part[i] = (part[i] ?? 0) * g;
      const j = part.length - 1 - i;
      part[j] = (part[j] ?? 0) * g;
    }
    out.set(part, at);
    at += part.length;
  }
  return { pcm: out, pauses };
}

function encodeVoice(voiceDir: string, id: string): Entry & { pauses: number; gain: number } {
  const out = join(OUT, 'voice', `${id}.mp3`);
  const { pcm, pauses } = tighten(decode(join(voiceDir, `${id}.mp3`), 1));
  let gain = VOICE_TARGET - measure(pcm).lufs;
  let result = { lufs: 0, peak: 0 };
  // The gain brings the clip to the target; a gentle limiter, four times oversampled so it
  // catches true peaks, keeps the loudest syllables under the ceiling with room for the
  // encoder. A second pass makes up what the limiter took.
  for (let pass = 0; pass < 2; pass += 1) {
    const limit = 10 ** ((PEAK_CEILING - 2.2) / 20);
    ffmpeg(
      [
        '-y',
        ...rawInput(1),
        '-af',
        `volume=${gain.toFixed(2)}dB,aresample=${RATE * 4},alimiter=limit=${limit.toFixed(4)}:attack=2:release=60:level=false:latency=1,aresample=${RATE}`,
        '-map_metadata',
        '-1',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '64k',
        '-ar',
        String(RATE),
        '-id3v2_version',
        '0',
        out,
      ],
      asBuffer(pcm),
    );
    result = measure(out);
    if (Math.abs(result.lufs - VOICE_TARGET) < 0.25) break;
    gain += VOICE_TARGET - result.lufs;
  }
  return {
    url: `/audio/voice/${id}.mp3`,
    duration: round(pcm.length / RATE, 3),
    lufs: result.lufs,
    peak: result.peak,
    bytes: statSync(out).size,
    pauses,
    gain: round(gain, 2),
  };
}

const voiceOnly = process.argv.includes('--voice-only');
const voiceDir = arg('--voice');
const manifest = join(process.cwd(), 'src', 'sound-files.ts');
const files: Record<string, Entry> = {};

if (voiceOnly) {
  if (!existsSync(manifest)) throw new Error('--voice-only needs the other files already encoded');
  const previous = (await import(pathToFileURL(manifest).href)) as { SOUND_FILES: Record<string, Entry> };
  for (const [key, e] of Object.entries(previous.SOUND_FILES)) {
    if (!key.startsWith('voice/')) files[key] = e;
  }
} else {
  // Start clean, so nothing from an earlier set of files is left behind.
  for (const folder of ['bed', 'accent', 'beds']) rmSync(join(OUT, folder), { recursive: true, force: true });
  mkdirSync(join(OUT, 'bed'), { recursive: true });
  mkdirSync(join(OUT, 'accent'), { recursive: true });
  const accents = arg('--accents');
  // The music is mastered loud (-13 LUFS, peaks at -0.2 dBTP): 3 dB down gives the encoders
  // headroom. The player sets every level from the measured loudness.
  const loops: ReadonlyArray<[string, string, boolean, number]> = [
    ['bed/music', arg('--music'), true, -3],
    ['accent/tutulma-drums', join(accents, 'tutulma_drums.ogg'), true, 0],
    ['accent/dawn-sting', join(accents, 'dawn_sting.ogg'), false, 0],
  ];
  for (const [name, master, loop, gainDb] of loops) {
    const e = encodeLoop(master, name, loop, gainDb);
    files[name] = e;
    console.log(
      `${name.padEnd(22)} ${e.duration.toFixed(3).padStart(8)} s  ${e.lufs.toFixed(1)} LUFS  ${e.peak.toFixed(1)} dBTP  webm ${kb(e.bytes)}  m4a ${kb(e.altBytes ?? 0)}`,
    );
  }
  // A tiny Opus file the player decodes first, to learn whether the browser can decode Opus.
  ffmpeg(['-y', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.06', '-map_metadata', '-1', '-c:a', 'libopus', '-b:a', '16k', join(OUT, 'probe.webm')]);
}

mkdirSync(join(OUT, 'voice'), { recursive: true });
for (const id of VOICE) {
  const { pauses, gain, ...e } = encodeVoice(voiceDir, id);
  files[`voice/${id}`] = e;
  console.log(
    `voice/${id.padEnd(16)} ${e.duration.toFixed(2).padStart(8)} s  ${e.lufs.toFixed(1)} LUFS  ${e.peak.toFixed(1)} dBTP  ${kb(e.bytes)}  (gain ${gain >= 0 ? '+' : ''}${gain} dB, ${pauses} pause(s) tightened)`,
  );
}

const opus = Object.values(files).reduce((n, e) => n + e.bytes, 0);
const aac = Object.values(files).reduce((n, e) => n + (e.altBytes ?? e.bytes), 0);
const disk = Object.values(files).reduce((n, e) => n + e.bytes + (e.altBytes ?? 0), 0);
const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
console.log(`a visit with Opus loads at most ${mb(opus)}; with AAC ${mb(aac)}; ${mb(disk)} on disk`);

const line = (key: string, e: Entry): string => {
  const parts = [`url: '${e.url}'`];
  if (e.alt) parts.push(`alt: '${e.alt}'`);
  parts.push(`duration: ${e.duration}`);
  if (e.loop) parts.push(`loop: [${e.loop[0]}, ${e.loop[1]}]`);
  parts.push(`lufs: ${e.lufs}`, `peak: ${e.peak}`, `bytes: ${e.bytes}`);
  if (e.altBytes) parts.push(`altBytes: ${e.altBytes}`);
  return `  '${key}': { ${parts.join(', ')} },`;
};

writeFileSync(
  manifest,
  `/**
 * The tale's audio files in \`public/audio/\`: each one's address (and its AAC copy), its own
 * length (s), its loop points in the file (s), its integrated loudness (LUFS), its true peak
 * (dBTP) and its size. Written by \`scripts/encode-audio.ts\`; do not edit.
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
${Object.entries(files)
  .map(([key, e]) => line(key, e))
  .join('\n')}
} as const satisfies Record<string, SoundFile>;

export type SoundKey = keyof typeof SOUND_FILES;

/** The tiny Opus file that tells the player whether the browser decodes Opus. */
export const OPUS_PROBE = '/audio/probe.webm';
`,
);
