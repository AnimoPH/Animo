import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';

export type SeeAllLinkProps = {
  label: string;
  onPress: () => void;
  /** Spoken label when it should say more than the visible text. Defaults to `label`. */
  accessibilityLabel?: string;
};

/**
 * Quiet section-header action: brand-green label plus a chevron, no fill.
 * Keeps a section's "see more" from competing with the screen's primary
 * ChunkyButton. The chevron (not an underline) signals that it is tappable.
 */
export function SeeAllLink({ label, onPress, accessibilityLabel }: SeeAllLinkProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
        {label}
      </AnimoText>
      <ChevronRight size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.xs,
    minHeight: 44,
    paddingLeft: AnimoV2Spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
