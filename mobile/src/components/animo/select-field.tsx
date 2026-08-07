import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  label: string;
  /** Placeholder shown when nothing is selected. */
  placeholder: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
};

/**
 * Dropdown select. Renders as a field showing the current selection (or a muted
 * placeholder) with a chevron; tapping opens a bottom-sheet-style option list.
 */
export function SelectField({ label, placeholder, options, value, onChange }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {label}
      </AnimoText>

      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.field}>
        <AnimoText
          variant="body"
          color={selected ? AnimoColors.black : AnimoColors.muted}
          style={styles.value}>
          {selected ? selected.label : placeholder}
        </AnimoText>
        <ChevronDown size={20} color={AnimoColors.blackSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.sheetTitle}>
              {label}
            </AnimoText>
            <ScrollView bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={styles.optionRow}>
                    <AnimoText
                      variant="body"
                      color={isSelected ? AnimoColors.green : AnimoColors.black}>
                      {option.label}
                    </AnimoText>
                    {isSelected ? <Check size={20} color={AnimoColors.green} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: AnimoSpacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: AnimoSpacing.lg,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
  },
  value: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AnimoColors.white,
    borderTopLeftRadius: AnimoRadius.lg,
    borderTopRightRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    maxHeight: '60%',
  },
  sheetTitle: {
    marginBottom: AnimoSpacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: AnimoSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.border,
  },
});
