# hearthmarchgame.com

The website of **Hearthmarch**, a kingdom builder on the Turkic steppe: the home page, the press kit and the privacy policy. It is a static site built with [Astro](https://astro.build) and served by GitHub Pages at `hearthmarchgame.com`.

The home page is one day on the steppe, told on one stage. After the first screen the stage stays put and the scroll moves the tale from scene to scene: the prologue, seven chapters, each beside a work inspired by a traditional art of the steppe, and a finale in which the night of the eclipse passes and dawn comes. Quiet music plays under the tale, and the tale can be heard read aloud.

## Build and preview

You need Node 26 (see `.nvmrc`).

```sh
npm ci             # install exactly what package-lock.json lists
npm run dev        # a live preview at http://localhost:4321
npm run build      # the static site, into dist/
npm run preview    # serve dist/ at http://localhost:4321
```

The checks the deploy runs, which you can run yourself:

```sh
npm run check      # type-check the Astro files and the TypeScript
npm run build
npm run validate   # validate the built HTML (html-validate)
npm run links      # every internal link resolves, and nothing loads from another domain
npm run verify     # all four in a row
```

The npm scripts run Astro with its usage telemetry turned off (`scripts/astro.ts` sets `ASTRO_TELEMETRY_DISABLED=1`). Run Astro through them, not through `npx astro`.

The images are made at build time (AVIF, with WebP for older browsers) and cached in `node_modules/.astro/`. The cache does not notice a change to the encoder settings in `astro.config.ts`: after changing them, delete that folder before you build.

## The wishlist button

Every wishlist button takes its link from one setting: `STEAM_APP_ID` in `src/config.ts`.

- While it is `null`, the buttons link to Steam's search for Hearthmarch.
- Set it to the game's Steam app id (a number) once the Steam page exists, and every button links to `https://store.steampowered.com/app/<id>/Hearthmarch/`.

The contact addresses and the copyright year live in the same file.

## Where things are

| Path | Holds |
|---|---|
| `src/config.ts` | The wishlist setting, the site's address, the contact addresses |
| `src/copy/en/` | Every word on the site, one file per page; `src/copy/types.ts` is their shape |
| `src/views/` | The pages' layouts, each taking a language |
| `src/pages/` | The routes: `/`, `/press/`, `/privacy/`, the 404 page, and the files built at build time (icons, the web manifest, `sitemap.xml`, `robots.txt`, the link card and the press kit's downloads) |
| `src/components/`, `src/layouts/` | The scenes, the finale, the chapter rail, the sound's controls, the buttons, the footer and the document head |
| `src/tale.ts` | The stage's timeline: when each scene arrives, holds and leaves, and the keyframes of everything that moves |
| `src/styles/global.css`, `src/styles/tale.css` | The styles every page shares; the home page's tale, its stage and its stacked fallback |
| `src/scripts/stage.ts` | The stage's script: which scene is on, the chapter rail, links to a scene, the fit check, and the motion where CSS scroll-driven animations are missing |
| `src/sound.ts`, `src/scripts/sound.ts` | What the tale sounds like (data), and the player |
| `src/sound-files.ts`, `public/audio/` | The audio files and their lengths, loop points and loudness (written by `scripts/encode-audio.ts`) |
| `src/art.ts`, `src/assets/art/` | The art and the order of the chapters |
| `public/fonts/` | The two fonts and their licences |
| `public/CNAME` | The custom domain |
| `scripts/` | The telemetry-free Astro runner, the link checker and the audio encoder |

## How the page moves

The scroll is the browser's own: the wheel, touch, the keys and the scrollbar work as on any page, and nothing re-times them.

- **The stage.** After the hero, one screen stays pinned while the page scrolls past it. Each scene holds for about a screen of scroll; between scenes, the old one leaves, the next hour's wall rises over it with its colour, and the new scene arrives. Inside a scene the work slowly pushes in.
- **The cut-outs** each cross the stage once, between two scenes: the felt clouds from the hero into the tale, the standard between II and III, the serpent's tail between IV and V, the Hüma between VI and VII. **The kilim** travels across its scene, so the caravan walks on.
- **The finale:** the shadow slides off the moon, moonlight and a first light of dawn rise, embers drift up from the fire under the logo, then the closing line and the wishlist button arrive.
- **The chapter rail** at the stage's edge shows where the tale is; each mark, and a link such as `/#night`, jumps to its chapter.
- **One timeline, two engines.** `src/tale.ts` lists every move; the build turns it into CSS scroll-driven animations, and where a browser lacks them `src/scripts/stage.ts` plays the same keyframes from the scroll position. Only `opacity` and `transform` animate.
- **Each scene fits its screen**, from a small phone to a wide desktop. Where a chapter's text would not fit, its second paragraph comes as a second step; where even that would not fit (very short screens, very large text), the page falls back to the stacked layout.
- **Under "reduce motion"** nothing moves: scenes change by plain fades, the kilim hangs whole, and the finale shows its end. **With JavaScript off** the page reads as a stack of stations, one after another, every chapter, work and label in order.

## The sound

What plays where is data, in `src/sound.ts`; the player is `src/scripts/sound.ts`.

- **The music** plays under the whole tale, looping. It starts by itself: at once where the browser allows sound, otherwise on the visitor's first press or key anywhere on the page (a scroll never starts it). It fades in to 20 % of its full volume. The switch at the top right, the page's first focusable element, stops and restarts it; the slider beside it sets its volume.
- **Two quiet accents** play over it: drums under chapter V, and a short dawn phrase when the moon clears in the finale.
- **The narration** plays only when the visitor asks for it, with "Listen to the tale": each chapter is read as it takes the stage, the music ducking under the voice, and the paragraph being read is marked. A small control in a chapter's text reads it again.
- **Nothing loads before** the music starts or the narration is asked for; then the scene on the stage loads first, and the next one ahead of time. Nothing is stored: every visit starts the same way.
- **The files.** The loops come in Opus (WebM) and, for browsers without Opus, AAC (MP4); the player picks the one the browser decodes. Each loop carries half a second of its own sound on either side, and the player loops between those pads, so it repeats without a gap or a click. The narration is MP3. `scripts/encode-audio.ts` writes them all, with `src/sound-files.ts`, from masters kept outside this repository; its header says how to run it.

The audio files, all © 2026 Hearthmarch, all rights reserved:

| File | What it is |
|---|---|
| `public/audio/bed/music.webm`, `music.m4a` | The music under the tale, looping |
| `public/audio/accent/tutulma-drums.webm`, `tutulma-drums.m4a` | The drums under chapter V, looping |
| `public/audio/accent/dawn-sting.webm`, `dawn-sting.m4a` | The dawn phrase in the finale |
| `public/audio/voice/*.mp3` | The narration: the prologue, two clips for each chapter (its heading and first paragraph, then its second paragraph) and the closing line |
| `public/audio/probe.webm` | A moment of silence that tells the player whether the browser decodes Opus |

## Adding Turkish later

1. Add `'tr'` to `Lang` and `LANGS` in `src/i18n.ts` (and `tr_TR` to `OG_LOCALE`).
2. Copy `src/copy/en/` to `src/copy/tr/`, translate it, and register it in `src/copy/index.ts`. The types fail the check until every string exists.
3. Add `src/pages/tr/index.astro`, `src/pages/tr/press/index.astro` and `src/pages/tr/privacy/index.astro`, each rendering its view with `lang="tr"`.

Write Turkish already cased. Never change text's case in CSS (`text-transform`, small caps) or in code (`toUpperCase()`): they get the dotted and dotless i (İ, ı) wrong. The fonts already carry every Turkish letter.

## Fonts

Both fonts are under the SIL Open Font License 1.1; their licences sit beside them in `public/fonts/`.

- **Fraunces** (headings and buttons), by Undercase Type: its soft variant, like cut felt.
- **Literata** (text), by TypeTogether.

Each is a WOFF2 file per subset (Latin, and Latin Extended for ğ, ş and İ), self-hosted. They were made from the `@fontsource-variable/fraunces` and `@fontsource-variable/literata` 5.3.0 files with fontTools' instancer, pinning Fraunces to `opsz` 72, `SOFT` 100, `WONK` 0 and `wght` 500 to 700, and Literata to `wght` 400 to 650.

## Deploying

`.github/workflows/deploy.yml` builds the site, runs the checks and deploys `dist/` with GitHub's official Pages actions on every push to `main`. For it to work, the repository's Pages source must be set to **GitHub Actions**, and the custom domain `hearthmarchgame.com` set in the Pages settings, with the DNS records from [GitHub's guide to custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) at the domain's registrar.

## Privacy

The site sets no cookies, runs no analytics, stores nothing in the browser and loads nothing from another domain: every file comes from `hearthmarchgame.com`. `npm run links` fails the build if that ever changes, if a page names an audio file (only the player loads audio), or if the player names a file that does not exist.

## Licence

© 2026 Hearthmarch. All rights reserved.

The code, the art and the audio in this repository are not open source: you may not copy, reuse or redistribute them. The press kit's images may be used in coverage of the game. The fonts in `public/fonts/` are not ours: they are under the SIL Open Font License 1.1.
