import { Image } from 'expo-image';
import { Droplets, ImageIcon, Scale } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { moistureLabel, varietyLabel, type CropListing } from '@/types/crop-listing';

export type MarketplaceListingCardProps = {
  listing: CropListing;
  coverPhotoUrl?: string;
  onPress: () => void;
};

/**
 * Buyer marketplace card for a real `croplisting` row.
 *
 * Separate from `components/animo/listing-card.tsx`, which is still typed to
 * the frontend mock `Listing` and is used by the buyer dashboard.
 *
 * No location line: `farmer.barangay` and `farm.location` are both behind
 * owner-only RLS and `croplisting` has no location column, so there is nothing
 * a buyer can legitimately read (see migration 0001 §1a/§4).
 */
export function MarketplaceListingCard({
  listing,
  coverPhotoUrl,
  onPress,
}: MarketplaceListingCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, styles.shadow]}>
      <View style={styles.photoArea}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
        )}
      </View>

      <View style={styles.body}>
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
          {varietyLabel(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {formatPeso(listing.pricePerKg ?? 0)}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {' '}
            bawat kilo
          </AnimoText>
        </View>

        <View style={styles.specs}>
          <Spec icon={<Scale size={14} color={AnimoColors.accentPrimary} />}>
            {listing.remainingQuantityKg} kg available
          </Spec>
          <Spec icon={<Droplets size={14} color={AnimoColors.textMediumEmphasis} />}>
            {moistureLabel(listing.declaredMoisture)}
          </Spec>
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          Pinakamaliit na order: {listing.minimumRequestKg} kg
        </AnimoText>
      </View>
    </TouchableOpacity>
  );
}

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.spec}>
      {icon}
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
        {children}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginBottom: AnimoSpacing.md,
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  photoArea: {
    width: '100%',
    aspectRatio: 2.5,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.lg,
    marginTop: AnimoSpacing.xs,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
