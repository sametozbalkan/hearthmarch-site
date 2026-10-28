/**
 * The site's settings: the one place to change the wishlist link, the domain and the addresses.
 */

/**
 * The game's Steam app id, or null while the game has no Steam page.
 *
 * Null: every wishlist button links to Steam's search for Hearthmarch.
 * A number (for example 1234560): every button links to the game's own Steam page.
 */
export const STEAM_APP_ID: number | null = null;

/** The site's address, without a trailing slash. Keep it equal to `site` in astro.config.ts. */
export const SITE_URL = 'https://hearthmarchgame.com';

/** The general contact address. */
export const CONTACT_EMAIL = 'contact@hearthmarchgame.com';

/** The address for press and creators. */
export const PRESS_EMAIL = 'press@hearthmarchgame.com';

/** The year in the copyright line. */
export const COPYRIGHT_YEAR = 2026;

/** The link every wishlist button uses, built from STEAM_APP_ID. */
export function steamUrl(): string {
  if (STEAM_APP_ID === null) {
    return 'https://store.steampowered.com/search/?term=Hearthmarch';
  }
  return `https://store.steampowered.com/app/${STEAM_APP_ID}/Hearthmarch/`;
}
