import { Minus, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

export type QuantityStepperProps = {
  value: number;
  unit?: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  decrementLabel: string;
  incrementLabel: string;
};

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
}: QuantityStepperProps) {
  return (
    <View style={styles.row}>
      <StepButton icon="minus" label={decrementLabel} onPress={onDecrement} disabled={decrementDisabled} />
      <View style={styles.val}>
        <AnimoText variant="display">
          {value.toLocaleString('en-PH')}
          <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>{` ${unit}`}</AnimoText>
        </AnimoText>
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
