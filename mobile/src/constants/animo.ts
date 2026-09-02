/**
 * Animo design tokens.
 *
 * Single source of truth for brand colors, typography, spacing and radii used
 * across the Animo app. These come from the product design system (Figma).
 *
 * Font family: Plus Jakarta Sans (loaded in the root layout).
 * Icons: Lucide (`lucide-react-native`).
 */

export const AnimoColors = {
  // ─── LEGACY TOKENS (kept for backward compatibility) ──────────────────────
  /** Brand green — primary actions, active states, logo. */
  green: '#1A6E1E',
  /** A lighter green used for disabled / inactive primary buttons. */
  greenDisabled: '#8FC291',
  /** Faint green tint for selected role card background. */
  greenTint: '#EAF4EA',
  /** Primary text. */
  black: '#121212',
  /** Secondary text / muted copy. */
  blackSecondary: '#424242',
  /** Tertiary / helper text. */
  muted: '#8A8A8A',
  background: '#FFFFFF',
  /** Subtle surface for inputs and neutral fields. */
  surface: '#F4F4F4',
  border: '#E3E3E3',
  /** Border for the selected role card. */
  borderSelected: '#1A6E1E',
  white: '#FFFFFF',
  /** Role card accent backgrounds. */
  roleFarmer: '#EAF4EA',
  roleBuyer: '#FBEFDD',
  /** Error / danger — used for OTP failure and validation. */
  danger: '#D64545',
  dangerTint: '#FBECEC',
  dangerBorder: '#E9A5A5',

  // ─── SURFACE COLORS ────────────────────────────────────────────────────────
  /** Main UI surface, cards, modals. */
  surfacePrimary: '#FFFFFF',
  /** Elevated surfaces, sidebars. */
  surfaceSecondary: '#F5F5F5',
  /** Subtle backgrounds, input fills. */
  surfaceTertiary: '#EFEFEF',
  /** Lowest-level fill, page wash. */
  surfaceQuaternary: '#E8E8E8',
  /** Primary brand surface, CTAs. */
  accentPrimary: '#2E7D32',
  /** Tinted brand fill, hover state. */
  accentPrimaryLight: '#C8E6C9',
  /** Supporting brand surface. */
  accentSecondary: '#558B2F',
  /** Light tint for secondary accents. */
  accentSecondaryLight: '#DCEDC8',
  /** Mild severity surface / badge fill. */
  mild: '#F9A825',
  /** Mild severity tinted fill, inline banners. */
  mildLight: '#FFECB3',
  /** Moderate severity surface. */
  moderate: '#F57C00',
  /** Moderate severity tinted fill, inline banners. */
  moderateLight: '#FFE0B2',
  /** Severe severity surface, destructive action surface. */
  caution: '#D32F2F',
  /** Error tinted fill, inline alerts. */
  cautionLight: '#FFCDD2',

  // ─── BACKGROUND COLORS ────────────────────────────────────────────────────
  /** Base page / app background. */
  appBackground: '#FAFAFA',
  /** Content section fills. */
  sectionBackground: '#F0F0F0',
  /** Dark mode base, overlays. */
  darkBackground: '#121212',
  /** Dark mode elevated surfaces. */
  darkSurface: '#1E1E1E',

  // ─── TEXT COLORS ──────────────────────────────────────────────────────────
  /** Headlines, primary body copy. */
  textHighEmphasis: '#121212',
  /** Secondary text, descriptions. */
  textMediumEmphasis: '#424242',
  /** Captions, helper text, disabled. */
  textLowEmphasis: '#909090',
  /** Inactive / disabled text states. */
  textDisabled: '#BDBDBD',
  /** Links, active labels on light background. */
  textAccentPrimary: '#2E7D32',
  /** Supporting accent text. */
  textAccentSecondary: '#558B2F',
  /** Primary text on dark surfaces. */
  textHighEmphasisInverse: '#FFFFFF',
  /** Error messages, warnings. */
  textCaution: '#D32F2F',

  // ─── OBJECT COLORS ────────────────────────────────────────────────────────
  /** Icons, filled UI elements. */
  objectHighEmphasis: '#121212',
  /** Secondary icons, toggles. */
  objectMediumEmphasis: '#424242',
  /** Decorative icons, placeholders. */
  objectLowEmphasis: '#757575',
  /** Disabled icons, inactive states. */
  objectDisabled: '#BDBDBD',
  /** Brand-colored icons, active tabs. */
  objectAccentPrimary: '#2E7D32',
  /** Secondary brand objects. */
  objectAccentSecondary: '#558B2F',
  /** Mild severity icon fill. */
  objectMild: '#F9A825',
  /** Moderate severity icon fill. */
  objectModerate: '#F57C00',
  /** Error icons, destructive actions. */
  objectCaution: '#D32F2F',
  /** Icons on dark / colored surfaces. */
  objectHighEmphasisInverse: '#FFFFFF',
  /** Bookmarks, favorites, reactions. */
  objectExpressivePink: '#FF4081',

  // ─── BORDER COLORS ────────────────────────────────────────────────────────
  /** Strong borders, focused inputs. */
  borderHighEmphasis: '#121212',
  /** Standard card / divider borders. */
  borderMediumEmphasis: '#424242',
  /** Subtle separators, ghost borders. */
  borderLowEmphasis: '#E0E0E0',
  /** Active / selected element border. */
  borderAccentPrimary: '#2E7D32',
  /** Mild severity state border. */
  borderMild: '#F9A825',
  /** Moderate severity state border. */
  borderModerate: '#F57C00',
  /** Error state borders, alerts. */
  borderCaution: '#D32F2F',
  /** Borders on dark background components. */
  borderHighEmphasisInverse: '#FFFFFF',

  // ─── HIGHLIGHT COLORS ─────────────────────────────────────────────────────
  /** Error text highlights, markups. */
  highlightError: '#FFCDD2',
  /** Removed / cleared highlight state. */
  highlightNone: '#F5F5F5',
  /** Search results, text markup. */
  highlightYellow: '#FFEB3B',

  // ─── FOCUS COLORS ─────────────────────────────────────────────────────────
  /** Primary focus indicator for keyboard and screen reader navigation. */
  focusRing: '#1E88E5',
  /** Focus state tinted fill, input highlight. */
  focusRingLight: '#BBDEFB',
  /** Focus ring on dark surfaces or colored buttons. */
  focusRingInverse: '#64B5F6',
} as const;

