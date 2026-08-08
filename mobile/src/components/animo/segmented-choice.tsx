import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type ChoiceOption<T extends string> = { value: T; label: string };

export type SegmentedChoiceProps<T extends string> = {
  /** Optional label rendered above the choices. */
  label?: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * A row of radio-style options (e.g. Lalaki / Babae, Oo / Hindi). The selected
 * option gets a green tint background, green border, and a filled radio dot.
 */
export function SegmentedChoice<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedChoiceProps<T>) {
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {label}
        </AnimoText>
      ) : null}
      <View style={styles.row}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected ? styles.optionSelected : styles.optionDefault]}>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <AnimoText variant="body" color={AnimoColors.black}>
                {option.label}
              </AnimoText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: AnimoSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    height: 56,
    paddingHorizontal: AnimoSpacing.lg,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
  },
  optionDefault: {
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
  },
  optionSelected: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.greenTint,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AnimoColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: AnimoColors.green,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.green,
  },
});
