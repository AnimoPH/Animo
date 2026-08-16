import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type NoticeTone = 'warning' | 'danger' | 'info' | 'success' | 'neutral';

export type NoticeBannerProps = {
  tone?: NoticeTone;
  icon?: ReactNode;
  children: ReactNode;
};

const TONES: Record<NoticeTone, { bg: string; border: string }> = {
  warning: { bg: '#FDF6E4', border: '#F0D79A' },
  danger: { bg: AnimoColors.dangerTint, border: AnimoColors.dangerBorder },
  info: { bg: '#EAF2FB', border: '#BBD4EE' },
  success: { bg: AnimoColors.greenTint, border: '#B8D9B9' },
  neutral: { bg: AnimoColors.surface, border: AnimoColors.border },
};

/** Tinted inline callout for deadlines, warnings and confirmations. */
export function NoticeBanner({
  tone = 'warning',
  icon,
  children,
}: NoticeBannerProps) {
  const { bg, border } = TONES[tone];

  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      {icon}
      <AnimoText variant="caption" color={AnimoColors.blackSecondary} style={styles.text}>
        {children}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
    borderWidth: 1,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
  },
  text: {
    flex: 1,
  },
});
