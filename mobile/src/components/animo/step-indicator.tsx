import { Check } from 'lucide-react-native';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors } from '@/constants/animo';

export type Step = { label: string };

export type StepIndicatorProps = {
  steps: Step[];
  /** Zero-based index of the current step. */
  current: number;
};

/**
 * The registration wizard header: numbered circles joined by connector lines
 * (Numero → OTP → Profile). Completed steps show a check; the active step is
 * filled green; upcoming steps are muted.
 */
export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <View style={styles.row}>
      {steps.map((step, index) => {
        const isDone = index < current;
        const isActive = index === current;
        const isFilled = isDone || isActive;

        return (
          <Fragment key={step.label}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: isFilled ? AnimoColors.green : AnimoColors.surface },
                  !isFilled && styles.circleUpcoming,
                ]}>
                {isDone ? (
                  <Check size={16} color={AnimoColors.white} strokeWidth={3} />
                ) : (
                  <AnimoText
                    variant="bodyEmphasis"
                    color={isActive ? AnimoColors.white : AnimoColors.muted}>
                    {index + 1}
                  </AnimoText>
                )}
              </View>
              <AnimoText
                variant="caption"
                color={isFilled ? AnimoColors.green : AnimoColors.muted}
                style={styles.label}>
                {step.label}
              </AnimoText>
            </View>

            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  { backgroundColor: isDone ? AnimoColors.green : AnimoColors.border },
                ]}
              />
            )}
          </Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 64,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUpcoming: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
  },
  label: {
    marginTop: 6,
    textAlign: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 15,
    marginHorizontal: 4,
  },
});
