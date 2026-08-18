import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';

export type PaymentSummaryRow = {
  label: string;
  amount: number | string;
  /** Render in green — used for the amount currently due. */
  emphasis?: boolean;
  /** Show as a negative (already-paid) line. */
  negative?: boolean;
  /** Small note under the label, e.g. a payment timestamp. */
  note?: string;
};

export type PaymentSummaryProps = {
  title?: string;
  rows: PaymentSummaryRow[];
  /** Bold total row rendered under a divider. */
  total?: { label: string; amount: number | string };
};

/** "Buod ng Bayad" — a labelled money breakdown. */
export function PaymentSummary({
  title = 'Buod ng Bayad',
  rows,
  total,
}: PaymentSummaryProps) {
  const renderAmount = (amount: number | string) => {
    if (typeof amount === 'number') return formatPeso(amount);
    return amount;
  };

  return (
    <View style={styles.card}>
      <AnimoText variant="h3" color={AnimoColors.black}>
        {title}
      </AnimoText>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <View style={styles.labelWrap}>
            <AnimoText variant="body" color={AnimoColors.blackSecondary}>
              {row.label}
            </AnimoText>
            {row.note ? (
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {row.note}
              </AnimoText>
            ) : null}
          </View>
          <AnimoText
            variant="bodyEmphasis"
            color={row.emphasis ? AnimoColors.green : AnimoColors.black}
            style={styles.amountText}>
            {row.negative ? '− ' : ''}
            {renderAmount(row.amount)}
          </AnimoText>
        </View>
      ))}

      {total ? (
        <>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.totalLabel}>
              {total.label}
            </AnimoText>
            <AnimoText variant="price" color={AnimoColors.green} style={styles.totalPrice}>
              {renderAmount(total.amount)}
            </AnimoText>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  labelWrap: {
    flex: 1,
    gap: 1,
  },
  amountText: {
    textAlign: 'right',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  totalLabel: {
    flex: 1,
  },
  totalPrice: {
    textAlign: 'right',
    flexShrink: 0,
  },
});
