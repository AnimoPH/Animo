import { Check, User, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  farmerListingLine,
  farmerStageBadge,
  formatPeso,
  paymentMethodLabel,
  type FarmerTransaction,
} from '@/constants/marketplace';

export type TransactionCardProps = {
  transaction: FarmerTransaction;
  onPress?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
};

/** Farmer transaksyon list card: buyer, listing line, total, payment chip, status. */
export function TransactionCard({
  transaction,
  onPress,
  onAccept,
  onDecline,
}: TransactionCardProps) {
  const badge = farmerStageBadge(transaction.stage);
  const pending = transaction.stage === 'pending';

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.content}>
            <View style={styles.topRow}>
            {/* Buyer row */}
            <View style={styles.buyerRow}>
              {/* Buyer avatar */}
              <View style={styles.avatar}>
                <User size={20} color={AnimoColors.green} />
              </View>
              
              <View style={styles.flex}>
                {/* Buyer name */}
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} numberOfLines={1}>
                  {transaction.buyer.name}
                </AnimoText>
                {/* Palay Details */}
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  {farmerListingLine(transaction)}
                </AnimoText>
              </View>
            </View>

            <View style={styles.priceCol}>
              {/* Total */}
              <AnimoText variant="h3" color={AnimoColors.textAccentPrimary}>
                {formatPeso(transaction.total)}
              </AnimoText>
              {/* Payment method */}
              <View style={styles.payChip}>
                <AnimoText variant="tag" color={AnimoColors.textMediumEmphasis}>
                  {paymentMethodLabel(transaction.paymentMethod)}
                </AnimoText>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          <View style={styles.statusRow}>
            {/* Status */}
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              Status ng Transaksyon:
            </AnimoText>
            {/* Status badge */}
            <StatusBadge label={badge.label} tone={badge.tone} />
          </View>
        </View>
      </Pressable>

      {/* Buttons row */}
      {pending ? (
        <View style={styles.actions}>
          {/* Decline button */}
          <Pressable
            accessibilityRole="button"
            onPress={onDecline}
            style={({ pressed }) => [
              {
                flex: 1,
                borderRadius: AnimoRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: AnimoSpacing.md,
                paddingHorizontal: AnimoSpacing.lg,
                backgroundColor: 'transparent',
                borderWidth: 1,
                borderColor: AnimoColors.danger,
              },
              pressed && { opacity: 0.85 },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.sm }}>
              <X size={18} color={AnimoColors.danger} strokeWidth={2.4} />
              <AnimoText variant="button" color={AnimoColors.danger}>
                Cancel
              </AnimoText>
            </View>
          </Pressable>

          {/* Accept button */}
          <Pressable
            accessibilityRole="button"
            onPress={onAccept}
            style={({ pressed }) => [
              {
                flex: 1,
                borderRadius: AnimoRadius.md,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: AnimoSpacing.md,
                paddingHorizontal: AnimoSpacing.lg,
                backgroundColor: AnimoColors.accentPrimary,
                // borderWidth: 1,
                // borderColor: AnimoColors.accentPrimary,
              },
              pressed && { opacity: 0.85 },
            ]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.sm }}>
              <Check size={18} color={AnimoColors.surfacePrimary} strokeWidth={2.4} />
              <AnimoText variant="button" color={AnimoColors.surfacePrimary}>
                Accept
              </AnimoText>
            </View>
          </Pressable>
        </View>
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
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pressed: {
    opacity: 0.95,
  },
  content: {
    gap: AnimoSpacing.md,
  },
    flex: {
    flex: 1,
    gap: 'auto',
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
  },
  buyerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: AnimoSpacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceCol: {
    alignItems: 'flex-end',
    gap: AnimoSpacing.xs,
  },
  payChip: {
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surface,
  },
  divider: {
    height: 1,
    opacity: 0.5,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
});
