import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  /** Optional count shown after the label. */
  count?: number;
  onPress?: () => void;
  compact?: boolean;
};

/** v2 filter chip. Selected: solid green, white text, 3px depth. */
export function FilterChip({ label, selected = false, count, onPress, compact = false }: FilterChipProps) {
  const fg = selected ? AnimoV2Colors.textOnBrand : AnimoV2Colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      onPress={onPress}
      style={[styles.outer, selected && styles.outerOn, { paddingBottom: selected ? 3 : 0 }]}>
      <View
        style={[
          styles.face,
          compact && { paddingVertical: 4, paddingHorizontal: AnimoV2Spacing.md },
          selected && styles.faceOn,
        ]}>
        <AnimoText variant={compact ? 'tagV2' : 'bodyStrong'} color={fg}>
          {label}
        </AnimoText>
        {count !== undefined ? (
          <AnimoText variant="tagV2" color={selected ? AnimoV2Colors.textOnBrand : AnimoV2Colors.textTertiary}>
            {count}
          </AnimoText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: AnimoV2Radius.full },
  outerOn: { backgroundColor: AnimoV2Colors.actionPrimaryDepth },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingVertical: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
  },
  faceOn: { backgroundColor: AnimoV2Colors.actionPrimary, borderColor: AnimoV2Colors.actionPrimary },
});
