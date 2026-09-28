import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { priceRationaleKeys } from '@/components/animo/price-rationale';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { CropListing } from '@/types/crop-listing';

type PriceFacts = Pick<
  CropListing,
  'pricePerKg' | 'declaredMoisture' | 'varietyCode' | 'declaredPurityGrade'
>;

/** Plain-language reason for a listing's locked price. Hidden when no price was locked. */
export function PriceRationaleCard({ listing }: { listing: PriceFacts }) {
  const { t } = useLanguage();
  const keys = priceRationaleKeys(listing);
  if (!keys) return null;

  return (
    <View style={styles.card}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
        {t('listing.priceWhyTitle')}
      </AnimoText>
      {keys.map((key) => (
        <AnimoText key={key} variant="caption" color={AnimoColors.textMediumEmphasis}>
          {t(key)}
        </AnimoText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: AnimoSpacing.xs,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.appBackground,
  },
});
