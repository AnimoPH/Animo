import { Check, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';

export type TimelineStepState = 'done' | 'current' | 'upcoming' | 'failed';

export type TimelineStep = {
  key: string;
  label: string;
  /** Supporting line under the label (timestamp, hint). */
  detail?: string;
  state: TimelineStepState;
};

export type TimelineProps = {
  steps: TimelineStep[];
  /** Spoken state, e.g. "Tapos na". Status is never conveyed by color alone. */
  stateLabel: (state: TimelineStepState) => string;
  /** Spoken step number prefix, e.g. "Hakbang 2". */
  stepLabel: (n: number) => string;
};

const DOT = 32;

/**
 * Vertical milestone timeline (DESIGN_SPEC section 5). Done: solid green dot with a check.
 * Current: white dot with a 3px green ring. Upcoming: grey. Failed: red dot with an X.
 */
export function Timeline({ steps, stateLabel, stepLabel }: TimelineProps) {
  return (
    <View>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const upcoming = step.state === 'upcoming';
        return (
          <View
            key={step.key}
            style={styles.step}
            accessible
            accessibilityLabel={`${stepLabel(index + 1)}, ${step.label}, ${stateLabel(step.state)}${
              step.detail ? `, ${step.detail}` : ''
            }`}>
            <View style={styles.rail}>
              <Dot state={step.state} n={index + 1} />
              {!isLast ? <View style={[styles.line, step.state === 'done' && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.text, isLast && { paddingBottom: 0 }]}>
              <AnimoText
                variant="bodyStrong"
                color={upcoming ? AnimoV2Colors.textTertiary : AnimoV2Colors.textPrimary}>
                {step.label}
              </AnimoText>
              {step.detail ? (
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {step.detail}
                </AnimoText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Dot({ state, n }: { state: TimelineStepState; n: number }) {
  if (state === 'done') {
    return (
      <View style={[styles.dot, styles.dotDone]}>
        <Check size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={3.5} />
      </View>
    );
  }
  if (state === 'failed') {
    return (
      <View style={[styles.dot, styles.dotFailed]}>
        <X size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={3.5} />
      </View>
    );
  }
  return (
    <View style={[styles.dot, state === 'current' ? styles.dotCurrent : styles.dotUpcoming]}>
      <AnimoText
        variant="tagV2"
        color={state === 'current' ? AnimoV2Colors.textBrand : AnimoV2Colors.textTertiary}
        style={{ fontFamily: 'Nunito_800ExtraBold' }}>
        {n}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  rail: { alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dotDone: { backgroundColor: AnimoV2Colors.actionPrimary, borderColor: AnimoV2Colors.actionPrimary },
  dotFailed: { backgroundColor: AnimoV2Colors.dangerSolid, borderColor: AnimoV2Colors.dangerSolid },
  dotCurrent: { backgroundColor: AnimoV2Colors.surfaceCard, borderColor: AnimoV2Colors.actionPrimary, borderWidth: 3 },
  dotUpcoming: { backgroundColor: AnimoV2Colors.surfaceMuted, borderColor: AnimoV2Colors.borderDefault },
  line: {
    width: 4,
    flex: 1,
    minHeight: 20,
    borderRadius: 4,
    marginVertical: 2,
    backgroundColor: AnimoV2Colors.borderDefault,
  },
  lineDone: { backgroundColor: AnimoV2Colors.actionPrimary },
  text: { flex: 1, paddingBottom: 20, gap: 2 },
});
