/**
 * The site's languages. English lives at `/`; a later Turkish version lives at `/tr/`,
 * with its copy in `src/copy/tr/` typed like the English copy.
 */

export type Lang = 'en';

/** Every language the site is built in, the default first. */
export const LANGS: readonly Lang[] = ['en'];

export const DEFAULT_LANG: Lang = 'en';

/** The `og:locale` value of each language. */
export const OG_LOCALE: Record<Lang, string> = {
  en: 'en_GB',
};

/**
 * A page's path in a language: `/press/` in English, `/tr/press/` in Turkish.
 * `path` starts and ends with a slash.
 */
export function localePath(lang: Lang, path: string): string {
  return lang === DEFAULT_LANG ? path : `/${lang}${path}`;
}
