import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type AnimoButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Visual style. Primary = filled green; secondary = green outline; danger = red fill; dangerOutline = red outline; neutralOutline = muted gray outline. */
  variant?: 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'neutralOutline' | 'lightdangerOutline';
  /** Optional leading Lucide icon. */
  icon?: LucideIcon;
  /**
   * Full-width pill (default). Pass false for compact side-by-side actions
   * and stretch with `style={{ flex: 1 }}`.
   */
  fullWidth?: boolean;
  style?: ViewStyle;
};

/**
 * The main call-to-action button (e.g. "Magpatuloy", "Ipadala ang OTP").
 * A full-width pill by default; disabled state fades.
 */
export function AnimoButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  icon: Icon,
  fullWidth = true,
  style,
}: AnimoButtonProps) {
  const isInactive = disabled || loading;

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: isInactive ? AnimoColors.greenDisabled : AnimoColors.green,
          text: AnimoColors.white,
          border: undefined,
        };
      case 'secondary':
        return {
          bg: 'transparent',
          text: AnimoColors.green,
          border: AnimoColors.green,
        };
      case 'danger':
        return {
          bg: isInactive ? AnimoColors.dangerTint : AnimoColors.danger,
          text: AnimoColors.white,
          border: undefined,
        };
      case 'dangerOutline':
        return {
          bg: 'transparent',
          text: AnimoColors.danger,
          border: AnimoColors.danger,
        };
      case 'lightdangerOutline':
        return {
          bg: 'transparent',
          text: AnimoColors.danger,
          border: AnimoColors.cautionLight,
        };
      
      case 'neutralOutline':
        return {
          bg: 'transparent',
          text: AnimoColors.textMediumEmphasis,
          border: AnimoColors.border,
        };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        fullWidth ? styles.fullWidth : styles.compact,
        { backgroundColor: bg },
        border ? { borderWidth: 1.5, borderColor: border } : undefined,
        pressed && !isInactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <View style={styles.content}>
          {Icon ? <Icon size={18} color={text} strokeWidth={2.4} /> : null}
          <AnimoText variant="button" color={text}>
            {label}
          </AnimoText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // minHeight: 56,
    // height: 56,
    paddingVertical: AnimoSpacing.lg,
    borderRadius: AnimoRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  compact: {
    flex: 1,
    paddingHorizontal: AnimoSpacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
