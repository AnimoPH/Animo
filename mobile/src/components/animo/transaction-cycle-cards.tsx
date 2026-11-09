import { Circle, Droplets, Scale, ShieldCheck, Sprout } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { BuyerStagePill } from '@/components/animo/buyer/txn-v2';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import {
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';
import type { DisplayStage } from '@/types/transaction';

const ICON_SIZE = 20;

/** "Status" label with the v2 stage pill (icon + label, never color only). */
export function TransactionStatusRow({ stage, label }: { stage: DisplayStage; label: string }) {
  const { t } = useLanguage();
  return (
    <View style={styles.statusRow}>
      <AnimoText variant="bodyStrong" color={AnimoV2Colors.textSecondary}>
        {t('buyTxV2.status')}
      </AnimoText>
      <BuyerStagePill stage={stage} label={label} />
    </View>
  );
}

/** Green price card: listing facts, locked Patas na Presyo and the total. */
export function TransactionSummaryCard({
  listing,
  quantityKg,
  pricePerKg,
  totalAmount,
  referenceId,
  language,
}: {
  listing: CropListing;
  quantityKg: number;
  pricePerKg: number;
  totalAmount: number;
  referenceId: string;
  language: 'tl' | 'en';
}) {
  const isTagalog = language === 'tl';
  const specificVariety = specificVarietyDisplay(listing, language);
  const iconColor = AnimoV2Colors.brandLight;
  const rows: { key: string; icon: ReactNode; label: string; value: string }[] = [
    {
      key: 'variety',
      icon: <Sprout size={ICON_SIZE} color={iconColor} strokeWidth={2.5} />,
      label: isTagalog ? 'Uri ng palay' : 'Rice Variety',
      value: varietyLabel(listing, language),
    },
    ...(specificVariety
      ? [
          {
            key: 'specific',
            icon: <Circle size={ICON_SIZE} color={iconColor} strokeWidth={2.5} />,
            label: isTagalog ? 'Tiyak na uri ng palay' : 'Specific Variety',
            value: specificVariety,
          },
        ]
      : []),
    {
      key: 'moisture',
      icon: <Droplets size={ICON_SIZE} color={iconColor} strokeWidth={2.5} />,
      label: 'Moisture',
      value: moistureLabel(listing.declaredMoisture, language),
    },
    {
      key: 'purity',
      icon: <ShieldCheck size={ICON_SIZE} color={iconColor} strokeWidth={2.5} />,
      label: isTagalog ? 'Grado' : 'Grade',
      value: purityLabel(listing.declaredPurityGrade, language),
    },
    {
      key: 'weight',
      icon: <Scale size={ICON_SIZE} color={iconColor} strokeWidth={2.5} />,
      label: isTagalog ? 'Timbang' : 'Weight',
      value: `${quantityKg} kg`,
    },
  ];

  return (
    <View style={styles.edge}>
      <View style={styles.summary}>
        <View style={styles.summaryHeader}>
          <AnimoText variant="subheading" color={AnimoV2Colors.textOnBrand} style={styles.flex}>
            {isTagalog ? 'Buod ng Bayad' : 'Payment Summary'}
          </AnimoText>
          {referenceId ? (
            <AnimoText variant="captionV2" color={AnimoV2Colors.brandLight}>
              {referenceId}
            </AnimoText>
          ) : null}
        </View>

        {rows.map((row) => (
          <View key={row.key} style={styles.summaryRow}>
            <View style={styles.summaryLabel}>
              {row.icon}
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand} style={styles.flex}>
                {row.label}
              </AnimoText>
            </View>
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand} style={styles.summaryValue}>
              {row.value}
            </AnimoText>
          </View>
        ))}

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand}>
            {isTagalog ? 'Patas na Presyo' : 'Fair Price'}
          </AnimoText>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
            {formatPeso(pricePerKg)}/kg
          </AnimoText>
        </View>
        <View style={styles.totalRow}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
            {isTagalog ? 'Kabuuang Halaga' : 'Total Amount'}
          </AnimoText>
          <AnimoText variant="heading" color={AnimoV2Colors.textOnBrand}>
            {formatPeso(totalAmount)}
          </AnimoText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  edge: {
    borderRadius: AnimoV2Radius.xl,
    backgroundColor: AnimoV2Colors.actionPrimaryDepth,
    paddingBottom: 6,
  },
  summary: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  summaryLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '50%',
  },
  summaryDivider: {
    height: 2,
    borderRadius: 2,
    backgroundColor: AnimoV2Colors.brandMid,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
});
