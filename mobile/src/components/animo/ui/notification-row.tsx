import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { AnimoV2Colors, AnimoV2Spacing, AnimoV2Status, type StatusTone } from '@/constants/animo';

/** Very light green behind an unread row (lighter than `surfaceBrandSubtle`, so the border and dot lead). */
const UNREAD_BG = '#F3FAF4';
const ICON_SIZE = 28;
/** Fixed icon column so every row's text lines up, whichever icon it has. */
const ICON_COLUMN = 36;
const UNREAD_DOT = 12;

export type NotificationRowProps = {
  icon: LucideIcon;
  tone: StatusTone;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  /** Spoken label for the unread dot. */
  unreadLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/**
 * One inbox (Mensahe) row, shared by the buyer and farmer inboxes.
 *
 * Unread rows get a very light green fill and a soft green border; the strong green dot is the main
 * "unread" cue. The icon is a plain glyph (no tinted circle), centered in a fixed-width column.
 */
export function NotificationRow({
  icon: Icon,
  tone,
  title,
  body,
  time,
  unread,
  unreadLabel,
  accessibilityLabel,
  onPress,
}: NotificationRowProps) {
  return (
    <DepthCard
      depth="flat"
      radius="lg"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      backgroundColor={unread ? UNREAD_BG : AnimoV2Colors.surfaceCard}
      borderColor={unread ? AnimoV2Colors.brandLight : AnimoV2Colors.borderDefault}
      style={styles.row}>
      <View style={styles.iconColumn}>
        <Icon size={ICON_SIZE} color={AnimoV2Status[tone].fg} strokeWidth={2.25} />
      </View>
      <View style={styles.textWrap}>
        <AnimoText variant="bodyStrong">{title}</AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {body}
        </AnimoText>
        <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary} style={styles.time}>
          {time}
        </AnimoText>
      </View>
      {unread ? <View style={styles.unreadDot} accessibilityLabel={unreadLabel} /> : null}
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  iconColumn: { width: ICON_COLUMN, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1, minWidth: 0, gap: 2 },
  time: { marginTop: AnimoV2Spacing.xs },
  unreadDot: {
    width: UNREAD_DOT,
    height: UNREAD_DOT,
    borderRadius: UNREAD_DOT / 2,
    backgroundColor: AnimoV2Colors.actionPrimary,
  },
});
