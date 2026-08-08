import { StyleSheet, Text, type TextProps } from 'react-native';

import { AnimoColors, AnimoType, type AnimoTypeVariant } from '@/constants/animo';

export type AnimoTextProps = TextProps & {
  /** Type scale variant from the Animo design tokens. */
  variant?: AnimoTypeVariant;
  /** Override text color. Defaults to primary black. */
  color?: string;
};

/**
 * Brand-styled text. Applies a variant from the Animo type scale and the
 * Plus Jakarta Sans family. Use this everywhere in the Animo UI instead of
 * the stock `ThemedText` so typography stays consistent.
 */
export function AnimoText({ variant = 'body', color, style, ...rest }: AnimoTextProps) {
  return <Text style={[AnimoType[variant], { color: color ?? AnimoColors.black }, style]} {...rest} />;
}

// Keeps StyleSheet as the canonical place for any future shared text tweaks.
export const animoTextStyles = StyleSheet.create({});
