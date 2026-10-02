import { Circle, Droplets, Scale, ShieldCheck, Sprout } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import {
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';
import { PAYMENT_MODE_LABELS, type PaymentMode } from '@/types/transaction';

const SUMMARY_GREEN = '#1B6B32';
const SUMMARY_LIME = '#D6F07A';
const SUMMARY_MUTED = 'rgba(255,255,255,0.82)';

export function TransactionStatusRow({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View style={styles.statusRow}>
      <AnimoText variant="body" color={AnimoColors.blackSecondary}>
        Status:
      </AnimoText>
      <StatusBadge label={label} tone={tone} />
    </View>
  );
}

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
  const rows: { key: string; icon: ReactNode; label: string; value: string }[] = [
    {
      key: 'variety',
      icon: <Sprout size={16} color={SUMMARY_MUTED} />,
      label: isTagalog ? 'Uri ng palay' : 'Rice Variety',
      value: varietyLabel(listing, language),
    },
    ...(specificVariety
      ? [
          {
            key: 'specific',
            icon: <Circle size={16} color={SUMMARY_MUTED} />,
            label: isTagalog ? 'Tiyak na uri ng palay' : 'Specific Variety',
            value: specificVariety,
          },
        ]
      : []),
    {
      key: 'moisture',
      icon: <Droplets size={16} color={SUMMARY_MUTED} />,
      label: 'Moisture content',
      value: moistureLabel(listing.declaredMoisture, language),
    },
    {
      key: 'purity',
      icon: <ShieldCheck size={16} color={SUMMARY_MUTED} />,
      label: 'Purity grade',
      value: purityLabel(listing.declaredPurityGrade, language),
    },
    {
      key: 'weight',
      icon: <Scale size={16} color={SUMMARY_MUTED} />,
      label: 'Weight',
      value: `${quantityKg} kg`,
    },
  ];

  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <AnimoText variant="h3" color={AnimoColors.white}>
          {isTagalog ? 'Buod ng Bayad' : 'Payment Summary'}
        </AnimoText>
        {referenceId ? (
          <AnimoText variant="caption" color={SUMMARY_MUTED}>
            {referenceId}
          </AnimoText>
        ) : null}
      </View>

      {rows.map((row) => (
        <View key={row.key} style={styles.summaryRow}>
          <View style={styles.summaryLabel}>
            {row.icon}
            <AnimoText variant="body" color={AnimoColors.white} style={styles.summaryLabelText}>
              {row.label}
            </AnimoText>
          </View>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.white} style={styles.summaryValue}>
            {row.value}
          </AnimoText>
        </View>
      ))}

      <View style={styles.summaryDivider} />

      <View style={styles.summaryRow}>
        <AnimoText variant="body" color={AnimoColors.white}>
          {isTagalog ? 'Patas na Presyo' : 'Fair Price'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={SUMMARY_LIME}>
          {formatPeso(pricePerKg)}/kg
        </AnimoText>
      </View>
      <View style={styles.summaryRow}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          {isTagalog ? 'Kabuuang Halaga:' : 'Total Amount:'}
        </AnimoText>
        <AnimoText variant="price" color={SUMMARY_LIME}>
          {formatPeso(totalAmount)}
        </AnimoText>
      </View>
    </View>
  );
}

/** Paid amount against the agreed total. A zero difference reads as a match. */
export function AmountComparisonCard({
  paidAmount,
  agreedAmount,
  isTagalog,
}: {
  paidAmount: number;
  agreedAmount: number;
  isTagalog: boolean;
}) {
  const difference = paidAmount - agreedAmount;
  const isMatch = Math.abs(difference) < 0.01;

  return (
    <View style={styles.whiteCard}>
      <AnimoText variant="caption" color={AnimoColors.muted}>
        {isTagalog ? 'Halagang Binayaran' : 'Amount Paid'}
      </AnimoText>
      <AnimoText variant="h1" color={AnimoColors.green}>
        {formatPeso(paidAmount)}
      </AnimoText>
      <View style={styles.whiteDivider} />
      <View style={styles.summaryRow}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {isTagalog ? 'Napagkasunduang Presyo' : 'Agreed Price'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {formatPeso(agreedAmount)}
        </AnimoText>
      </View>
      <View style={styles.summaryRow}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {isTagalog ? 'Pagkakaiba' : 'Difference'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={isMatch ? AnimoColors.green : AnimoColors.black}>
          {isMatch
            ? `₱0.00 (${isTagalog ? 'Tugma' : 'Match'})`
            : formatPeso(Math.abs(difference))}
        </AnimoText>
      </View>
    </View>
  );
}

export function RecordedPaymentMethodCard({
  mode,
  reference,
  isTagalog,
}: {
  mode: PaymentMode;
  reference?: string | null;
  isTagalog: boolean;
}) {
  return (
    <View style={styles.whiteCard}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {isTagalog ? 'Paraan ng pagbabayad' : 'Payment method'}
      </AnimoText>
      <View style={styles.methodBox}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {PAYMENT_MODE_LABELS[mode]}
        </AnimoText>
        {mode === 'GCash' && reference ? (
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Ref: {reference}
          </AnimoText>
        ) : (
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {mode === 'Cash'
              ? isTagalog
                ? 'Bayad na cash sa oras ng pickup'
                : 'Paid in cash upon pickup'
              : isTagalog
                ? 'Bayad gamit ang GCash transfer'
                : 'Paid via GCash transfer'}
          </AnimoText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  summary: {
    backgroundColor: SUMMARY_GREEN,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
    marginBottom: AnimoSpacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  summaryLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  summaryLabelText: {
    flex: 1,
  },
  summaryValue: {
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '46%',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
    marginVertical: AnimoSpacing.xs,
  },
  whiteCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  whiteDivider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  methodBox: {
    borderWidth: 1,
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 2,
  },
});
