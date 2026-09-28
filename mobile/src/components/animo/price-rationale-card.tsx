import { Droplets, Lock, Minus, Plus, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import {
  priceRationaleRows,
  type PriceRationaleIcon,
} from '@/components/animo/price-rationale';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { CropListing } from '@/types/crop-listing';

type PriceFacts = Pick<
  CropListing,
  'pricePerKg' | 'declaredMoisture' | 'varietyCode' | 'declaredPurityGrade'
>;

const ICONS: Record<PriceRationaleIcon, LucideIcon> = {
  lock: Lock,
  moisture: Droplets,
  premium: Plus,
  noPremium: Minus,
};

/** Plain-language reason for a listing's locked price. Hidden when no price was locked. */
export function PriceRationaleCard({ listing }: { listing: PriceFacts }) {
  const { t } = useLanguage();
  const rows = priceRationaleRows(listing);
  if (!rows) return null;

  return (
    <View>
      {rows.map((row, index) => {
        const Icon = ICONS[row.icon];
        return (
          <View
            key={row.id}
            style={[styles.row, index < rows.length - 1 && styles.rowDivider]}
          >
            <Icon size={16} color={AnimoColors.accentPrimary} style={styles.icon} />
            <View style={styles.copy}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                {t(row.label)}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                {t(row.detail)}
              </AnimoText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
  },
  icon: {
    marginTop: AnimoSpacing.xs,
  },
  copy: {
    flex: 1,
    gap: AnimoSpacing.xs,
  },
});
