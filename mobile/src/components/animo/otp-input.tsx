import { useRef } from 'react';
import {
  type NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  type TextInputKeyPressEventData,
  View,
} from 'react-native';

import { AnimoColors, AnimoRadius, AnimoType } from '@/constants/animo';

export type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** When true, all boxes render in the red error style. */
  error?: boolean;
};

/**
 * Segmented one-time-password input. Renders `length` boxes; typing advances,
 * backspace on an empty box steps back. Backing store is a single string.
 */
export function OtpInput({ value, onChange, length = 6, error = false }: OtpInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const setCharAt = (index: number, char: string) => {
    const digit = char.replace(/\D/g, '').slice(-1);
    const next = value.split('');
    next[index] = digit;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, index) => {
        const filled = Boolean(value[index]);
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputs.current[index] = ref;
            }}
            value={value[index] ?? ''}
            onChangeText={(text) => setCharAt(index, text)}
            onKeyPress={(e) => handleKeyPress(index, e)}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              styles.box,
              filled && styles.boxFilled,
              error && styles.boxError,
            ]}
            selectionColor={error ? AnimoColors.danger : AnimoColors.green}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  box: {
    flex: 1,
    height: 56,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.surface,
    textAlign: 'center',
    color: AnimoColors.black,
    fontSize: AnimoType.h2.fontSize,
    fontFamily: AnimoType.bodyEmphasis.fontFamily,
  },
  boxFilled: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.white,
  },
  boxError: {
    borderColor: AnimoColors.danger,
    backgroundColor: AnimoColors.white,
    color: AnimoColors.danger,
  },
});
