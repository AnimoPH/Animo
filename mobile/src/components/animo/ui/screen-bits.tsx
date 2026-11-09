import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

/** Round 48px icon button (back, close, bell). */
export function IconButton({
  icon,
  label,
  onPress,
  backgroundColor,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={[styles.iconBtn, backgroundColor ? { backgroundColor } : undefined]}>
      {icon}
    </Pressable>
  );
}

/** v2 back header: chevron + 20/800 title + optional right slot. Sits under the status bar. */
export function V2BackHeader({
  title,
  onBack,
  backLabel,
  right,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
      <IconButton
        icon={<ChevronLeft size={28} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />}
        label={backLabel}
        onPress={onBack}
      />
      <AnimoText variant="heading" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
        {title}
      </AnimoText>
      {right}
    </View>
  );
}

/** Large screen title block (Title 26/800 + optional supporting line) for tab screens. */
export function V2ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + AnimoV2Spacing.md,
        paddingHorizontal: AnimoV2Spacing.lg,
        paddingBottom: AnimoV2Spacing.sm,
        gap: AnimoV2Spacing.xs,
      }}>
      <AnimoText variant="title" accessibilityRole="header">
        {title}
      </AnimoText>
      {subtitle ? (
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
          {subtitle}
        </AnimoText>
      ) : null}
    </View>
  );
}

/** Sticky action bar. Render as a sibling BELOW the ScrollView so it sits above the tab bar. */
export function StickyFooter({ children }: { children: ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

const styles = StyleSheet.create({
  iconBtn: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    borderRadius: AnimoV2Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.xs,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.sm,
  },
  footer: {
    backgroundColor: AnimoV2Colors.surfaceApp,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.md,
  },
});
