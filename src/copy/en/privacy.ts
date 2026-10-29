import type { PrivacyCopy } from '../types.ts';

export const privacy: PrivacyCopy = {
  meta: {
    title: 'Privacy policy: Hearthmarch',
    description:
      'What the Hearthmarch website and game do with your data: the site collects nothing, and the game sends nothing unless you play online co-op.',
  },
  heading: 'Privacy policy',
  draftNotice: '',
  updated: 'Last updated 28 October 2026',
  summary:
    'In short: this website collects nothing about you, and the game sends nothing about you unless you play online co-op, which runs on Epic Online Services.',
  sections: [
    {
      heading: 'Who we are',
      paragraphs: ['Hearthmarch makes the game Hearthmarch and runs this website, hearthmarchgame.com. This policy covers both.'],
    },
    {
      heading: 'This website',
      paragraphs: [
        'The website sets no cookies, runs no analytics and loads nothing from other sites: every file comes from hearthmarchgame.com. We collect no information about visitors.',
        'The site is hosted on GitHub Pages. Like any web host, GitHub logs requests, including the visitor’s IP address, to run and secure its service, and handles those logs under its own privacy statement.',
        'If you write to us, your message reaches our mailbox at Google Workspace. We use it only to answer you.',
      ],
    },
    {
      heading: 'The game',
      paragraphs: [
        'The game has no telemetry, no analytics and no ads, and it does not track you. Your saves and settings stay on your device.',
        'Played alone, or by two players on one PC, the game itself sends nothing over the network.',
      ],
    },
    {
      heading: 'Online co-op',
      paragraphs: [
        'Online co-op runs on Epic Online Services (EOS), a service of Epic Games. The EOS software starts only when you start online co-op, never when the game starts or in offline play.',
        'While online play runs, EOS connects you and your friend through Epic’s servers and sends Epic its own usage data, such as session events and its settings; the game cannot turn this off. When the session ends, EOS rests until you close the game.',
        'The game gives Epic no name or account of yours: you appear as “Player”, and your device is described only by the name of its operating system. As in any online game, Epic sees your IP address, and your friend’s device may see it too. Epic handles this data under its own privacy policy.',
      ],
    },
    {
      heading: 'Steam and Google Play',
      paragraphs: [
        'On PC the game comes through Steam. Steam’s features, such as your friends list and invites, are run by Valve under Steam’s privacy policy.',
        'On Android the game comes through Google Play, and any purchase in the game is made through Google Play, under Google’s privacy policy.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'We hold no personal data about you, apart from any message you send us, which we delete when you ask. For the data that Epic, Valve, Google or GitHub hold, use the tools and contacts in their privacy policies.',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: ['When this policy changes, the new version will appear on this page with its date.'],
    },
  ],
  linksHeading: 'Their privacy policies',
  links: [
    { name: 'Epic Games', href: 'https://www.epicgames.com/site/en-US/privacypolicy' },
    { name: 'Valve (Steam)', href: 'https://store.steampowered.com/privacy_agreement/' },
    { name: 'Google', href: 'https://policies.google.com/privacy' },
    { name: 'GitHub', href: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement' },
  ],
  contactHeading: 'Contact',
  contactText: 'Questions about this policy go to {email}.',
};
