import { AlertCircle } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing, AnimoType } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';

export type ListingTransactionSummaryCardProps = {
  title: string;
  varietyLine: string;
  remainingKg: number;
  soldKg: number;
  earnings: number;
  needsAction: boolean;
  onPress: () => void;
};

/** Per-listing Transaksyon rollup: remaining / sold / Buong Kita + pending-PR cue. */
export function ListingTransactionSummaryCard({
  title,
  varietyLine,
  remainingKg,
  soldKg,
  earnings,
  needsAction,
  onPress,
}: ListingTransactionSummaryCardProps) {
  const { isTagalog } = useLanguage();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}>
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.textHighEmphasis}
            style={styles.title}
            numberOfLines={2}>
            {title}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.leftKg}>
            {isTagalog ? 'Natitira:' : 'Remaining:'} {remainingKg} kg
          </AnimoText>
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.variety}>
          {varietyLine}
        </AnimoText>

        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.soldLine}>
          {isTagalog ? 'Nabenta:' : 'Sold:'} {soldKg} kg
        </AnimoText>

        <View style={styles.divider} />

        <View style={styles.earningsRow}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
            {isTagalog ? 'Buong Kita:' : 'Total Earnings:'}
          </AnimoText>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
            {formatPeso(earnings)}
          </AnimoText>
        </View>
      </View>

      {needsAction ? (
        <View style={styles.actionBanner}>
          <AlertCircle size={14} color={AnimoColors.moderate} />
          <AnimoText variant="caption" color={AnimoColors.moderate} style={styles.actionText}>
            {isTagalog ? 'Kailangan ng aksyon' : 'Action required'}
          </AnimoText>
        </View>
      ) : null}
    </TouchableOpacity>
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
  },
  cardBody: {
    padding: AnimoSpacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  title: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  leftKg: {
    marginTop: 2,
    flexShrink: 0,
  },
  variety: {
    marginTop: AnimoSpacing.xs,
  },
  soldLine: {
    marginTop: AnimoSpacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    marginVertical: AnimoSpacing.md,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
