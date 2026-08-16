import { Clock } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type CountdownCardProps = {
  /** Pre-formatted remaining time, e.g. "2 araw 23:45". */
  remaining: string;
  /** Label above the countdown. */
  label: string;
  /** Line under the bar, e.g. accept + deadline timestamps. */
  footnote: string;
  /** Fraction of the window already elapsed, 0–1. */
  elapsed: number;
};

/** Deadline countdown with an elapsed-time bar. */
export function CountdownCard({
  remaining,
  label,
  footnote,
  elapsed,
}: CountdownCardProps) {
  const pct = Math.max(0, Math.min(1, elapsed)) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Clock size={16} color={AnimoColors.blackSecondary} />
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {label}
        </AnimoText>
      </View>

      <AnimoText variant="display" color="#D9761F">
        {remaining}
      </AnimoText>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>

      <AnimoText variant="caption" color={AnimoColors.muted}>
        {footnote}
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
    gap: AnimoSpacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AnimoColors.surface,
    overflow: 'hidden',
    marginTop: AnimoSpacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#E8891F',
  },
});
