import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FARMER_STAGE_PILL, FarmerStagePill } from '@/components/animo/farmer/farmer-stage';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { isFarmerNeedsActionStage, type DisplayStage, type PaymentMode } from '@/types/transaction';

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
  /** When set, the row leads with the listing name ("Palay RC218, 300 kg") and puts the buyer on line two. */
  listingTitle?: string;
};

export type TransactionCardProps = {
  item: FarmerTransactionCardItem;
  onPress?: () => void;
};

/** Farmer order row (v2): stage icon tile, buyer + kg, ref and date, total, status pill. */
export function TransactionCard({ item, onPress }: TransactionCardProps) {
  const { t } = useLanguage();
  const needsAction = isFarmerNeedsActionStage(item.stage);
  const tone = FARMER_STAGE_PILL[item.stage].tone;

  const openTransactionDetail = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.push({ pathname: '/(farmer)/transaksyon/[id]', params: { id: item.id } });
  };

  const when = item.time ? `${item.date} (${item.time})` : item.date;
  const headline = item.listingTitle ? `${item.listingTitle}, ${item.weight}` : `${item.buyer}, ${item.weight}`;
  const subline = item.listingTitle ? `${item.buyer}  ·  ${when}` : when;

  return (
    <View style={styles.wrap}>
      <DepthCard
        depth="flat"
        radius="lg"
        onPress={openTransactionDetail}
        accessibilityLabel={`${headline}, ${item.price}, ${item.statusLabel}`}>
        <View style={styles.body}>
          <View style={styles.top}>
            <IconTile icon={FARMER_STAGE_PILL[item.stage].icon} tone={tone} />
            <View style={styles.flex}>
              <AnimoText variant="bodyStrong" numberOfLines={1}>
                {headline}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
                {subline}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary} numberOfLines={1}>
                {item.referenceId}
                {item.paymentMode ? `  ·  ${item.paymentMode}` : ''}
              </AnimoText>
            </View>
            <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand} style={styles.price}>
              {item.price}
            </AnimoText>
          </View>
          <FarmerStagePill stage={item.stage} label={item.statusLabel} />
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
  flex: { flex: 1, minWidth: 0 },
  body: { padding: AnimoV2Spacing.md, gap: AnimoV2Spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  price: { flexShrink: 0 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.cautionBg,
  },
});
