/**
 * Animo design tokens.
 *
 * Single source of truth for brand colors, typography, spacing and radii used
 * across the Animo app. These come from the product design system (Figma).
 *
 * Font family: Nunito (loaded in the root layout).
 * Icons: Lucide (`lucide-react-native`).
 */

export const AnimoColors = {
  // ─── LEGACY TOKENS (kept for backward compatibility) ──────────────────────
  /** Brand green — primary actions, active states, logo. */
  green: "#1A6E1E",
  /** A lighter green used for disabled / inactive primary buttons. */
  greenDisabled: "#8FC291",
  /** Faint green tint for selected role card background. */
  greenTint: "#EAF4EA",
  /** Primary text. */
  black: "#121212",
  /** Secondary text / muted copy. */
  blackSecondary: "#424242",
  /** Tertiary / helper text. */
  muted: "#8A8A8A",
  background: "#FFFFFF",
  /** Subtle surface for inputs and neutral fields. */
  surface: "#F4F4F4",
  border: "#E3E3E3",
  /** Border for the selected role card. */
  borderSelected: "#1A6E1E",
  white: "#FFFFFF",
  /** Role card accent backgrounds. */
  roleFarmer: "#EAF4EA",
  roleBuyer: "#FBEFDD",
  /** Error / danger — used for OTP failure and validation. */
  danger: "#D64545",
  dangerTint: "#FBECEC",
  dangerBorder: "#E9A5A5",

  // ─── SURFACE COLORS ────────────────────────────────────────────────────────
  /** Main UI surface, cards, modals. */
  surfacePrimary: "#FFFFFF",
  /** Elevated surfaces, sidebars. */
  surfaceSecondary: "#F5F5F5",
  /** Subtle backgrounds, input fills. */
  surfaceTertiary: "#EFEFEF",
  /** Lowest-level fill, page wash. */
  surfaceQuaternary: "#E8E8E8",
  /** Primary brand surface, CTAs. */
  accentPrimary: "#1A6E1E",
  /** Tinted brand fill, hover state. */
  accentPrimaryLight: "#C8E6C9",
  /** Supporting brand surface. */
  accentSecondary: "#558B2F",
  /** Light tint for secondary accents. */
  accentSecondaryLight: "#DCEDC8",
  /** Mild severity surface / badge fill. */
  mild: "#F9A825",
  /** Mild severity tinted fill, inline banners. */
  mildLight: "#FFECB3",
  /** Moderate severity surface. */
  moderate: "#F57C00",
  /** Moderate severity tinted fill, inline banners. */
  moderateLight: "#FFE0B2",
  /** Severe severity surface, destructive action surface. */
  caution: "#D32F2F",
  /** Error tinted fill, inline alerts. */
  cautionLight: "#FFCDD2",

  // ─── BACKGROUND COLORS ────────────────────────────────────────────────────
  /** Base page / app background. */
  appBackground: "#FAFAFA",
  /** Content section fills. */
  sectionBackground: "#F0F0F0",
  /** Dark mode base, overlays. */
  darkBackground: "#121212",
  /** Dark mode elevated surfaces. */
  darkSurface: "#1E1E1E",

  // ─── TEXT COLORS ──────────────────────────────────────────────────────────
  /** Headlines, primary body copy. */
  textHighEmphasis: "#121212",
  /** Secondary text, descriptions. */
  textMediumEmphasis: "#424242",
  /** Captions, helper text, disabled. */
  textLowEmphasis: "#909090",
  /** Inactive / disabled text states. */
  textDisabled: "#BDBDBD",
  /** Links, active labels on light background. */
  textAccentPrimary: "#2E7D32",
  /** Supporting accent text. */
  textAccentSecondary: "#558B2F",
  /** Primary text on dark surfaces. */
  textHighEmphasisInverse: "#FFFFFF",
  /** Error messages, warnings. */
  textCaution: "#D32F2F",

  // ─── OBJECT COLORS ────────────────────────────────────────────────────────
  /** Icons, filled UI elements. */
  objectHighEmphasis: "#121212",
  /** Secondary icons, toggles. */
  objectMediumEmphasis: "#424242",
  /** Decorative icons, placeholders. */
  objectLowEmphasis: "#757575",
  /** Disabled icons, inactive states. */
  objectDisabled: "#BDBDBD",
  /** Brand-colored icons, active tabs. */
  objectAccentPrimary: "#2E7D32",
  /** Secondary brand objects. */
  objectAccentSecondary: "#558B2F",
  /** Mild severity icon fill. */
  objectMild: "#F9A825",
  /** Moderate severity icon fill. */
  objectModerate: "#F57C00",
  /** Error icons, destructive actions. */
  objectCaution: "#D32F2F",
  /** Icons on dark / colored surfaces. */
  objectHighEmphasisInverse: "#FFFFFF",
  /** Bookmarks, favorites, reactions. */
  objectExpressivePink: "#FF4081",

  // ─── BORDER COLORS ────────────────────────────────────────────────────────
  /** Strong borders, focused inputs. */
  borderHighEmphasis: "#121212",
  /** Standard card / divider borders. */
  borderMediumEmphasis: "#424242",
  /** Subtle separators, ghost borders. */
  borderLowEmphasis: "#E0E0E0",
  /** Active / selected element border. */
  borderAccentPrimary: "#2E7D32",
  /** Mild severity state border. */
  borderMild: "#F9A825",
  /** Moderate severity state border. */
  borderModerate: "#F57C00",
  /** Error state borders, alerts. */
  borderCaution: "#D32F2F",
  /** Borders on dark background components. */
  borderHighEmphasisInverse: "#FFFFFF",

  // ─── HIGHLIGHT COLORS ─────────────────────────────────────────────────────
  /** Error text highlights, markups. */
  highlightError: "#FFCDD2",
  /** Removed / cleared highlight state. */
  highlightNone: "#F5F5F5",
  /** Search results, text markup. */
  highlightYellow: "#FFEB3B",

  // ─── FOCUS COLORS ─────────────────────────────────────────────────────────
  /** Primary focus indicator for keyboard and screen reader navigation. */
  focusRing: "#1E88E5",
  /** Focus state tinted fill, input highlight. */
  focusRingLight: "#BBDEFB",
  /** Focus ring on dark surfaces or colored buttons. */
  focusRingInverse: "#64B5F6",
} as const;

