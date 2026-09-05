import { Image } from 'expo-image';
import { Droplets, ImageIcon, Scale } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { moistureLabel, varietyLabel, type CropListing } from '@/types/crop-listing';

export type MarketplaceListingCardProps = {
  listing: CropListing;
  coverPhotoUrl?: string;
  onPress: () => void;
};

/**
 * Buyer marketplace card for a real `croplisting` row.
 */
export function MarketplaceListingCard({
  listing,
  coverPhotoUrl,
  onPress,
}: MarketplaceListingCardProps) {
  const { t, isEnglish } = useLanguage();

  const getLocalizedMoisture = () => {
    if (isEnglish) {
      return listing.declaredMoisture === 'Wet' ? 'Wet' : 'Dry';
    }
    return moistureLabel(listing.declaredMoisture);
  };

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
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} numberOfLines={2}>
          {varietyLabel(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary} style={styles.priceText}>
            {formatPeso(listing.pricePerKg ?? 0)}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {' '}
            {t('common.perKg')}
          </AnimoText>
        </View>

        <View style={styles.specs}>
          <Spec icon={<Scale size={14} color={AnimoColors.accentPrimary} />}>
            {listing.remainingQuantityKg} {t('common.kg')} {t('buyer.available')}
          </Spec>
          <Spec icon={<Droplets size={14} color={AnimoColors.textMediumEmphasis} />}>
            {getLocalizedMoisture()}
          </Spec>
        </View>

        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {t('buyer.minOrder')} {listing.minimumRequestKg} {t('common.kg')}
        </AnimoText>
      </View>
    </TouchableOpacity>
  );
}

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={styles.spec}>
      {icon}
      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
        {children}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
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
    marginTop: 2,
  },
  priceText: {
    fontSize: 22,
    lineHeight: 26,
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
    marginVertical: 4,
  },
  spec: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AnimoRadius.sm,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
});
