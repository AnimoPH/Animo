import { ChevronRight, Star, X, type LucideIcon } from 'lucide-react-native';
import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { AnimoV2Colors, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

/** Tappable stat tile (value + label) that fills its share of a row. */
export function ProfileStatTile({
  icon: Icon,
  filled = false,
  value,
  label,
  a11y,
  onPress,
}: {
  icon: LucideIcon;
  filled?: boolean;
  value: string;
  label: string;
  a11y: string;
  onPress: () => void;
}) {
  return (
    <DepthCard
      radius="lg"
      onPress={onPress}
      accessibilityLabel={`${a11y}: ${value} ${label}`}
      wrapperStyle={styles.flex}
      style={styles.statTile}>
      <Icon
        size={22}
        color={filled ? AnimoV2Colors.warningSolid : AnimoV2Colors.textBrand}
        fill={filled ? AnimoV2Colors.warningSolid : 'none'}
        strokeWidth={2.5}
      />
      <AnimoText variant="heading">{value}</AnimoText>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
        {label}
      </AnimoText>
    </DepthCard>
  );
}

/** A titled group of rows drawn as one raised card with dividers between rows. */
export function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AnimoText variant="subheading" accessibilityRole="header">
        {title}
      </AnimoText>
      <DepthCard radius="xl">
        {Children.toArray(children).map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={styles.rowDivider} /> : null}
            {child}
          </View>
        ))}
      </DepthCard>
    </View>
  );
}

/** One row inside a ProfileSection: icon tile, label, optional caption / value / right slot / chevron. */
export function ProfileRow({
  icon,
  label,
  caption,
  value,
  right,
  chevron = false,
  danger = false,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  caption?: string;
  value?: string;
  right?: ReactNode;
  chevron?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <IconTile icon={icon} tone={danger ? 'danger' : 'success'} size={40} />
      <View style={styles.flex}>
        <AnimoText variant="bodyStrong" color={danger ? AnimoV2Colors.dangerFg : AnimoV2Colors.textPrimary}>
          {label}
        </AnimoText>
        {caption ? (
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {caption}
          </AnimoText>
        ) : null}
      </View>
      {value ? (
        <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} numberOfLines={1} style={styles.rowValue}>
          {value}
        </AnimoText>
      ) : null}
      {right}
      {chevron ? <ChevronRight size={22} color={AnimoV2Colors.textSecondary} strokeWidth={2.5} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      {content}
    </Pressable>
  );
}

/** Read-only star row (filled stars use the warning color). */
export function StarRow({ rating, size }: { rating: number; size: number }) {
  return (
    <View style={styles.starRow} accessible accessibilityLabel={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          color={s <= rating ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
          fill={s <= rating ? AnimoV2Colors.warningSolid : 'none'}
          strokeWidth={2.5}
        />
      ))}
    </View>
  );
}

/** Title + close button for full-screen page-sheet modals. */
export function ModalHeader({ title, closeLabel, onClose }: { title: string; closeLabel: string; onClose: () => void }) {
  return (
    <View style={styles.modalHeader}>
      <AnimoText variant="heading" style={styles.flex} accessibilityRole="header">
        {title}
      </AnimoText>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} onPress={onClose} style={styles.closeBtn}>
        <X size={26} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  statTile: { padding: AnimoV2Spacing.md, alignItems: 'center', gap: AnimoV2Spacing.xs },
  section: { gap: AnimoV2Spacing.sm },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  rowPressed: { backgroundColor: AnimoV2Colors.surfaceMuted },
  rowDivider: { height: 2, backgroundColor: AnimoV2Colors.borderDefault, marginHorizontal: AnimoV2Spacing.lg },
  rowValue: { maxWidth: '40%' },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.md,
  },
  closeBtn: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
