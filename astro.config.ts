import { defineConfig } from 'astro/config';

// A static site served by GitHub Pages at its custom domain, so no `base`.
export default defineConfig({
  site: 'https://hearthmarchgame.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // The pages' CSS is small; inlining it saves a render-blocking request.
    inlineStylesheets: 'always',
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        avif: { quality: 50, effort: 6 },
        webp: { quality: 80, effort: 5 },
        jpeg: { quality: 82, mozjpeg: true },
      },
    },
  },
  devToolbar: { enabled: false },
});
