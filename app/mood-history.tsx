/**
 * app/mood-history.tsx
 *
 * Fallback route for Expo Router.
 * This fixes:
 * "The file ./mood-history.web.tsx does not have a fallback sibling file without a platform extension."
 *
 * Expo Router requires a non-platform file alongside .web.tsx files.
 */

export { default } from './mood-history.web';