/**
 * Type scale from the Figma text styles (size / auto line-height).
 * `weight` values are the Plus Jakarta Sans font-family names loaded at runtime.
 */
export const AnimoType = {
  display: { fontSize: 34, lineHeight: 42, fontFamily: 'PlusJakartaSans_700Bold' },
  h1: { fontSize: 26, lineHeight: 34, fontFamily: 'PlusJakartaSans_700Bold' },
  h2: { fontSize: 20, lineHeight: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: 'PlusJakartaSans_600SemiBold' },
  body: { fontSize: 15, lineHeight: 24, fontFamily: 'PlusJakartaSans_400Regular' },
  bodyEmphasis: { fontSize: 15, lineHeight: 24, fontFamily: 'PlusJakartaSans_600SemiBold' },
  button: { fontSize: 16, lineHeight: 24, fontFamily: 'PlusJakartaSans_700Bold' },
  price: { fontSize: 22, lineHeight: 28, fontFamily: 'PlusJakartaSans_700Bold' },
  caption: { fontSize: 14, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular' },
  tag: { fontSize: 12, lineHeight: 16, fontFamily: 'PlusJakartaSans_600SemiBold' },
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

/** Page-level layout — apply once on the screen, not on every child. */
export const AnimoLayout = {
  screenGutter: AnimoSpacing.lg,
  cardGap: AnimoSpacing.md,
  sectionGap: AnimoSpacing.lg,
} as const;

export const AnimoRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/**
 * Login screen colors sampled from brand assets (Animo-Logo.png, login-banner.png).
 * `brandGreen` is the dominant logo green (#1A6E1E). Page background uses the app
 * neutral wash — banner art is illustrative and does not include the logo-area gray.
 */
export const AnimoLoginColors = {
  brandGreen: '#1A6E1E',
  pageBackground: '#FAFAFA',
  linkOnGreen: '#FFFFFF',
  linkOnWhite: '#1A6E1E',
  /** Body/label/helper text sitting directly on the green form card. */
  textOnGreen: '#FFFFFF',
} as const;

/** Fonts to load with `useFonts`. */
export const AnimoFontMap = {
  PlusJakartaSans_400Regular: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
  PlusJakartaSans_500Medium: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
  PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
};