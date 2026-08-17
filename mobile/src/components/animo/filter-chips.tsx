import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type FilterChipsProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * When true (default), chips add their own horizontal inset for older
   * screens that do not pad the page. Pass false when the parent already
   * applies `AnimoLayout.screenGutter`.
   */
  inset?: boolean;
};

/**
 * Horizontal scrollable filter pills (e.g. Lahat / Baliwag / Plaridel).
 * The active pill is filled green; the rest are outlined.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  inset = true,
}: FilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, !inset && styles.rowFlush]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}>
            <AnimoText
              variant="body"
              color={active ? AnimoColors.white : AnimoColors.blackSecondary}>
              {option.label}
            </AnimoText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.lg,
  },
  rowFlush: {
    paddingHorizontal: 0,
  },
  chip: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: AnimoColors.green,
    borderColor: AnimoColors.green,
  },
  chipInactive: {
    backgroundColor: AnimoColors.white,
    borderColor: AnimoColors.border,
  },
});
