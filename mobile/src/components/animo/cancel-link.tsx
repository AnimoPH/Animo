import { Pressable, StyleSheet } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';

export type CancelLinkProps = {
  label: string;
  onPress: () => void;
};

/**
 * Understated destructive link under a screen's primary action.
 *
 * Deliberately not a filled button — cancelling should stay reachable without
 * competing with the action the buyer is meant to take.
 */
export function CancelLink({ label, onPress }: CancelLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.danger}>
        {label}
      </AnimoText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AnimoSpacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
