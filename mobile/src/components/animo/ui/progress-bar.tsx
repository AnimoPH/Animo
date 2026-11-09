import { View } from 'react-native';

import { AnimoV2Colors } from '@/constants/animo';

export type ProgressBarProps = {
  /** 0 to 1. */
  value: number;
  height?: number;
  fill?: string;
  track?: string;
};

/** Pill progress bar (wizard 16 high, advisory 14 high). */
export function ProgressBar({
  value,
  height = 16,
  fill = AnimoV2Colors.actionPrimary,
  track = AnimoV2Colors.borderDefault,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}
