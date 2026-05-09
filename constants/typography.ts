// constants/typography.ts
// Unified typography scale for MoodMarket (native + web)
//
// Usage:
//   import { TYPOGRAPHY } from '@/constants/typography';
//   <Text style={TYPOGRAPHY.h1}>Title</Text>

export const FONTS = {
  sans: 'Sora',
  serif: 'Lora',
} as const;

// ─── Semantic type scale ──────────────────────────────────────────────────────
// Sizes are in px (web) / dp (native). Weights follow a 6-step system.

export const TYPOGRAPHY = {
  /** Hero display — user names, large brand moments */
  display: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
    lineHeight: 32,
    fontFamily: FONTS.sans,
  },

  /** Page / screen titles */
  h1: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 28,
    fontFamily: FONTS.serif,
  },

  /** Section headings, card titles */
  h2: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 24,
    fontFamily: FONTS.serif,
  },

  /** Sub-section headings, labels */
  h3: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 20,
    fontFamily: FONTS.sans,
  },

  /** Primary body text */
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 20,
    fontFamily: FONTS.sans,
  },

  /** Secondary body, descriptions */
  bodySmall: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 18,
    fontFamily: FONTS.sans,
  },

  /** Captions, helper text */
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    lineHeight: 14,
    fontFamily: FONTS.sans,
  },

  /** Eyebrow labels — uppercase, tracked out */
  overline: {
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    lineHeight: 12,
    fontFamily: FONTS.sans,
    textTransform: 'uppercase' as const,
  },

  /** Buttons, CTAs */
  button: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
    fontFamily: FONTS.sans,
  },

  /** Prices, numeric highlights */
  price: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
    lineHeight: 20,
    fontFamily: FONTS.sans,
  },
} as const;

// ─── Web-only CSS helpers ─────────────────────────────────────────────────────

export function typographyCss(variant: keyof typeof TYPOGRAPHY): string {
  const t = TYPOGRAPHY[variant];
  const family = t.fontFamily === FONTS.serif
    ? `"${FONTS.serif}", serif`
    : `"${FONTS.sans}", sans-serif`;
  return `
    font-family: ${family};
    font-size: ${t.fontSize}px;
    font-weight: ${t.fontWeight};
    letter-spacing: ${t.letterSpacing}px;
    line-height: ${t.lineHeight}px;
  `;
}
