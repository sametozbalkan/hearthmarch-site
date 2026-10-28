# hearthmarchgame.com

The website of **Hearthmarch**, a kingdom builder on the Turkic steppe: the home page, the press kit and the privacy policy. It is a static site built with [Astro](https://astro.build) and served by GitHub Pages at `hearthmarchgame.com`.

The home page is one day on the steppe. It opens at dawn and ends on the night of the eclipse, and on the way it shows seven works, each inspired by a traditional art of the steppe, beside the seven chapters of the game's tale.

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
| `src/components/`, `src/layouts/` | The stations, the buttons, the footer and the document head |
| `src/styles/global.css` | All the styles: the colour of each hour, the stations, the motion |
| `src/scripts/motion.ts` | The motion's fallback for browsers without CSS scroll-driven animations |
| `src/art.ts`, `src/assets/art/` | The art and the order of the stations |
| `public/fonts/` | The two fonts and their licences |
| `public/CNAME` | The custom domain |
| `scripts/` | The telemetry-free Astro runner and the link checker |

## How the page moves

- **The colour of the day** is painted on the page itself: each station has its own wall colour, and the gaps between stations blend one hour into the next. It needs no script and no animation.
- **The kilim** grows wider than the screen and slides sideways while its station passes, so the caravan walks across. **The four cut-outs** (the felt clouds, the standard, the serpent's tail and the Hüma) drift a little with the scroll in the gaps between stations.
- Both use CSS scroll-driven animations. Where a browser lacks them, `src/scripts/motion.ts` drives the same motion with an IntersectionObserver.
- Under "reduce motion", everything holds still and the kilim hangs whole within the page. With JavaScript off, the page reads in full.

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

The site sets no cookies, runs no analytics and loads nothing from another domain: every file comes from `hearthmarchgame.com`. `npm run links` fails the build if that ever changes.

## Licence

© 2026 Hearthmarch. All rights reserved.

The code and the art in this repository are not open source: you may not copy, reuse or redistribute them. The press kit's images may be used in coverage of the game. The fonts in `public/fonts/` are not ours: they are under the SIL Open Font License 1.1.
