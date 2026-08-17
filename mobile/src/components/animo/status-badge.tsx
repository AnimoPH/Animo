import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type BadgeTone = 'info' | 'success' | 'warning' | 'mild' | 'danger' | 'neutral';

export type StatusBadgeProps = {
  label: string;
  tone?: BadgeTone;
  /** Optional leading icon. */
  icon?: ReactNode;
};

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  info: { bg: '#E3EEFB', fg: '#2563A8' },
  success: { bg: AnimoColors.greenTint, fg: AnimoColors.green },
  warning: { bg: '#FBF0D9', fg: '#B4791A' },
  mild: { bg: AnimoColors.mildLight, fg: AnimoColors.moderate },
  danger: { bg: AnimoColors.dangerTint, fg: AnimoColors.danger },
  neutral: { bg: AnimoColors.surface, fg: AnimoColors.blackSecondary },
};

/** Small rounded status/tag pill (e.g. "Aktibo", "Tinantyang Presyo"). */
export function StatusBadge({ label, tone = 'neutral', icon }: StatusBadgeProps) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon}
      <AnimoText variant="tag" color={fg}>
        {label}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 4,
    borderRadius: AnimoRadius.pill,
  },
});
