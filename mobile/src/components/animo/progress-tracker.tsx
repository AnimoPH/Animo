import { Check, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { ProgressStep } from '@/constants/marketplace';

export type ProgressTrackerProps = {
  steps: ProgressStep[];
  /** Defaults to the buyer tracker title so existing screens stay unchanged. */
  title?: string;
};

const DOT = 22;

/**
 * Vertical milestone tracker used by buyer and farmer transaction details.
 *
 * Done steps get a green check, the current step a numbered ring, failed
 * steps a red cross, and upcoming steps a muted numbered circle.
 */
export function ProgressTracker({
  steps,
  title = 'Progreso ng Transaksyon',
}: ProgressTrackerProps) {
  return (
    <View style={styles.card}>
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
        {title}
      </AnimoText>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const labelColor = LABEL_COLOR[step.state];
          const detailColor =
            step.state === 'upcoming' || step.state === 'current'
              ? DETAIL_COLOR[step.state]
              : AnimoColors.textMediumEmphasis;

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
                <AnimoText variant="bodyEmphasis" color={labelColor} numberOfLines={2}>
                  {step.label}
                </AnimoText>
                {step.timestamp ? (
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    {step.timestamp}
                  </AnimoText>
                ) : null}
                {step.detail ? (
                  <AnimoText
                    variant={step.state === 'current' ? 'body' : 'caption'}
                    color={detailColor}>
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
  done: AnimoColors.textAccentPrimary,
  current: AnimoColors.textAccentPrimary,
  failed: AnimoColors.danger,
  upcoming: AnimoColors.textLowEmphasis,
};

const DETAIL_COLOR: Record<ProgressStep['state'], string> = {
  done: AnimoColors.textMediumEmphasis,
  current: AnimoColors.textHighEmphasis,
  failed: AnimoColors.danger,
  upcoming: AnimoColors.textLowEmphasis,
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
        <AnimoText variant="tag" color={AnimoColors.textAccentPrimary}>
          {index + 1}
        </AnimoText>
      </View>
    );
  }

  return (
    <View style={[styles.dot, styles.dotUpcoming]}>
      <AnimoText variant="tag" color={AnimoColors.textLowEmphasis}>
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
    backgroundColor: AnimoColors.surfacePrimary,
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
    borderColor: AnimoColors.borderAccentPrimary,
    backgroundColor: AnimoColors.white,
  },
  dotUpcoming: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.white,
  },
  connector: {
    flex: 1,
    width: 2,
    minHeight: 18,
    backgroundColor: AnimoColors.borderLowEmphasis,
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
