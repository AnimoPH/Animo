import { StyleSheet } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { Timeline, type TimelineStep, type TimelineStepState } from '@/components/animo/ui/timeline';
import { AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';
import type { ProgressStep } from '@/types/transaction';

export type ProgressTrackerProps = {
  steps: ProgressStep[];
  /** Defaults to the buyer tracker title so existing screens stay unchanged. */
  title?: string;
};

const STATE_LABEL_KEY: Record<TimelineStepState, TranslationKey> = {
  done: 'buyTxV2.stateDone',
  current: 'buyTxV2.stateCurrent',
  upcoming: 'buyTxV2.stateUpcoming',
  failed: 'buyTxV2.stateFailed',
};

/**
 * Buyer transaction timeline (DESIGN_SPEC section 5): done steps are solid green with a check,
 * the current step is outlined, upcoming steps are grey. Steps come from `buildProgressSteps`.
 */
export function ProgressTracker({ steps, title }: ProgressTrackerProps) {
  const { t } = useLanguage();

  const timelineSteps: TimelineStep[] = steps.map((step) => ({
    key: step.key,
    label: step.label,
    detail: [step.timestamp, step.detail].filter(Boolean).join('\n') || undefined,
    state: step.state,
  }));

  return (
    <DepthCard depth="flat" radius="xl" style={styles.card}>
      <AnimoText variant="subheading">{title ?? t('buyTxV2.progressTitle')}</AnimoText>
      <Timeline
        steps={timelineSteps}
        stateLabel={(s) => t(STATE_LABEL_KEY[s])}
        stepLabel={(n) => t('buyTxV2.stepN', { n })}
      />
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.lg },
});
