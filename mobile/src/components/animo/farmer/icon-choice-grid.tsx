import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type IconChoiceOption<T extends string> = { value: T; label: string; icon: LucideIcon };

export type IconChoiceGridProps<T extends string> = {
  options: IconChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * A 2-column grid of icon+label options — same selected/border/tint
 * language as SegmentedChoice, with an icon slot for text-free recognition
 * (e.g. rice variety) instead of label-only radio rows.
 */
export function IconChoiceGrid<T extends string>({ options, value, onChange }: IconChoiceGridProps<T>) {
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected ? styles.optionSelected : styles.optionDefault]}>
            <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
              <Icon size={22} color={selected ? AnimoColors.green : AnimoColors.blackSecondary} />
            </View>
            <AnimoText variant="bodyEmphasis" color={selected ? AnimoColors.green : AnimoColors.blackSecondary}>
              {option.label}
            </AnimoText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
  },
  option: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.sm,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1.5,
  },
  optionDefault: {
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
  },
  optionSelected: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.greenTint,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
});
