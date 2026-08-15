import { Check, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { ProgressStep } from '@/constants/marketplace';

export type ProgressTrackerProps = {
  steps: ProgressStep[];
};

const DOT = 22;

/**
 * "Progreso ng Transaksyon" — the vertical milestone tracker.
 *
 * Done steps get a green check, the current step a hollow amber ring, failed
 * steps a red cross, and upcoming steps a muted numbered circle.
 */
export function ProgressTracker({ steps }: ProgressTrackerProps) {
  return (
    <View style={styles.card}>
      <AnimoText variant="h3" color={AnimoColors.black}>
        Progreso ng Transaksyon
      </AnimoText>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <View key={step.key} style={styles.row}>
              <View style={styles.rail}>
                <StepDot step={step} index={index} />
                {!isLast && (
                  <View
                    style={[
                      styles.connector,
                      step.state === 'done' && styles.connectorDone,
                    ]}
                  />
                )}
              </View>

              <View style={[styles.body, isLast && styles.bodyLast]}>
                <AnimoText
                  variant="bodyEmphasis"
                  color={LABEL_COLOR[step.state]}
                  numberOfLines={2}>
                  {step.label}
                </AnimoText>
                {step.detail ? (
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    {step.detail}
                  </AnimoText>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const LABEL_COLOR: Record<ProgressStep['state'], string> = {
  done: AnimoColors.black,
  current: AnimoColors.black,
  failed: AnimoColors.danger,
  upcoming: AnimoColors.muted,
};

function StepDot({ step, index }: { step: ProgressStep; index: number }) {
  if (step.state === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Check size={13} color={AnimoColors.white} strokeWidth={3} />
      </View>
    );
  }

  if (step.state === 'failed') {
    return (
      <View style={[styles.dot, styles.dotFailed]}>
        <X size={13} color={AnimoColors.white} strokeWidth={3} />
      </View>
    );
  }

  if (step.state === 'current') {
    return (
      <View style={[styles.dot, styles.dotCurrent]}>
        <View style={styles.dotCurrentCore} />
      </View>
    );
  }

  return (
    <View style={[styles.dot, styles.dotUpcoming]}>
      <AnimoText variant="tag" color={AnimoColors.muted}>
        {index + 1}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  steps: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  rail: {
    alignItems: 'center',
    width: DOT,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: AnimoColors.green,
  },
  dotFailed: {
    backgroundColor: AnimoColors.danger,
  },
  dotCurrent: {
    borderWidth: 2,
    borderColor: '#E0A02A',
    backgroundColor: AnimoColors.white,
  },
  dotCurrentCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0A02A',
  },
  dotUpcoming: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.surface,
  },
  connector: {
    flex: 1,
    width: 2,
    minHeight: 18,
    backgroundColor: AnimoColors.border,
    marginVertical: 2,
  },
  connectorDone: {
    backgroundColor: AnimoColors.green,
  },
  body: {
    flex: 1,
    paddingBottom: AnimoSpacing.lg,
    gap: 2,
  },
  bodyLast: {
    paddingBottom: 0,
  },
});
