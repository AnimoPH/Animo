import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type AnimoButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Visual style. Primary = filled green pill; secondary = outlined. */
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
};

/**
 * The main call-to-action button (e.g. "Magpatuloy", "Ipadala ang OTP").
 * A full-width green pill; disabled state fades to a lighter green.
 */
export function AnimoButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: AnimoButtonProps) {
  const isPrimary = variant === 'primary';
  const isInactive = disabled || loading;

  const backgroundColor = isPrimary
    ? isInactive
      ? AnimoColors.greenDisabled
      : AnimoColors.green
    : 'transparent';

  const textColor = isPrimary ? AnimoColors.white : AnimoColors.green;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive }}
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor },
        !isPrimary && styles.secondaryBorder,
        pressed && !isInactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <AnimoText variant="button" color={textColor}>
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
  secondaryBorder: {
    borderWidth: 1.5,
    borderColor: AnimoColors.green,
  },
  pressed: {
    opacity: 0.85,
  },
});
