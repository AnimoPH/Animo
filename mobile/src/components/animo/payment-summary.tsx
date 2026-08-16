import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';

export type PaymentSummaryRow = {
  label: string;
  amount: number;
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
  total?: { label: string; amount: number };
};

/** "Buod ng Bayad" — a labelled money breakdown. */
export function PaymentSummary({
  title = 'Buod ng Bayad',
  rows,
  total,
}: PaymentSummaryProps) {
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
            color={row.emphasis ? AnimoColors.green : AnimoColors.black}>
            {row.negative ? '− ' : ''}
            {formatPeso(row.amount)}
          </AnimoText>
        </View>
      ))}

      {total ? (
        <>
          <View style={styles.divider} />
          <View style={styles.row}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
              {total.label}
            </AnimoText>
            <AnimoText variant="price" color={AnimoColors.green}>
              {formatPeso(total.amount)}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  labelWrap: {
    flex: 1,
    gap: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
});
