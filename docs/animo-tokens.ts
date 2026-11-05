/**
 * ANIMO v2 design tokens (proposal).
 *
 * Do not overwrite constants/animo.ts blindly. Compare each group with the existing
 * AnimoColors, AnimoType, AnimoSpacing and AnimoRadius, keep the existing key names where
 * they already exist, and add the new keys. Source: DESIGN_SPEC.md section 4.
 */

export const AnimoV2Colors = {
  // surfaces
  surfaceApp: '#FAF8F4',
  surfaceCard: '#FFFFFF',
  surfaceMuted: '#F2EFE8',
  surfaceBrand: '#1A6E1E',
  surfaceBrandSubtle: '#E8F5E9',

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
  edgeSoft: '#D3CEC1', // chunky bottom edge for white cards and secondary buttons

  // actions
  actionPrimary: '#1A6E1E',
  actionPrimaryDepth: '#0F4A13', // bottom edge and pressed state
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

  // scrim behind dialogs and sheets
  scrim: 'rgba(17, 41, 20, 0.55)',
} as const;

export const AnimoV2Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // default screen side padding
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const AnimoV2Radius = {
  sm: 12,
  md: 16, // buttons, inputs
  lg: 20, // rows, option cards
  xl: 28, // list cards, dialogs, tab bar
  full: 999,
} as const;

export const AnimoV2Size = {
  controlHeight: 56, // confirm 56 vs 44 with the team
  iconButton: 48,
  tabItemMinHeight: 64,
  depth: 4, // chunky bottom edge in px
} as const;

/** Plus Jakarta Sans. Load with @expo-google-fonts/plus-jakarta-sans. */
export const AnimoV2Font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const AnimoV2Type = {
  display: { fontFamily: AnimoV2Font.extrabold, fontSize: 32, lineHeight: 40 },
  title: { fontFamily: AnimoV2Font.extrabold, fontSize: 26, lineHeight: 32 },
  heading: { fontFamily: AnimoV2Font.extrabold, fontSize: 20, lineHeight: 28 },
  subheading: { fontFamily: AnimoV2Font.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: AnimoV2Font.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: AnimoV2Font.bold, fontSize: 16, lineHeight: 24 },
  button: { fontFamily: AnimoV2Font.extrabold, fontSize: 18, lineHeight: 24 },
  price: { fontFamily: AnimoV2Font.extrabold, fontSize: 20, lineHeight: 24 },
  priceHero: { fontFamily: AnimoV2Font.extrabold, fontSize: 40, lineHeight: 44 },
  caption: { fontFamily: AnimoV2Font.regular, fontSize: 14, lineHeight: 20 },
  tag: { fontFamily: AnimoV2Font.bold, fontSize: 14, lineHeight: 16 },
} as const;

export type StatusTone = 'success' | 'warning' | 'danger' | 'caution' | 'neutral';

/** Background, foreground and solid color for each status tone. Always pair with an icon and label. */
export const AnimoV2Status: Record<StatusTone, { bg: string; fg: string; solid: string }> = {
  success: { bg: AnimoV2Colors.successBg, fg: AnimoV2Colors.successFg, solid: AnimoV2Colors.actionPrimary },
  warning: { bg: AnimoV2Colors.warningBg, fg: AnimoV2Colors.warningFg, solid: AnimoV2Colors.warningSolid },
  danger: { bg: AnimoV2Colors.dangerBg, fg: AnimoV2Colors.dangerFg, solid: AnimoV2Colors.dangerSolid },
  caution: { bg: AnimoV2Colors.cautionBg, fg: AnimoV2Colors.cautionFg, solid: AnimoV2Colors.cautionSolid },
  neutral: { bg: AnimoV2Colors.surfaceMuted, fg: AnimoV2Colors.textSecondary, solid: AnimoV2Colors.borderStrong },
};

/** The three advisory states. The state itself comes from the rule based engine, not from the UI. */
export const AnimoV2Advisory = {
  advanceCut: { tone: 'caution', icon: 'cloud-rain', title: 'Anihin na ngayon' },
  delayedHarvest: { tone: 'warning', icon: 'clock', title: 'Ipagpaliban muna ang ani' },
  noActionNeeded: { tone: 'success', icon: 'sun', title: 'Walang kailangang gawin' },
} as const;