/**
 * Type scale from the Figma text styles (size / auto line-height).
 * `weight` values are the Nunito font-family names loaded at runtime.
 */
export const AnimoType = {
  display: { fontSize: 34, lineHeight: 42, fontFamily: 'Nunito_700Bold' },
  h1: { fontSize: 26, lineHeight: 34, fontFamily: 'Nunito_700Bold' },
  h2: { fontSize: 20, lineHeight: 28, fontFamily: 'Nunito_700Bold' },
  h3: { fontSize: 18, lineHeight: 24, fontFamily: 'Nunito_600SemiBold' },
  body: { fontSize: 15, lineHeight: 24, fontFamily: 'Nunito_400Regular' },
  bodyEmphasis: { fontSize: 15, lineHeight: 24, fontFamily: 'Nunito_600SemiBold' },
  button: { fontSize: 16, lineHeight: 24, fontFamily: 'Nunito_700Bold' },
  price: { fontSize: 22, lineHeight: 28, fontFamily: 'Nunito_700Bold' },
  caption: { fontSize: 14, lineHeight: 18, fontFamily: 'Nunito_400Regular' },
  tag: { fontSize: 12, lineHeight: 16, fontFamily: 'Nunito_600SemiBold' },
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
  brandGreen: "#1A6E1E",
  pageBackground: "#FAFAFA",
  linkOnGreen: "#FFFFFF",
  linkOnWhite: "#1A6E1E",
  /** Body/label/helper text sitting directly on the green form card. */
  textOnGreen: "#FFFFFF",
  /** Softer white for helper text on green, so hints recede behind labels. */
  hintOnGreen: 'rgba(255, 255, 255, 0.72)',
} as const;

/**
 * ANIMO v2 design tokens (docs/DESIGN_SPEC.md section 4).
 * Added alongside the legacy tokens above. Do not put raw hex values in screens.
 */
