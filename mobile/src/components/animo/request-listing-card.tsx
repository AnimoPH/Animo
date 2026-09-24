import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ListingImage } from '@/components/animo/listing-image';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { varietyLabel, type CropListing } from '@/types/crop-listing';

export type RequestListingCardProps = {
  listing: CropListing;
  quantityKg: number;
  totalAmount: number;
  /** Dim the card — used on rejected/cancelled requests. */
  muted?: boolean;
};

/** Listing thumbnail, price and quantity for a purchase request or transaction. */
export function RequestListingCard({
  listing,
  quantityKg,
  totalAmount,
  muted = false,
}: RequestListingCardProps) {
  const { isTagalog, language } = useLanguage();
  const bodyColor = muted ? AnimoColors.muted : AnimoColors.blackSecondary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ListingImage height={56} borderRadius={AnimoRadius.md} style={styles.thumb} />
        <View style={styles.headerText}>
          <AnimoText
            variant="h3"
            color={muted ? AnimoColors.blackSecondary : AnimoColors.black}>
            {varietyLabel(listing, language)}
          </AnimoText>
          <AnimoText
            variant="bodyEmphasis"
            color={muted ? AnimoColors.blackSecondary : AnimoColors.green}>
            {formatPeso(listing.pricePerKg ?? 0)}{' '}
            <AnimoText variant="caption" color={AnimoColors.muted}>
              {isTagalog ? 'bawat kilo' : 'per kg'}
            </AnimoText>
          </AnimoText>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <AnimoText variant="body" color={bodyColor}>
          {isTagalog ? 'Dami' : 'Quantity'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {quantityKg} kg
        </AnimoText>
      </View>

      <View style={styles.row}>
        <AnimoText variant="body" color={bodyColor}>
          {isTagalog ? 'Kabuuang halaga' : 'Total amount'}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {formatPeso(totalAmount)}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  thumb: {
    width: 56,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
