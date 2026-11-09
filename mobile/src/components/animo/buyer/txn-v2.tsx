import { router } from 'expo-router';
import { AlertTriangle, Check, Clock, Info, X, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, AnimoV2Status, type StatusTone } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { DisplayStage } from '@/types/transaction';

/**
 * v2 tone + icon for every buyer-visible transaction stage. Always rendered with a label,
 * so status is never conveyed by color alone. Stages where the buyer must act use caution.
 */
export const BUYER_STAGE_PILL: Record<DisplayStage, { tone: StatusTone; icon: LucideIcon }> = {
  request_pending: { tone: 'warning', icon: Clock },
  request_rejected: { tone: 'danger', icon: X },
  request_cancelled: { tone: 'neutral', icon: X },
  awaiting_payment: { tone: 'caution', icon: AlertTriangle },
  payment_sent: { tone: 'warning', icon: Clock },
  payment_confirmed: { tone: 'caution', icon: AlertTriangle },
  delivered: { tone: 'caution', icon: AlertTriangle },
  completed: { tone: 'success', icon: Check },
  transaction_cancelled: { tone: 'neutral', icon: X },
  payment_failed: { tone: 'danger', icon: AlertTriangle },
};

export function BuyerStagePill({ stage, label }: { stage: DisplayStage; label: string }) {
  const { tone, icon } = BUYER_STAGE_PILL[stage];
  return <StatusPill tone={tone} label={label} icon={icon} />;
}

/** Back header used by every buyer transaction screen (back label comes from i18n). */
export function TxnHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const { t } = useLanguage();
  return <V2BackHeader title={title} onBack={onBack ?? (() => router.back())} backLabel={t('common.back')} />;
}

/** Tinted inline note with an icon tile. Replaces the legacy NoticeBanner on buyer transaction screens. */
export function InfoNote({
  tone = 'neutral',
  icon: Icon = Info,
  children,
}: {
  tone?: StatusTone;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const t = AnimoV2Status[tone];
  return (
    <View style={[styles.note, { backgroundColor: t.bg, borderColor: tone === 'neutral' ? AnimoV2Colors.borderDefault : t.solid }]}>
      <IconTile icon={Icon} tone={tone} size={36} />
      <AnimoText variant="captionV2" color={AnimoV2Colors.textPrimary} style={styles.noteText}>
        {children}
      </AnimoText>
    </View>
  );
}

/** Label on the left, value under it is not needed: label left, value right, both can wrap. */
export function DetailRow({ label, value, brand = false }: { label: string; value: string; brand?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.detailLabel}>
        {label}
      </AnimoText>
      <AnimoText
        variant="bodyStrong"
        color={brand ? AnimoV2Colors.textBrand : AnimoV2Colors.textPrimary}
        style={styles.detailValue}>
        {value}
      </AnimoText>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export type BuyerFeedbackTone = 'success' | 'danger' | 'warning' | 'info';

const FEEDBACK_ICON: Record<BuyerFeedbackTone, { icon: LucideIcon; tone: StatusTone }> = {
  success: { icon: Check, tone: 'success' },
  danger: { icon: X, tone: 'danger' },
  warning: { icon: AlertTriangle, tone: 'warning' },
  info: { icon: Info, tone: 'neutral' },
};

/** v2 replacement for FeedbackModal on buyer transaction screens (same props). */
export function BuyerFeedbackDialog({
  visible,
  tone = 'success',
  title,
  message,
  confirmLabel,
  onConfirm,
  secondaryLabel,
  onSecondary,
}: {
  visible: boolean;
  tone?: BuyerFeedbackTone;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const { t } = useLanguage();
  const visual = FEEDBACK_ICON[tone];
  return (
    <V2Dialog
      visible={visible}
      onClose={onConfirm}
      dismissable={false}
      icon={visual.icon}
      iconTone={visual.tone}
      title={title}
      message={message}
      actions={
        <>
          <ChunkyButton label={confirmLabel ?? t('buyTxV2.continue')} onPress={onConfirm} />
          {secondaryLabel && onSecondary ? (
            <ChunkyButton label={secondaryLabel} variant="secondary" onPress={onSecondary} />
          ) : null}
        </>
      }
    />
  );
}

/** v2 replacement for CancelRequestModal on buyer transaction screens (same props). */
export function BuyerCancelDialog({
  visible,
  title,
  body,
  consequences,
  confirmLabel,
  dismissLabel,
  onDismiss,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  consequences: string[];
  confirmLabel: string;
  dismissLabel?: string;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return (
    <V2Dialog
      visible={visible}
      onClose={onDismiss}
      icon={AlertTriangle}
      iconTone="danger"
      title={title}
      message={body}
      actions={
        <>
          <ChunkyButton label={confirmLabel} variant="danger" icon={X} onPress={onConfirm} />
          <ChunkyButton label={dismissLabel ?? t('buyTxV2.keep')} variant="secondary" onPress={onDismiss} />
        </>
      }>
      {consequences.length > 0 ? (
        <View style={styles.consequences}>
          {consequences.map((line) => (
            <View key={line} style={styles.consequenceRow}>
              <View style={styles.bullet} />
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.noteText}>
                {line}
              </AnimoText>
            </View>
          ))}
        </View>
      ) : null}
    </V2Dialog>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
    borderWidth: 2,
    borderRadius: AnimoV2Radius.lg,
  },
  noteText: { flex: 1, minWidth: 0 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.md },
  detailLabel: { flexShrink: 0 },
  detailValue: { flex: 1, textAlign: 'right', minWidth: 0 },
  divider: { height: 2, backgroundColor: AnimoV2Colors.borderDefault, borderRadius: 2 },
  consequences: {
    gap: AnimoV2Spacing.sm,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  consequenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.sm },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: AnimoV2Colors.dangerSolid,
  },
});
