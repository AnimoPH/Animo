import { Image } from 'expo-image';
import { router } from 'expo-router';
import { AlertTriangle, ImageIcon, Store } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { BuyerStagePill } from '@/components/animo/buyer/txn-v2';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { isBuyerNeedsActionStage, type DisplayStage, type PaymentMode } from '@/types/transaction';

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
  /** Cover photo of the listing, when one is available. */
  photoUrl?: string;
};

export type BuyerTransactionCardProps = {
  item: BuyerTransactionCardItem;
  onPress?: () => void;
};

const PHOTO = 72;

/** Buyer Transaksyon card: photo, listing, farmer, kg, total and a status pill (icon + label). */
export function BuyerTransactionCard({ item, onPress }: BuyerTransactionCardProps) {
  const { t } = useLanguage();
  const needsAction = isBuyerNeedsActionStage(item.stage);

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
    <View style={styles.wrap}>
      <DepthCard
        onPress={handlePress}
        accessibilityLabel={t('buyTxV2.openCard', {
          name: item.listingName,
          farmer: item.farmer,
          status: item.statusLabel,
        })}>
        <View style={styles.body}>
          <View style={styles.top}>
            <View style={styles.photo}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.photoImage} contentFit="cover" />
              ) : (
                <ImageIcon size={28} color={AnimoV2Colors.textTertiary} />
              )}
            </View>

            <View style={styles.info}>
              <AnimoText variant="subheading" numberOfLines={1}>
                {item.listingName}
              </AnimoText>
              <View style={styles.farmerRow}>
                <Store size={16} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                <AnimoText
                  variant="captionV2"
                  color={AnimoV2Colors.textSecondary}
                  numberOfLines={1}
                  style={styles.farmerName}>
                  {item.farmer}
                </AnimoText>
              </View>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary} numberOfLines={1}>
                {item.date}
                {item.time ? `  ·  ${item.time}` : ''}
              </AnimoText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.bottom}>
            <View style={styles.totalCol}>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
                {item.weight} · {item.pricePerKg}
              </AnimoText>
              <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand} numberOfLines={1}>
                {item.price}
              </AnimoText>
            </View>
            <BuyerStagePill stage={item.stage} label={item.statusLabel} />
          </View>
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

const styles = StyleSheet.create({
  wrap: { marginBottom: AnimoV2Spacing.md },
  body: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  top: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: PHOTO, height: PHOTO },
  info: { flex: 1, minWidth: 0, gap: 2, justifyContent: 'center' },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  totalCol: { flexShrink: 1, minWidth: 0, gap: 2 },
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  farmerName: { flexShrink: 1 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.cautionBg,
  },
});