export const AnimoV2Colors = {
  // surfaces
  surfaceApp: '#FAF8F4',
  surfaceCard: '#FFFFFF',
  surfaceMuted: '#F2EFE8',
  surfaceBrand: '#1A6E1E',
  surfaceBrandSubtle: '#E8F5E9',
  brandDark: '#112914',
  brandMid: '#558B2F',
  brandLight: '#C8E6C9',

  // text
  textPrimary: '#1C1B18',
  textSecondary: '#4A4740',
  textTertiary: '#67635A',
  textDisabled: '#A39E92',
  textOnBrand: '#FFFFFF',
  textBrand: '#1A6E1E',

  // borders
  borderDefault: '#E6E2D8',
  borderStrong: '#857F72',
  borderFocus: '#1C1B18',
  /** Chunky bottom edge for white cards and secondary buttons. */
  edgeSoft: '#D3CEC1',

  // actions
  actionPrimary: '#1A6E1E',
  /** Bottom edge and pressed state of the primary button. */
  actionPrimaryDepth: '#0F4A13',
  actionOnPrimary: '#FFFFFF',
  actionDisabledBg: '#E6E2D8',
  actionDisabledText: '#67635A',

  // status
  successBg: '#E8F5E9',
  successFg: '#1A6E1E',
  dangerBg: '#FDECEA',
  dangerFg: '#A52121',
  dangerSolid: '#D32F2F',
  warningBg: '#FFF4D6',
  warningFg: '#7A4B00',
  warningSolid: '#F9A825',
  cautionBg: '#FFE9D6',
  cautionFg: '#A34200',
  cautionSolid: '#F57C00',

  /** Scrim behind dialogs and sheets. */
  scrim: 'rgba(17, 41, 20, 0.55)',
} as const;

export const AnimoV2Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const AnimoV2Radius = {
  sm: 12,
  /** Buttons, inputs. */
  md: 16,
  /** Rows, option cards. */
  lg: 20,
  /** List cards, dialogs, tab bar. */
  xl: 28,
  full: 999,
} as const;

export const AnimoV2Size = {
  /** Confirm 56 vs 44 with the team (DESIGN_SPEC section 4). */
  controlHeight: 56,
  iconButton: 48,
  tabItemMinHeight: 64,
  /** Chunky bottom edge in px. */
  depth: 4,
} as const;

export const AnimoV2Font = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extrabold: 'Nunito_800ExtraBold',
} as const;

/** v2 type scale. Minimum text size is 14, body is 16. */
export const AnimoTypeV2 = {
  display: { fontFamily: AnimoV2Font.extrabold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: AnimoV2Font.extrabold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: AnimoV2Font.extrabold, fontSize: 20, lineHeight: 28 },
  subheading: { fontFamily: AnimoV2Font.bold, fontSize: 18, lineHeight: 24 },
  bodyV2: { fontFamily: AnimoV2Font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: AnimoV2Font.bold, fontSize: 16, lineHeight: 24 },
  buttonV2: { fontFamily: AnimoV2Font.extrabold, fontSize: 18, lineHeight: 24 },
  priceV2: { fontFamily: AnimoV2Font.extrabold, fontSize: 20, lineHeight: 24 },
  priceHero: { fontFamily: AnimoV2Font.extrabold, fontSize: 40, lineHeight: 44 },
  captionV2: { fontFamily: AnimoV2Font.regular, fontSize: 14, lineHeight: 20 },
  tagV2: { fontFamily: AnimoV2Font.bold, fontSize: 14, lineHeight: 16 },
} as const;

export type AnimoTypeV2Variant = keyof typeof AnimoTypeV2;

export type StatusTone = 'success' | 'warning' | 'danger' | 'caution' | 'neutral';

/** Background, foreground and solid color per status tone. Always pair with an icon and a label. */
export const AnimoV2Status: Record<StatusTone, { bg: string; fg: string; solid: string }> = {
  success: { bg: AnimoV2Colors.successBg, fg: AnimoV2Colors.successFg, solid: AnimoV2Colors.actionPrimary },
  warning: { bg: AnimoV2Colors.warningBg, fg: AnimoV2Colors.warningFg, solid: AnimoV2Colors.warningSolid },
  danger: { bg: AnimoV2Colors.dangerBg, fg: AnimoV2Colors.dangerFg, solid: AnimoV2Colors.dangerSolid },
  caution: { bg: AnimoV2Colors.cautionBg, fg: AnimoV2Colors.cautionFg, solid: AnimoV2Colors.cautionSolid },
  neutral: { bg: AnimoV2Colors.surfaceMuted, fg: AnimoV2Colors.textSecondary, solid: AnimoV2Colors.borderStrong },
};

/** Fonts to load with `useFonts`. */
export const AnimoFontMap = {
  Nunito_400Regular: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
  Nunito_500Medium: require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf'),
  Nunito_600SemiBold: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
  Nunito_700Bold: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
  Nunito_800ExtraBold: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'),
};
