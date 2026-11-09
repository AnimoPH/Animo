import { StyleSheet, Text, type TextProps } from 'react-native';

import {
  AnimoColors,
  AnimoType,
  AnimoTypeV2,
  AnimoV2Colors,
  type AnimoTypeV2Variant,
  type AnimoTypeVariant,
} from '@/constants/animo';

export type AnimoTextProps = TextProps & {
  /** Type scale variant from the Animo design tokens. */
  variant?: AnimoTypeVariant | AnimoTypeV2Variant;
  /** Override text color. Defaults to primary black. */
  color?: string;
};

/**
 * Brand-styled text. Applies a variant from the Animo type scale and the
 * Nunito family. Use this everywhere in the Animo UI instead of
 * the stock `ThemedText` so typography stays consistent.
 */
export function AnimoText({ variant = 'body', color, style, ...rest }: AnimoTextProps) {
  const isV2 = variant in AnimoTypeV2;
  const typeStyle = isV2 ? AnimoTypeV2[variant as AnimoTypeV2Variant] : AnimoType[variant as AnimoTypeVariant];
  // v2 variants default to the warm v2 ink; legacy variants keep the legacy black.
  const defaultColor = isV2 ? AnimoV2Colors.textPrimary : AnimoColors.black;
  return <Text style={[typeStyle, { color: color ?? defaultColor }, style]} {...rest} />;
}

// Keeps StyleSheet as the canonical place for any future shared text tweaks.
export const animoTextStyles = StyleSheet.create({});
