import { AlertTriangle, Check, Clock, Info, X, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Radius, AnimoV2Spacing, AnimoV2Status, type StatusTone } from '@/constants/animo';

const TONE_ICON: Record<StatusTone, LucideIcon> = {
  success: Check,
  warning: Clock,
  danger: X,
  caution: AlertTriangle,
  neutral: Info,
};

export type StatusPillProps = {
  tone: StatusTone;
  label: string;
  /** Override the default icon for the tone. */
  icon?: LucideIcon;
};

/** v2 status pill. Status is never color only: always an icon plus a label. */
export function StatusPill({ tone, label, icon }: StatusPillProps) {
  const { bg, fg } = AnimoV2Status[tone];
  const Icon = icon ?? TONE_ICON[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessible accessibilityLabel={label}>
      <Icon size={16} color={fg} strokeWidth={3} />
      <AnimoText variant="tagV2" color={fg}>
        {label}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: AnimoV2Spacing.md,
    paddingVertical: 6,
    borderRadius: AnimoV2Radius.full,
  },
});
