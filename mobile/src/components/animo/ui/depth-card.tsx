import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimoV2Colors, AnimoV2Radius } from '@/constants/animo';

export type DepthCardProps = {
  children: ReactNode;
  /** `raised` has the 4px bottom edge (list cards); `flat` is border only (rows, info blocks). */
  depth?: 'raised' | 'flat';
  radius?: 'lg' | 'xl';
  /** Tinted fill, e.g. brand subtle for selected / CTA cards. */
  backgroundColor?: string;
  borderColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** v2 card: 2px border, optional chunky bottom edge. Pressable when `onPress` is given. */
export function DepthCard({
  children,
  depth = 'raised',
  radius = 'xl',
  backgroundColor = AnimoV2Colors.surfaceCard,
  borderColor = AnimoV2Colors.borderDefault,
  onPress,
  accessibilityLabel,
  style,
}: DepthCardProps) {
  const r = radius === 'xl' ? AnimoV2Radius.xl : AnimoV2Radius.lg;
  const edge = depth === 'raised' ? 4 : 0;
  const body = (
    <View style={[styles.face, { backgroundColor, borderColor, borderRadius: r }, style]}>{children}</View>
  );
  const wrapStyle = {
    borderRadius: r,
    backgroundColor: edge ? AnimoV2Colors.edgeSoft : 'transparent',
    paddingBottom: edge,
  };
  if (!onPress) return <View style={wrapStyle}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [wrapStyle, pressed && { opacity: 0.92 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { borderWidth: 2, overflow: 'hidden' },
});
