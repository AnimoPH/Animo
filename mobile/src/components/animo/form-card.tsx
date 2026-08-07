import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type FormCardProps = {
  title: string;
  children: ReactNode;
};

/** A titled, bordered section container used to group profile form fields. */
export function FormCard({ title, children }: FormCardProps) {
  return (
    <View style={styles.card}>
      <AnimoText variant="h3" color={AnimoColors.black}>
        {title}
      </AnimoText>
      <View style={styles.fields}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.lg,
  },
  fields: {
    gap: AnimoSpacing.lg,
  },
});
