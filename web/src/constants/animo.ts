/**
 * Animo design tokens (web).
 *
 * Mirrors `mobile/src/constants/animo.ts` so the LGU Console shares one visual
 * language with the mobile app. Values come from the product design system
 * (Figma). Keep the two files in sync when tokens change.
 *
 * Font family: Plus Jakarta Sans (loaded in `main.tsx`).
 * Icons: Lucide (`lucide-react`).
 */

export const AnimoColors = {
  /** Brand green — primary actions, active states, logo. */
  green: '#1A6E1E',
  /** A lighter green used for disabled / inactive primary buttons. */
  greenDisabled: '#8FC291',
  /** Faint green tint for selected / active surfaces. */
  greenTint: '#EAF4EA',
  /** Deeper green for the login split panel. */
  greenDark: '#145717',

  /** Primary text. */
  black: '#121212',
  /** Secondary text / muted copy. */
  blackSecondary: '#424242',
  /** Tertiary / helper text. */
  muted: '#8A8A8A',

  background: '#FFFFFF',
  /** Subtle surface for inputs and neutral fields. */
  surface: '#F4F4F4',
  /** App shell background behind cards. */
  canvas: '#FAFAFA',
  border: '#E3E3E3',

  white: '#FFFFFF',

  /** Advisory severity + status tones. */
  danger: '#D64545',
  dangerTint: '#FBECEC',
  dangerBorder: '#E9A5A5',
  warning: '#E08A1E',
  warningTint: '#FDF0DC',
  warningBorder: '#F0C98A',
  caution: '#E5B93C',
  cautionTint: '#FCF6DE',
} as const;

/** Type scale from the Figma text styles (size / line-height in px). */
export const AnimoType = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  h1: { fontSize: 24, lineHeight: 32, fontWeight: 700 },
  h2: { fontSize: 18, lineHeight: 26, fontWeight: 700 },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: 600 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: 400 },
  bodyEmphasis: { fontSize: 15, lineHeight: 22, fontWeight: 600 },
  button: { fontSize: 20, lineHeight: 24, fontWeight: 600 },
  price: { fontSize: 20, lineHeight: 24, fontWeight: 700 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  tag: { fontSize: 11, lineHeight: 14, fontWeight: 600 },
} as const;

export type AnimoTypeVariant = keyof typeof AnimoType;

export const AnimoSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const AnimoRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
