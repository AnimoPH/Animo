import { Lock, Phone, UserRound } from 'lucide-react-native';
import { Linking, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DetailRow, Divider } from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TransactionCounterpart } from '@/types/transaction';

export type FarmerCardProps = {
  farmer: TransactionCounterpart;
};

/**
 * Farmer contact details, shown once a transaction match exists — per the
 * "Counterpart contact revealed after a transaction match" RLS policy on
 * "user" (migration 0001), only name/phone are ever available here, no
 * address (this schema has no farm-address column to reveal).
 */
export function FarmerCard({ farmer }: FarmerCardProps) {
  const { t } = useLanguage();
  return (
    <DepthCard depth="flat" radius="xl" style={styles.card}>
      <View style={styles.header}>
        <IconTile icon={UserRound} tone="success" />
        <View style={styles.headerText}>
          <AnimoText variant="subheading" numberOfLines={2}>
            {farmer.name}
          </AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t('buyTxV2.farmer')}
          </AnimoText>
        </View>
      </View>

      <Divider />

      <DetailRow label={t('buyTxV2.contactNumber')} value={farmer.phone} />

      <ChunkyButton
        size="sm"
        flat
        variant="secondary"
        borderColor={AnimoV2Colors.actionPrimary}
        icon={Phone}
        label={t('buyTxV2.call')}
        accessibilityLabel={t('buyTxV2.callName', { name: farmer.name })}
        onPress={() => Linking.openURL(`tel:${farmer.phone.replace(/\s/g, '')}`)}
        style={styles.callBtn}
      />
    </DepthCard>
  );
}

/** Placeholder shown while the farmer has not accepted the request yet. */
export function LockedFarmerCard() {
  const { t } = useLanguage();
  return (
    <DepthCard depth="flat" radius="xl" style={styles.card}>
      <View style={styles.header}>
        <IconTile icon={Lock} tone="neutral" />
        <View style={styles.headerText}>
          <AnimoText variant="subheading">{t('buyTxV2.farmerDetails')}</AnimoText>
          <StatusPill tone="neutral" label={t('buyTxV2.locked')} icon={Lock} />
        </View>
      </View>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
        {t('buyTxV2.lockedHint')}
      </AnimoText>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  callBtn: { alignSelf: 'stretch' },
});
