import { router } from 'expo-router';
import { AlertCircle, Store } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import type { DisplayStage, PaymentMode } from '@/types/transaction';

/** Buyer must pay, or arrange / complete pickup. */
const NEEDS_ACTION: Partial<Record<DisplayStage, true>> = {
  awaiting_payment: true,
  payment_confirmed: true,
  delivered: true,
};

const DOT_TONE: Partial<Record<DisplayStage, string>> = {
  request_pending: AnimoColors.moderate,
  awaiting_payment: AnimoColors.focusRing,
  payment_sent: AnimoColors.mild,
  payment_confirmed: AnimoColors.mild,
  delivered: AnimoColors.mild,
};

export type BuyerTransactionCardItem = {
  /** Request id pre-match, or transaction id post-match. */
  id: string;
  stage: DisplayStage;
  statusLabel: string;
  listingName: string;
  specificVariety: string | null;
  price: string;
  weight: string;
  pricePerKg: string;
  paymentMode: PaymentMode | null;
  farmer: string;
  date: string;
  time: string;
};

export type BuyerTransactionCardProps = {
  item: BuyerTransactionCardItem;
  onPress?: () => void;
};

/** Buyer Transaksyon overview card — listing-first layout with farmer + status. */
export function BuyerTransactionCard({ item, onPress }: BuyerTransactionCardProps) {
  const isDone = item.stage === 'completed';
  const needsAction = NEEDS_ACTION[item.stage] === true;
  const dotColor = DOT_TONE[item.stage];

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (item.stage === 'awaiting_payment') {
      router.push(`/(buyer)/transaksyon/${item.id}/pickup`);
    } else if (
      item.stage === 'payment_sent' ||
      item.stage === 'payment_confirmed' ||
      item.stage === 'delivered' ||
      item.stage === 'completed'
    ) {
      router.push(`/(buyer)/transaksyon/${item.id}/resibo`);
    } else {
      router.push(`/(buyer)/transaksyon/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={handlePress}
      style={styles.card}>
      <View style={styles.cardBody}>
        {/* 1. Farmer + status */}
        <View style={[styles.rowBetween, styles.headerRow]}>
          <View style={styles.farmerRow}>
            <Store size={14} color={AnimoColors.accentPrimary} />
            <AnimoText
              variant="bodyEmphasis"
              color={AnimoColors.textHighEmphasis}
              numberOfLines={1}
              style={styles.farmerName}>
              {item.farmer}
            </AnimoText>
          </View>
          <StatusLabel label={item.statusLabel} isDone={isDone} dotColor={dotColor} />
        </View>

        {/* 2. Listing title */}
        <AnimoText
          variant="h3"
          color={AnimoColors.textHighEmphasis}
          numberOfLines={2}
          style={styles.listingTitle}>
          {item.listingName}
        </AnimoText>

        {/* 3. Variety (left) | kg + price/kg (right) */}
        <View style={[styles.rowBetween, styles.metaRow]}>
          {item.specificVariety ? (
            <AnimoText
              variant="caption"
              color={AnimoColors.textMediumEmphasis}
              numberOfLines={1}
              style={styles.metaLeft}>
              {item.specificVariety}
            </AnimoText>
          ) : (
            <View style={styles.metaLeft} />
          )}
          <AnimoText
            variant="caption"
            color={AnimoColors.textMediumEmphasis}
            numberOfLines={1}
            style={styles.metaRight}>
            {item.weight} ({item.pricePerKg})
          </AnimoText>
        </View>

        {/* 4. Divider */}
        <View style={styles.divider} />

        {/* 5. Payment (left) | total (right) */}
        <View style={[styles.rowBetween, styles.paymentRow]}>
          <AnimoText
            variant="caption"
            color={AnimoColors.textHighEmphasis}
            numberOfLines={1}
            style={styles.metaLeft}>
            {item.paymentMode ? `Payment: ${item.paymentMode}` : 'Payment: —'}
          </AnimoText>
          <AnimoText color={AnimoColors.accentPrimary} style={styles.price}>
            {item.price}
          </AnimoText>
        </View>

        {/* 6. Date/time */}
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.datetime}>
          {item.date}
          {item.time ? `  ·  ${item.time}` : ''}
        </AnimoText>
      </View>

      {/* 7. Needs-action banner */}
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

function StatusLabel({
  label,
  isDone,
  dotColor,
}: {
  label: string;
  isDone: boolean;
  dotColor?: string;
}) {
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
      <AnimoText
        variant="tag"
        color={dotColor ? AnimoColors.textHighEmphasis : AnimoColors.textLowEmphasis}>
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
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  farmerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
    minWidth: 0,
  },
  headerRow: {
    marginBottom: AnimoSpacing.sm,
  },
  farmerName: {
    flexShrink: 1,
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
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: AnimoRadius.pill,
  },
  listingTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginBottom: AnimoSpacing.xs,
  },
  metaRow: {
    marginBottom: AnimoSpacing.md,
    alignItems: 'flex-start',
  },
  metaLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: AnimoSpacing.sm,
  },
  metaRight: {
    flexShrink: 0,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    marginBottom: AnimoSpacing.md,
  },
  paymentRow: {
    marginBottom: AnimoSpacing.sm,
    alignItems: 'center',
  },
  price: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: 'PlusJakartaSans_700Bold',
    flexShrink: 0,
  },
  datetime: {
    fontSize: 11,
    lineHeight: 14,
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
