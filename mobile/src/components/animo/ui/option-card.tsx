import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';

export type OptionCardProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** `row` shows a radio on the left; `stacked` centers children for 2 to 3 up grids. */
  layout?: 'row' | 'stacked';
  /** Custom content above the label in stacked layout (icon tile, grade letter...). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** v2 option card (radio). Selected: green tint and green border. */
export function OptionCard({ label, description, selected, onPress, layout = 'row', children, style }: OptionCardProps) {
  const edge = selected ? AnimoV2Colors.actionPrimary : AnimoV2Colors.edgeSoft;
  const stacked = layout === 'stacked';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={description ? `${label}, ${description}` : label}
      onPress={onPress}
      style={[{ borderRadius: AnimoV2Radius.lg, backgroundColor: edge, paddingBottom: 3 }, style]}>
      <View
        style={[
          styles.face,
          stacked ? styles.stacked : styles.row,
          selected && { backgroundColor: AnimoV2Colors.surfaceBrandSubtle, borderColor: AnimoV2Colors.actionPrimary },
        ]}>
        {!stacked ? (
          <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.dot} /> : null}</View>
        ) : null}
        {children}
        <View style={stacked ? { alignItems: 'center' } : { flex: 1 }}>
          <AnimoText variant="bodyStrong" style={stacked ? { textAlign: 'center' } : undefined}>
            {label}
          </AnimoText>
          {description ? (
            <AnimoText
              variant="captionV2"
              color={AnimoV2Colors.textSecondary}
              style={stacked ? { textAlign: 'center' } : undefined}>
              {description}
            </AnimoText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: 64,
    padding: AnimoV2Spacing.lg,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  // flexGrow so stacked cards in a row fill the row height evenly.
  stacked: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: AnimoV2Spacing.sm, paddingHorizontal: AnimoV2Spacing.xs },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: AnimoV2Colors.actionPrimary, backgroundColor: AnimoV2Colors.actionPrimary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
});
