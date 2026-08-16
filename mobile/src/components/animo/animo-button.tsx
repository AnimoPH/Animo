import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type AnimoButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Visual style. Primary = filled green; secondary = green outline; danger = red fill; dangerOutline = red outline. */
  variant?: 'primary' | 'secondary' | 'danger' | 'dangerOutline';
  style?: ViewStyle;
};

/**
 * The main call-to-action button (e.g. "Magpatuloy", "Ipadala ang OTP").
 * A full-width pill; disabled state fades.
 */
export function AnimoButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
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
          bg: isInactive ? '#F3B4B4' : AnimoColors.danger,
          text: AnimoColors.white,
          border: undefined,
        };
      case 'dangerOutline':
        return {
          bg: 'transparent',
          text: AnimoColors.danger,
          border: AnimoColors.danger,
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
        { backgroundColor: bg },
        border ? { borderWidth: 1.5, borderColor: border } : undefined,
        pressed && !isInactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={text} />
      ) : (
        <AnimoText variant="button" color={text}>
          {label}
        </AnimoText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: AnimoRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
});
