/**
 * Checks the built site in `dist/`:
 * - every internal link, image, source set, icon and stylesheet reference resolves to a built file,
 *   and every `#fragment` to an id on its page;
 * - nothing the browser loads by itself (images, scripts, styles, fonts, icons, the manifest)
 *   comes from another domain: only plain links (<a href>) may leave the site;
 * - the CSS and scripts name no other domain;
 * - the sitemap, robots.txt and the web manifest point at files that exist.
 *
 * Run it after `npm run build`: `node scripts/check-dist.ts`. It exits with 1 on any problem.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const SITE_HOST = 'hearthmarchgame.com';

/** Tags and attributes whose URL the browser fetches on its own. */
const FETCHED: Record<string, string[]> = {
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  script: ['src'],
  link: ['href'],
  iframe: ['src'],
  video: ['src', 'poster'],
  audio: ['src'],
  embed: ['src'],
  object: ['data'],
  track: ['src'],
  input: ['src'],
};

/** Meta tags whose content is an absolute URL on this site. */
const META_URLS = new Set(['og:url', 'og:image', 'twitter:image']);

const problems: string[] = [];
const externalLinks = new Set<string>();
let checked = 0;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** The tags of an HTML document, with their attributes. */
function tags(html: string): { name: string; attrs: Map<string, string> }[] {
  const out: { name: string; attrs: Map<string, string> }[] = [];
  const tagRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const tag of html.matchAll(tagRe)) {
    const attrs = new Map<string, string>();
    for (const attr of (tag[2] ?? '').matchAll(attrRe)) {
      const name = attr[1];
      if (name) attrs.set(name.toLowerCase(), decode(attr[2] ?? attr[3] ?? attr[4] ?? ''));
    }
    out.push({ name: (tag[1] ?? '').toLowerCase(), attrs });
  }
  return out;
}

/** The URL path a built file is served at: `dist/press/index.html` is `/press/`. */
function servedPath(file: string): string {
  const rel = relative(DIST, file).split(sep).join('/');
  return `/${rel.replace(/(^|\/)index\.html$/, '$1')}`;
}

/** The built file a site path resolves to, or null. */
function fileFor(path: string): string | null {
  const clean = decodeURIComponent(path.split('#')[0]?.split('?')[0] ?? '');
  const candidates = clean.endsWith('/') ? [join(DIST, clean, 'index.html')] : [join(DIST, clean), join(DIST, clean, 'index.html')];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

function idsOf(file: string): Set<string> {
  const ids = new Set<string>();
  for (const m of readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)) {
    if (m[1]) ids.add(m[1]);
  }
  return ids;
}

/** Checks one URL found in `from`. `fetched` says whether the browser loads it by itself. */
function checkUrl(raw: string, from: string, pagePath: string, fetched: boolean): void {
  const url = raw.trim();
  if (url === '' || url.startsWith('data:')) return;
  checked += 1;
  if (url.startsWith('mailto:')) {
    if (!/^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(url)) problems.push(`${from}: malformed ${url}`);
    return;
  }
  const resolved = new URL(url, `https://${SITE_HOST}${pagePath}`);
  if (resolved.host !== SITE_HOST) {
    if (fetched) {
      problems.push(`${from}: loads ${url} from another domain`);
    } else {
      externalLinks.add(resolved.href);
    }
    return;
  }
  if (resolved.protocol !== 'https:') {
    problems.push(`${from}: ${url} is not https`);
  }
  const file = fileFor(resolved.pathname);
  if (!file) {
    problems.push(`${from}: ${url} does not exist`);
    return;
  }
  if (resolved.hash.length > 1 && file.endsWith('.html')) {
    const id = decodeURIComponent(resolved.hash.slice(1));
    if (!idsOf(file).has(id)) problems.push(`${from}: ${url} points at a missing id`);
  }
}

function checkCss(css: string, from: string, pagePath: string): void {
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    checkUrl(m[2] ?? '', `${from} (css)`, pagePath, true);
  }
  for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) {
    checkUrl(m[1] ?? '', `${from} (css @import)`, pagePath, true);
  }
}

const files = walk(DIST);
const pages = files.filter((f) => f.endsWith('.html'));

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const from = relative(DIST, page);
  const pagePath = servedPath(page);
  for (const tag of tags(html)) {
    const fetchedAttrs = FETCHED[tag.name] ?? [];
    for (const [name, value] of tag.attrs) {
      if (name === 'srcset') {
        for (const candidate of value.split(',')) {
          checkUrl(candidate.trim().split(/\s+/)[0] ?? '', from, pagePath, true);
        }
      } else if (name === 'href' && tag.name === 'a') {
        checkUrl(value, from, pagePath, false);
      } else if (fetchedAttrs.includes(name)) {
        checkUrl(value, from, pagePath, true);
      } else if (name === 'style') {
        checkCss(value, from, pagePath);
      }
    }
    if (tag.name === 'meta') {
      const key = tag.attrs.get('property') ?? tag.attrs.get('name') ?? '';
      const content = tag.attrs.get('content') ?? '';
      if (META_URLS.has(key)) checkUrl(content, `${from} (${key})`, pagePath, true);
    }
  }
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    checkCss(m[1] ?? '', from, pagePath);
  }
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    for (const u of (m[1] ?? '').matchAll(/https?:\/\/[^\s"'`)]+/g)) {
      problems.push(`${from}: an inline script names ${u[0]}`);
    }
  }
}

for (const file of files.filter((f) => f.endsWith('.css'))) {
  checkCss(readFileSync(file, 'utf8'), relative(DIST, file), servedPath(file));
}

for (const file of files.filter((f) => f.endsWith('.js'))) {
  for (const u of readFileSync(file, 'utf8').matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    if (!u[0].includes(SITE_HOST)) problems.push(`${relative(DIST, file)}: names ${u[0]}`);
  }
}

const sitemap = join(DIST, 'sitemap.xml');
if (existsSync(sitemap)) {
  for (const m of readFileSync(sitemap, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    checkUrl(m[1] ?? '', 'sitemap.xml', '/', true);
  }
} else {
  problems.push('sitemap.xml is missing');
}

const robots = join(DIST, 'robots.txt');
if (existsSync(robots)) {
  for (const m of readFileSync(robots, 'utf8').matchAll(/^Sitemap:\s*(\S+)/gm)) {
    checkUrl(m[1] ?? '', 'robots.txt', '/', true);
  }
} else {
  problems.push('robots.txt is missing');
}

const manifestFile = join(DIST, 'manifest.webmanifest');
if (existsSync(manifestFile)) {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { icons?: { src: string }[]; start_url?: string };
  for (const icon of manifest.icons ?? []) checkUrl(icon.src, 'manifest.webmanifest', '/', true);
  if (manifest.start_url) checkUrl(manifest.start_url, 'manifest.webmanifest', '/', true);
} else {
  problems.push('manifest.webmanifest is missing');
}

console.log(`Checked ${checked} references in ${pages.length} pages.`);
console.log(`Links that leave the site (navigation only, never loaded by the page):`);
for (const link of [...externalLinks].sort()) console.log(`  ${link}`);
if (problems.length > 0) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${p}`);
  process.exit(1);
}
console.log('\ncheck-dist: PASS (no broken reference, nothing loaded from another domain)');
