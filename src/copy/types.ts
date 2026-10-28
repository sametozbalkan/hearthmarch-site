/**
 * The shape of every page's copy. A new language adds a folder beside `en/` whose files
 * satisfy these types, so a missing string fails `astro check`.
 *
 * Copy is written already cased. Never change its case in CSS or code: `text-transform`
 * and `toUpperCase()` get the Turkish dotted and dotless i wrong.
 */

/** The ids of the seven stations, in the order the tale tells them. */
export type StationId = 'hearth' | 'day' | 'steppe' | 'night' | 'eclipse' | 'goc' | 'together';

/** A page's title and description for search engines and link cards. */
export interface PageMeta {
  title: string;
  description: string;
}

/** Copy shared by every page. */
export interface SiteCopy {
  /** The game's name, as the logo's alternative text. */
  name: string;
  /** The logo's alternative text when it links home. */
  homeLink: string;
  wishlist: string;
  comingTo: string;
  footerNavLabel: string;
  pressKit: string;
  privacy: string;
  /** The label before the contact address. */
  contact: string;
  copyright: string;
  /** The link cards' image description. */
  cardAlt: string;
}

/** One chapter of the tale and the work shown beside it. */
export interface StationCopy {
  /** The chapter's numeral, shown small above its heading. */
  numeral: string;
  heading: string;
  paragraphs: string[];
  /** What the work shows, as its museum label's first line. */
  subject: string;
  /** The art form the work is inspired by, as its label's second line. */
  inspiredBy: string;
  alt: string;
}

export interface HomeCopy {
  meta: PageMeta;
  tagline: string;
  heroAlt: string;
  prologue: string;
  stations: Record<StationId, StationCopy>;
  /** The line that ends the tale, under the closing logo. */
  outro: string;
  /** The chapter rail's name for screen readers. */
  chapters: string;
  /** The name of the music's switch, at the top right (it stops and restarts the music). */
  music: string;
  /** The name of the music's volume control, beside its switch. */
  volume: string;
  /** The narration's switch: the ozan reads the tale only when asked to. */
  listen: string;
  /** The small control in a chapter's text that plays its narration again. */
  replay: string;
}

/** One row of the press kit's fact sheet: plain text, or one of the addresses in `src/config.ts`. */
export type Fact = { term: string; value: string } | { term: string; email: 'press' | 'contact' };

/** One downloadable file in the press kit. */
export interface PressFileCopy {
  name: string;
  /** A short line under the name. */
  note: string;
  alt: string;
}

export interface PressCopy {
  meta: PageMeta;
  heading: string;
  /** Holds `{email}` where the press address goes. */
  lead: string;
  factsHeading: string;
  facts: Fact[];
  aboutHeading: string;
  about: string[];
  featuresHeading: string;
  features: string[];
  artHeading: string;
  artNote: string;
  /** The download link's prefix, followed by the file's name. */
  download: string;
  files: {
    logo: PressFileCopy;
    icon: PressFileCopy;
    keyArt: PressFileCopy;
    vista: PressFileCopy;
  };
}

/** A section of the privacy policy: a heading and its paragraphs. */
export interface PolicySection {
  heading: string;
  paragraphs: string[];
}

export interface PrivacyCopy {
  meta: PageMeta;
  heading: string;
  /** Shown while the policy is a draft; an empty string hides the notice. */
  draftNotice: string;
  updated: string;
  summary: string;
  sections: PolicySection[];
  /** The third parties' privacy policies, named and linked. */
  linksHeading: string;
  links: { name: string; href: string }[];
  contactHeading: string;
  /** Holds `{email}` where the contact address from `src/config.ts` goes. */
  contactText: string;
}

export interface NotFoundCopy {
  meta: PageMeta;
  heading: string;
  text: string;
  back: string;
}

/** Everything one language says. */
export interface Copy {
  site: SiteCopy;
  home: HomeCopy;
  press: PressCopy;
  privacy: PrivacyCopy;
  notFound: NotFoundCopy;
}
