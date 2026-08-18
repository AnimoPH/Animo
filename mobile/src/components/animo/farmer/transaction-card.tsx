import { router } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';

export const STATUS_CONFIG = {
  'Bagong Kahilingan': {
    dotColor: AnimoColors.moderate,
    textColor: AnimoColors.moderate,
    showDot: true,
    isFilled: false,
    needsAction: true,
  },
  'I-approve ang Schedule': {
    dotColor: AnimoColors.moderate,
    textColor: AnimoColors.moderate,
    showDot: false,
    isFilled: false,
    needsAction: true,
  },
  'Naghihintay ng Inspeksyon': {
    dotColor: AnimoColors.mild,
    textColor: AnimoColors.mild,
    showDot: true,
    isFilled: false,
    needsAction: false,
  },
  'Naghihintay ng Bayad': {
    dotColor: AnimoColors.focusRing,
    textColor: AnimoColors.focusRing,
    showDot: true,
    isFilled: false,
    needsAction: true,
  },
  'Naghihintay ng Kumpirmasyon': {
    dotColor: AnimoColors.mild,
    textColor: AnimoColors.mild,
    showDot: true,
    isFilled: false,
    needsAction: true,
  },
  'Transaction Done': {
    dotColor: AnimoColors.accentPrimary,
    textColor: AnimoColors.white,
    showDot: false,
    isFilled: true,
    needsAction: false,
  },
  Nakansela: {
    dotColor: AnimoColors.objectDisabled,
    textColor: AnimoColors.objectDisabled,
    showDot: false,
    isFilled: false,
    needsAction: false,
  },
  'Hindi Natuloy': {
    dotColor: AnimoColors.caution,
    textColor: AnimoColors.caution,
    showDot: false,
    isFilled: false,
    needsAction: false,
  },
} as const;

export type TransactionStatus = keyof typeof STATUS_CONFIG;
export type PaymentMode = 'GCash' | 'Cash';

export type FarmerTransactionCardItem = {
  id: string;
  txnId: string;
  variety: string;
  moisture: string;
  status: TransactionStatus;
  price: string;
  weight: string;
  pricePerKg: string;
  paymentMode: PaymentMode;
  buyer: string;
  date: string;
  time: string;
};

export type TransactionCardProps = {
  item: FarmerTransactionCardItem;
  onPress?: () => void;
};

/** Farmer transaksyon list card: ID, status, variety, payment, total, buyer, date. */
export function TransactionCard({ item, onPress }: TransactionCardProps) {
  const config = STATUS_CONFIG[item.status];

  const openTransactionDetail = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({
      pathname: '/(farmer)/transaksyon/[id]',
      params: { id: item.id },
    });
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={openTransactionDetail}
      style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            {item.txnId}
          </AnimoText>
          <StatusLabel status={item.status} />
        </View>

        <View style={styles.varietyRow}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {item.variety} ({item.moisture})
          </AnimoText>
          <View
            style={item.paymentMode === 'GCash' ? styles.payPillGcash : styles.payPillCash}>
            <AnimoText
              variant="tag"
              color={
                item.paymentMode === 'GCash'
                  ? AnimoColors.focusRing
                  : AnimoColors.textMediumEmphasis
              }>
              {item.paymentMode}
            </AnimoText>
          </View>
        </View>

        <View style={styles.priceRow}>
          <AnimoText color={AnimoColors.accentPrimary} style={styles.price}>
            {item.price}
          </AnimoText>
          <View style={styles.weightGroup}>
            <AnimoText variant="caption" color={AnimoColors.textHighEmphasis}>
              {item.weight}
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              ({item.pricePerKg})
            </AnimoText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.buyerRow}>
          <View style={styles.buyerCol}>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
              Mamimili:
            </AnimoText>
            <AnimoText
              variant="bodyEmphasis"
              color={AnimoColors.textHighEmphasis}
              style={styles.buyerName}>
              {item.buyer}
            </AnimoText>
          </View>
          <View style={styles.dateCol}>
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              {item.date}
            </AnimoText>
            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.time}>
              {item.time}
            </AnimoText>
          </View>
        </View>
      </View>

      {config.needsAction ? (
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

function StatusLabel({ status }: { status: TransactionStatus }) {
  const config = STATUS_CONFIG[status];

  if (config.isFilled) {
    return (
      <View style={styles.statusFilled}>
        <AnimoText variant="tag" color={AnimoColors.white}>
          {status}
        </AnimoText>
      </View>
    );
  }

  return (
    <View style={styles.statusPlain}>
      {config.showDot ? (
        <View style={[styles.statusDot, { backgroundColor: config.dotColor }]} />
      ) : null}
      <AnimoText variant="tag" color={config.textColor}>
        {status}
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
    marginBottom: AnimoSpacing.sm,
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
  varietyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AnimoSpacing.xs,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AnimoSpacing.md,
  },
  price: {
    fontSize: 24,
    lineHeight: 36,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  weightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    marginBottom: AnimoSpacing.md,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  buyerCol: {
    flex: 1,
    paddingRight: AnimoSpacing.md,
  },
  buyerName: {
    marginTop: 2,
  },
  dateCol: {
    alignItems: 'flex-end',
  },
  time: {
    marginTop: 2,
    textAlign: 'right',
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
