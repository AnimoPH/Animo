import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

export type ChunkyButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export type ChunkyButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ChunkyButtonVariant;
  /** `sm` is a compact 44px button for inline actions. Give it an explicit width via `style`. */
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  /** Layout overrides (e.g. `{ flex: 1 }` for side-by-side buttons). */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Override the label/icon color (e.g. a red secondary "Mag-sign out"). */
  textColor?: string;
  /** Override the secondary border color. */
  borderColor?: string;
};

const FACE_HEIGHT = AnimoV2Size.controlHeight;
const DEPTH = AnimoV2Size.depth;

/**
 * Chunky v2 button (DESIGN_SPEC sections 5 and 7). A solid edge sits under the face;
 * on press the face drops onto the edge. Android cannot draw a hard offset shadow,
 * so the edge is its own absolutely positioned view.
 */
export function ChunkyButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  textColor,
  borderColor,
}: ChunkyButtonProps) {
  const [pressed, setPressed] = useState(false);
  const inactive = disabled || loading;
  const isGhost = variant === 'ghost';
  const small = size === 'sm';
  const faceHeight = isGhost ? AnimoV2Size.iconButton : small ? 44 : FACE_HEIGHT;

  let face: string = AnimoV2Colors.actionPrimary;
  let edge: string = AnimoV2Colors.actionPrimaryDepth;
  let text: string = AnimoV2Colors.actionOnPrimary;
  let border: string | undefined;

  if (variant === 'secondary') {
    face = AnimoV2Colors.surfaceCard;
    edge = AnimoV2Colors.edgeSoft;
    text = AnimoV2Colors.textBrand;
    border = borderColor ?? AnimoV2Colors.borderStrong;
  } else if (variant === 'danger') {
    face = AnimoV2Colors.dangerSolid;
    edge = AnimoV2Colors.dangerFg;
  } else if (isGhost) {
    face = 'transparent';
    edge = 'transparent';
    text = AnimoV2Colors.textBrand;
  }
  if (textColor) text = textColor;
  if (inactive && !isGhost) {
    face = AnimoV2Colors.actionDisabledBg;
    edge = AnimoV2Colors.actionDisabledBg;
    text = AnimoV2Colors.actionDisabledText;
    border = undefined;
  }

  const depth = isGhost || inactive ? 0 : DEPTH;
  const down = pressed && !inactive ? depth : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[{ height: faceHeight + depth }, style]}>
      {depth > 0 ? (
        <View style={[styles.edge, { top: depth, height: faceHeight, backgroundColor: edge }]} />
      ) : null}
      <View
        style={[
          styles.face,
          { top: down, height: faceHeight, backgroundColor: face },
          border ? { borderWidth: 2, borderColor: border } : undefined,
        ]}>
        {loading ? (
          <ActivityIndicator color={text} />
        ) : (
          <View style={styles.content}>
            {Icon ? <Icon size={small ? 18 : 22} color={text} strokeWidth={2.75} /> : null}
            <AnimoText variant={small ? 'bodyStrong' : 'buttonV2'} color={text} numberOfLines={1}>
              {label}
            </AnimoText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, borderRadius: AnimoV2Radius.md },
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: AnimoV2Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoV2Spacing.md,
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: AnimoV2Spacing.sm },
});
