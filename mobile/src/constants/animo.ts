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

  /** Role card accent backgrounds (from the mockup). */
  roleFarmer: '#EAF4EA',
  roleBuyer: '#FBEFDD',

  /** Error / danger — used for OTP failure and validation. */
  danger: '#D64545',
  dangerTint: '#FBECEC',
  dangerBorder: '#E9A5A5',
} as const;

/**
 * Type scale from the Figma text styles (size / auto line-height).
 * `weight` values are the Plus Jakarta Sans font-family names loaded at runtime.
 */
export const AnimoType = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: 'PlusJakartaSans_700Bold' },
  h1: { fontSize: 24, lineHeight: 32, fontFamily: 'PlusJakartaSans_700Bold' },
  h2: { fontSize: 18, lineHeight: 26, fontFamily: 'PlusJakartaSans_700Bold' },
  h3: { fontSize: 16, lineHeight: 22, fontFamily: 'PlusJakartaSans_600SemiBold' },
  body: { fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans_400Regular' },
  bodyEmphasis: { fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans_600SemiBold' },
  button: { fontSize: 20, lineHeight: 24, fontFamily: 'PlusJakartaSans_600SemiBold' },
  price: { fontSize: 20, lineHeight: 24, fontFamily: 'PlusJakartaSans_700Bold' },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  tag: { fontSize: 11, lineHeight: 14, fontFamily: 'PlusJakartaSans_600SemiBold' },
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

/** Fonts to load with `useFonts`. */
export const AnimoFontMap = {
  PlusJakartaSans_400Regular: require('@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf'),
  PlusJakartaSans_500Medium: require('@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf'),
  PlusJakartaSans_600SemiBold: require('@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf'),
  PlusJakartaSans_700Bold: require('@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf'),
};
