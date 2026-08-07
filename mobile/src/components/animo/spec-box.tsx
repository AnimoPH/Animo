import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type SpecBoxProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

/** A single bordered spec tile (icon + label on top, value below). */
export function SpecBox({ icon, label, value }: SpecBoxProps) {
  return (
    <View style={styles.box}>
      <View style={styles.labelRow}>
        {icon}
        <AnimoText variant="caption" color={AnimoColors.blackSecondary}>
          {label}
        </AnimoText>
      </View>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {value}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 6,
    minWidth: '45%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
