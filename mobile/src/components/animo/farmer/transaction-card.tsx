import { router } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import {
  isFarmerNeedsActionStage,
  type DisplayStage,
  type PaymentMode,
} from '@/types/transaction';

const DOT_TONE: Partial<Record<DisplayStage, string>> = {
  request_pending: AnimoColors.moderate,
  awaiting_payment: AnimoColors.focusRing,
  payment_sent: AnimoColors.mild,
  payment_confirmed: AnimoColors.mild,
};

export type FarmerTransactionCardItem = {
  /** Routing key — a request_id for `request_pending` rows, a transaction_id otherwise. */
  id: string;
  referenceId: string;
  stage: DisplayStage;
  statusLabel: string;
  /** Unused in Part B row UI (covered by Impormasyon ng Palay); kept for mapper compatibility. */
  variety: string;
  moisture: string;
  price: string;
  weight: string;
  pricePerKg: string;
  paymentMode: PaymentMode | null;
  buyer: string;
  date: string;
  time: string;
};

export type TransactionCardProps = {
  item: FarmerTransactionCardItem;
  onPress?: () => void;
};

/** Farmer Part B list card: buyer, amount, kg, payment, ref, status, date/time. */
export function TransactionCard({ item, onPress }: TransactionCardProps) {
  const isDone = item.stage === 'completed';
  const needsAction = isFarmerNeedsActionStage(item.stage);
  const dotColor = DOT_TONE[item.stage];

  const openTransactionDetail = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({ pathname: '/(farmer)/transaksyon/[id]', params: { id: item.id } });
  };

  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.85} onPress={openTransactionDetail} style={styles.card}>
      <View style={styles.cardBody}>
        {/* Reference ID and Status */}
        <View style={[styles.rowBetween, styles.refRow]}>
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            {item.referenceId}
          </AnimoText>
          <StatusLabel label={item.statusLabel} isDone={isDone} dotColor={dotColor} />
        </View>

        <View style={styles.divider} />

        {/* Buyer Name and Price */}
        <View style={styles.rowBetween}>
          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.textHighEmphasis}
            style={styles.buyerName}
            numberOfLines={1}>
            {item.buyer}
          </AnimoText>
          <AnimoText color={AnimoColors.accentPrimary} style={styles.price}>
            {item.price}
          </AnimoText>
        </View>

        {/* Weight and Payment Mode */}
        <View style={styles.rowBetween}>
          <AnimoText variant="caption" color={AnimoColors.textHighEmphasis}>
            {item.weight}
          </AnimoText>
          {item.paymentMode ? (
            <View style={item.paymentMode === 'GCash' ? styles.payPillGcash : styles.payPillCash}>
              <AnimoText
                variant="tag"
                color={item.paymentMode === 'GCash' ? AnimoColors.focusRing : AnimoColors.textMediumEmphasis}>
                {item.paymentMode}
              </AnimoText>
            </View>
          ) : (
            <View />
          )}
        </View>

        {/* Date and Time */}
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.datetime}>
          {item.date}
          {item.time ? `   (${item.time})` : ''}
        </AnimoText>
      </View>

      {needsAction ? (
        <View style={styles.actionBanner}>
          <AlertCircle size={14} color={AnimoColors.moderate} />
          <AnimoText variant="caption" color={AnimoColors.moderate} style={styles.actionText}>
            Kailangan ng aksyon
          </AnimoText>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function StatusLabel({ label, isDone, dotColor }: { label: string; isDone: boolean; dotColor?: string }) {
  if (isDone) {
    return (
      <View style={styles.statusFilled}>
        <AnimoText variant="tag" color={AnimoColors.white}>
          {label}
        </AnimoText>
      </View>
    );
  }

  return (
    <View style={styles.statusPlain}>
      {dotColor ? <View style={[styles.statusDot, { backgroundColor: dotColor }]} /> : null}
      <AnimoText variant="tag" color={dotColor ?? AnimoColors.textMediumEmphasis}>
        {label}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginBottom: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    overflow: 'hidden',
    shadowColor: AnimoColors.darkBackground,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBody: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  buyerName: {
    flex: 1,
  },
  price: {
    fontSize: 18,
    lineHeight: 26,
    fontFamily: 'PlusJakartaSans_700Bold',
    flexShrink: 0,
  },
  refRow: {
    marginTop: AnimoSpacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    opacity: 0.5,
    // marginVertical: AnimoSpacing.sm, // or only marginTop / marginBottom
  },
  
  datetime: {
    marginTop: 2,
  },
  statusFilled: {
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.xs,
  },
  statusPlain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: AnimoRadius.pill,
  },
  payPillGcash: {
    backgroundColor: AnimoColors.focusRingLight,
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  payPillCash: {
    backgroundColor: AnimoColors.surfaceTertiary,
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.surfaceTertiary,
    backgroundColor: 'rgba(255, 224, 178, 0.4)',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
  },
  actionText: {
    ...AnimoType.caption,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
