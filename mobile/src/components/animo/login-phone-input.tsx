import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';

export type LoginPhoneInputProps = Omit<TextInputProps, 'keyboardType' | 'maxLength'> & {
  /** Label above the field. Omit to render just the field. */
  label?: string;
  /** Small helper text shown below the field. */
  hint?: string;
  /** Override the hint text color (default: muted gray, for use on light backgrounds). */
  hintColor?: string;
  /** Render the field in the error (red border) state. */
  error?: boolean;
};

/**
 * Phone field with a flush PH +63 prefix for login/register.
 * Separate from LabeledInput so shared forms keep their padded layout.
 */
export function LoginPhoneInput({
  label,
  hint,
  hintColor,
  error = false,
  style,
  placeholder = '9XX XXX XXXX',
  ...rest
}: LoginPhoneInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {label}
        </AnimoText>
      ) : null}
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error && styles.fieldError,
        ]}>
        <View style={styles.prefix}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.blackSecondary}>
            PH
          </AnimoText>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
            +63
          </AnimoText>
        </View>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={AnimoColors.muted}
          keyboardType="phone-pad"
          maxLength={10}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, style]}
          {...rest}
        />
      </View>
      {hint ? (
        <AnimoText variant="caption" color={hintColor ?? AnimoColors.muted} style={styles.hint}>
          {hint}
        </AnimoText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: AnimoSpacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
    borderRadius: AnimoRadius.sm,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.white,
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  fieldError: {
    borderColor: AnimoColors.danger,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  input: {
    flex: 1,
    minHeight: 56,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.md,
    color: AnimoColors.black,
    fontSize: AnimoType.body.fontSize,
    fontFamily: AnimoType.body.fontFamily,
  },
  hint: {
    fontStyle: 'italic',
    marginTop: 4,
  },
});
