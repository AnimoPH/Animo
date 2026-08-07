import { MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso, type Transaction, type TransactionStatus } from '@/constants/marketplace';

export type TransactionCardProps = {
  transaction: Transaction;
  onPress?: () => void;
};

const STATUS_META: Record<TransactionStatus, { label: string; tone: BadgeTone }> = {
  aktibo: { label: 'Aktibo', tone: 'info' },
  tapos: { label: 'Tapos', tone: 'success' },
  disputed: { label: 'Disputed', tone: 'danger' },
};

/** A transaction summary row for the Transaksyon list. */
export function TransactionCard({ transaction, onPress }: TransactionCardProps) {
  const meta = STATUS_META[transaction.status];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <AnimoText variant="h3" color={AnimoColors.black} style={styles.flex}>
          {transaction.variety}
        </AnimoText>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </View>

      <View style={styles.locationRow}>
        <MapPin size={14} color={AnimoColors.blackSecondary} />
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {transaction.municipality}, {transaction.province}
        </AnimoText>
      </View>

      <View style={styles.bottomRow}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {transaction.quantityKg} kg · {transaction.date}
        </AnimoText>
        <AnimoText variant="price" color={AnimoColors.green}>
          {formatPeso(transaction.total)}
        </AnimoText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  pressed: {
    opacity: 0.95,
  },
  flex: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
