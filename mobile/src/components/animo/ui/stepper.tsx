import { Minus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoTypeV2, AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

export type QuantityStepperProps = {
  /** Shown as the big number when the stepper is not `editable`. */
  value: number;
  unit?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
  /**
   * Opt in to typing: the big number becomes an input (underlined, so it reads as tappable) and
   * `inputValue` is shown instead of `value`. The parent owns the text and its validation.
   */
  editable?: boolean;
  inputValue?: string;
  onChangeText?: (text: string) => void;
  /** Called when the input loses focus (or Done is pressed), e.g. to restore an empty field. */
  onEndEditing?: () => void;
  inputLabel?: string;
  maxLength?: number;
};

/** Digit width as a share of the font size, used to size the input to its text. */
const DIGIT_EM = 0.62;

/** The type scale's display size, stepping down for longer numbers so they keep fitting. */
function inputFontSize(length: number): number {
  if (length <= 3) return AnimoTypeV2.display.fontSize;
  if (length === 4) return 28;
  return 24;
}

/** 56px minus / plus buttons around a 32/800 value. */
export function QuantityStepper({
  value,
  unit = 'kg',
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  decrementLabel,
  incrementLabel,
  editable = false,
  inputValue = '',
  onChangeText,
  onEndEditing,
  inputLabel,
  maxLength,
}: QuantityStepperProps) {
  const [focused, setFocused] = useState(false);
  const fontSize = inputFontSize(inputValue.length);

  return (
    <View style={styles.row}>
      <StepButton icon="minus" label={decrementLabel} onPress={onDecrement} disabled={decrementDisabled} />
      <View style={styles.val}>
        {editable ? (
          <View style={styles.inputRow}>
            <TextInput
              value={inputValue}
              onChangeText={onChangeText}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false);
                onEndEditing?.();
              }}
              keyboardType="number-pad"
              returnKeyType="done"
              maxLength={maxLength}
              selectTextOnFocus
              placeholder="0"
              placeholderTextColor={AnimoV2Colors.textDisabled}
              accessibilityLabel={inputLabel}
              style={[
                styles.input,
                { fontSize, width: Math.max(2, inputValue.length) * fontSize * DIGIT_EM + 8 },
                focused && styles.inputFocused,
              ]}
            />
            <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>{` ${unit}`}</AnimoText>
          </View>
        ) : (
          <AnimoText variant="display">
            {value.toLocaleString('en-PH')}
            <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>{` ${unit}`}</AnimoText>
          </AnimoText>
        )}
      </View>
      <StepButton icon="plus" label={incrementLabel} onPress={onIncrement} disabled={incrementDisabled} />
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'minus' | 'plus';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.btn, disabled && { opacity: 0.4 }]}>
      <Icon size={26} color={AnimoV2Colors.textBrand} strokeWidth={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  val: { flex: 1, alignItems: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'baseline', maxWidth: '100%' },
  input: {
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: 'center',
    flexShrink: 1,
    fontFamily: AnimoTypeV2.display.fontFamily,
    color: AnimoV2Colors.textPrimary,
    // The underline is what tells people the number can be typed over.
    borderBottomWidth: 3,
    borderBottomColor: AnimoV2Colors.borderStrong,
  },
  inputFocused: { borderBottomColor: AnimoV2Colors.actionPrimary },
  btn: {
    width: AnimoV2Size.controlHeight,
    height: AnimoV2Size.controlHeight,
    borderRadius: AnimoV2Radius.md,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    borderBottomWidth: 5,
    borderBottomColor: AnimoV2Colors.edgeSoft,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
