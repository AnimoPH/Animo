import { Check, ChevronDown } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { SpecificVarietyOption } from '@/types/crop-listing';

export type SpecificVarietyFieldProps = {
  label: string;
  placeholder: string;
  options: SpecificVarietyOption[];
  value: string | null;
  /** Controlled (not internal, unlike select-field.tsx) so the caller can auto-open
   * this modal right after the "Uri ng Palay" modal closes on Inbred/Hybrid. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (option: SpecificVarietyOption) => void;
};

/**
 * Same bottom-sheet option-list pattern as select-field.tsx (title, scrollable
 * rows, checkmark on the selected row), kept as its own component because its
 * open state is controlled by the parent instead of internal.
 */
export function SpecificVarietyField({
  label,
  placeholder,
  options,
  value,
  open,
  onOpenChange,
  onSelect,
}: SpecificVarietyFieldProps) {
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {label}
      </AnimoText>

      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenChange(true)}
        style={styles.field}>
        <AnimoText
          variant="body"
          color={selected ? AnimoColors.black : AnimoColors.muted}
          style={styles.value}>
          {selected ? selected.label : placeholder}
        </AnimoText>
        <ChevronDown size={20} color={AnimoColors.blackSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => onOpenChange(false)}>
        <Pressable style={styles.backdrop} onPress={() => onOpenChange(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <AnimoText variant="h3" color={AnimoColors.black} style={styles.sheetTitle}>
              Piliin ang Tiyak na Uri ng Palay
            </AnimoText>
            <ScrollView bounces={false}>
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option);
                      onOpenChange(false);
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
