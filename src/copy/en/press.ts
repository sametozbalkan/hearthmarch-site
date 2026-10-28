import type { PressCopy } from '../types.ts';

export const press: PressCopy = {
  meta: {
    title: 'Press kit: Hearthmarch',
    description:
      'Facts, a short description, key features and full-size art of Hearthmarch, a kingdom builder on the Turkic steppe.',
  },
  heading: 'Press kit',
  lead: 'The facts, the story in short and the art at full size. For anything else, write to {email}.',
  factsHeading: 'Fact sheet',
  facts: [
    { term: 'Title', value: 'Hearthmarch' },
    { term: 'Developer', value: 'Hearthmarch' },
    { term: 'Platforms', value: 'PC (Steam) and Android' },
    { term: 'Release date', value: 'To be announced' },
    { term: 'Languages', value: 'English and Turkish' },
    { term: 'Players', value: 'One or two: split-screen on one PC, or online across PC and Android' },
    { term: 'Press contact', email: 'press' },
  ],
  aboutHeading: 'About the game',
  about: [
    'Hearthmarch is a calm, side-scrolling kingdom builder set in the myths of the Turkic and Central Asian steppe. You ride as a Han or a Hatun who carries the kut, the mandate of heaven, with a purse of coins and almost nothing on the screen.',
    'Coins recruit wanderers, buy tools and raise walls. By day the camp grows around its hearth fire; by night the Körmös, the servants of Erlik Han, come out of the gates of Tamu to take it apart. On some nights the moon goes dark and the night comes in force.',
    'When a land is held, the göç caravan carries the kingdom on to the next, through worlds that each change the rules. A friend can ride beside you, on one PC or online across PC and phone.',
  ],
  featuresHeading: 'Key features',
  features: [
    'A kingdom built with coins alone: no menus while you play, almost nothing on the screen.',
    'Calm days and tense nights, and eclipse nights when the dark comes in force.',
    'The myths of the steppe: Tengri’s sky, the kut, the Körmös of Erlik Han and the Hüma bird.',
    'Six worlds, from the steppe and the taiga to Mount Kaf and the underworld, each with its own rules.',
    'Two-player co-op: split-screen on one PC, or online across PC and Android.',
    'When a ruler falls, an heir takes up the kut; a relaxed mode returns you to the last dawn instead.',
  ],
  artHeading: 'Art',
  artNote: 'Each file is full size. © 2026 Hearthmarch. You may use these images in coverage of the game.',
  download: 'Download',
  files: {
    logo: {
      name: 'The logo',
      note: 'On a transparent background',
      alt: 'The Hearthmarch logo: the name in cream felt letters edged in red, under a horse-tail standard over a small flame.',
    },
    icon: {
      name: 'The icon',
      note: 'A gold flame in a ring of ram’s horns on red felt',
      alt: 'The Hearthmarch icon: a gold flame inside a ring of ram’s horns on red felt.',
    },
    keyArt: {
      name: 'The key art',
      note: 'The Han and the Hatun at the hearth, as night comes in',
      alt: 'The Han and the Hatun on horseback at their camp fire at dusk, under a half-dark moon, as the creatures of the night come in from the right.',
    },
    vista: {
      name: 'The ridge',
      note: 'The two rulers above their camp',
      alt: 'The Han and the Hatun on horseback on a grassy ridge at dusk, above a camp of yurts around a bonfire, with snowy mountains and a large moon beyond.',
    },
  },
};
