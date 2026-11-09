import { AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Font, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Unit suffix inside the field (e.g. "kg"). */
  suffix?: string;
  /** Symbol inside the field before the text (e.g. "₱"). */
  prefix?: string;
  /** Error text in words. Shown with an icon. */
  error?: string;
  hint?: string;
};

/** v2 input: label above (700), 56 high, 2px strong border, ink focus ring. */
export function TextField({ label, suffix, prefix, error, hint, multiline, style, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? AnimoV2Colors.dangerSolid
    : focused
      ? AnimoV2Colors.borderFocus
      : AnimoV2Colors.borderStrong;
  return (
    <View style={{ gap: AnimoV2Spacing.sm }}>
      <AnimoText variant="bodyStrong">{label}</AnimoText>
      <View style={[styles.box, multiline && styles.boxMulti, { borderColor }]}>
        {prefix ? (
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.textTertiary} style={styles.prefix}>
            {prefix}
          </AnimoText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={AnimoV2Colors.textTertiary}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && { paddingTop: 14, minHeight: 96 }, style]}
          {...rest}
        />
        {suffix ? (
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.textTertiary}>
            {suffix}
          </AnimoText>
        ) : null}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <AlertCircle size={18} color={AnimoV2Colors.dangerFg} strokeWidth={2.75} />
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={{ flex: 1 }}>
            {error}
          </AnimoText>
        </View>
      ) : hint ? (
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {hint}
        </AnimoText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AnimoV2Spacing.lg,
    borderWidth: 2,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  boxMulti: { alignItems: 'flex-start' },
  prefix: { marginRight: AnimoV2Spacing.sm },
  input: {
    flex: 1,
    fontFamily: AnimoV2Font.regular,
    fontSize: 16,
    color: AnimoV2Colors.textPrimary,
    paddingVertical: 0,
    minHeight: AnimoV2Size.controlHeight - 4,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
