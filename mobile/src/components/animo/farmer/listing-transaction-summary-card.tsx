import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';

export type ListingTransactionSummaryCardProps = {
  title: string;
  varietyLine: string;
  remainingKg: number;
  soldKg: number;
  earnings: number;
  needsAction: boolean;
  /** Listing is sold out (shows the neutral "Naubos" pill instead of "Aktibo"). */
  soldOut?: boolean;
  onPress: () => void;
};

/** Per-listing Transaksyon rollup: name + status pill, then Natitira / Naibenta / Buong Kita columns. */
export function ListingTransactionSummaryCard({
  title,
  varietyLine,
  remainingKg,
  soldKg,
  earnings,
  needsAction,
  soldOut = false,
  onPress,
}: ListingTransactionSummaryCardProps) {
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <DepthCard
        onPress={onPress}
        accessibilityLabel={`${title}, ${t('ftx.left')} ${remainingKg} kg, ${t('ftx.sold')} ${soldKg} kg, ${t('ftx.earnings')} ${formatPeso(earnings)}`}>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.flex}>
              <AnimoText variant="subheading" numberOfLines={2}>
                {title}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
                {varietyLine}
              </AnimoText>
            </View>
            <StatusPill
              tone={soldOut ? 'neutral' : 'success'}
              label={soldOut ? t('ftx.soldOut') : t('ftx.active')}
            />
          </View>

          <View style={styles.cols}>
            <Column label={t('ftx.left')} value={`${remainingKg} kg`} />
            <Column label={t('ftx.sold')} value={`${soldKg} kg`} />
            <Column label={t('ftx.earnings')} value={formatPeso(earnings)} brand />
          </View>

          <ChunkyButton
            size="sm"
            flat
            variant="secondary"
            borderColor={AnimoV2Colors.actionPrimary}
            label={t('ftx.viewOrders')}
            onPress={onPress}
            style={styles.link}
          />
        </View>

        {needsAction ? (
          <View style={styles.action}>
            <AlertTriangle size={18} color={AnimoV2Colors.cautionFg} strokeWidth={2.75} />
            <AnimoText variant="tagV2" color={AnimoV2Colors.cautionFg}>
              {t('action.needsAction')}
            </AnimoText>
          </View>
        ) : null}
      </DepthCard>
    </View>
  );
}

function Column({ label, value, brand = false }: { label: string; value: string; brand?: boolean }) {
  return (
    <View style={styles.col}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyStrong" color={brand ? AnimoV2Colors.textBrand : AnimoV2Colors.textPrimary}>
        {value}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: AnimoV2Spacing.md },
  flex: { flex: 1, minWidth: 0 },
  body: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AnimoV2Spacing.sm },
  cols: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  col: { flex: 1, minWidth: 0 },
  link: { alignSelf: 'stretch' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.cautionBg,
  },
});
