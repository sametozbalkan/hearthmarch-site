import type { Lang } from '../i18n.ts';
import { home } from './en/home.ts';
import { notFound } from './en/not-found.ts';
import { press } from './en/press.ts';
import { privacy } from './en/privacy.ts';
import { site } from './en/site.ts';
import type { Copy } from './types.ts';

const COPY: Record<Lang, Copy> = {
  en: { site, home, press, privacy, notFound },
};

/** Everything the site says in one language. */
export function copyFor(lang: Lang): Copy {
  return COPY[lang];
}
