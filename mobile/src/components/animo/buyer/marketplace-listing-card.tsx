import { Image } from 'expo-image';
import { ImageIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, type StatusTone } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import {
  getStatusLabel,
  listingTitle,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
  type ListingStatus,
} from '@/types/crop-listing';

const STATUS_TONES: Record<ListingStatus, StatusTone> = {
  Draft: 'neutral',
  Available: 'success',
  Sold_Out: 'neutral',
  Cancelled: 'danger',
  Archived: 'neutral',
};

export type MarketplaceListingCardProps = {
  listing: CropListing;
  coverPhotoUrl?: string;
  onPress: () => void;
  /** Alone on its row: full width with a wider (2:1) photo instead of a large square. */
  wide?: boolean;
  /** Adds a small bottom margin so stacked cards in a plain list keep a gap. Default true. */
  spaced?: boolean;
};

/**
 * Buyer marketplace card for a real `croplisting` row: photo with grade pill and moisture tag,
 * name, specific variety, price and kg available. Height follows its content (stacked layout).
 */
export function MarketplaceListingCard({
  listing,
  coverPhotoUrl,
  onPress,
  wide = false,
  spaced = true,
}: MarketplaceListingCardProps) {
  const { t, language, isTagalog } = useLanguage();
  const name = listingTitle(listing);
  const specificVariety = specificVarietyDisplay(listing, language);
  const displayVariety = specificVariety || varietyLabel(listing, language);
  const available = listing.status === 'Available';
  const gradeTone: StatusTone = listing.declaredPurityGrade === 'A' ? 'success' : 'neutral';

  return (
    <DepthCard
      onPress={onPress}
      accessibilityLabel={t('buyPalV2.openListing', { name })}
      radius="lg"
      wrapperStyle={[styles.wrapper, spaced && styles.spaced]}
      style={styles.card}>
      <View style={[styles.photoArea, wide && styles.photoAreaWide]}>
        {coverPhotoUrl ? (
          <Image source={{ uri: coverPhotoUrl }} style={styles.photoImage} contentFit="cover" />
        ) : (
          <ImageIcon size={36} color={AnimoV2Colors.textTertiary} />
        )}

        <View style={styles.pillStack} pointerEvents="none">
          <StatusPill tone={gradeTone} label={purityLabel(listing.declaredPurityGrade, language)} />
          {!available ? (
            <StatusPill tone={STATUS_TONES[listing.status]} label={getStatusLabel(listing.status, language)} />
          ) : null}
        </View>

        <View style={styles.moistureTag} pointerEvents="none">
          <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
            {listing.declaredMoisture === 'Dry' ? (isTagalog ? 'Tuyo' : 'Dry') : isTagalog ? 'Basa' : 'Wet'}
          </AnimoText>
        </View>
      </View>

      <View style={styles.body}>
        <AnimoText variant="bodyStrong" numberOfLines={2}>
          {name}
        </AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
          {displayVariety}
        </AnimoText>
        <View style={styles.priceRow}>
          <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand} numberOfLines={1}>
            {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : '—'}
          </AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t('common.perKg')}
          </AnimoText>
        </View>
        <AnimoText variant="bodyStrong" numberOfLines={1}>
          {listing.remainingQuantityKg.toLocaleString('en-PH')} {t('common.kg')}
        </AnimoText>
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  spaced: { marginBottom: AnimoV2Spacing.sm },
  card: { padding: 0 },
  photoArea: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoAreaWide: { aspectRatio: 2 },
  photoImage: { ...StyleSheet.absoluteFillObject },
  pillStack: {
    position: 'absolute',
    top: AnimoV2Spacing.sm,
    left: AnimoV2Spacing.sm,
    gap: AnimoV2Spacing.xs,
    alignItems: 'flex-start',
  },
  moistureTag: {
    position: 'absolute',
    bottom: AnimoV2Spacing.sm,
    left: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.brandDark,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingVertical: 3,
    borderRadius: AnimoV2Radius.sm,
  },
  body: { padding: AnimoV2Spacing.md, gap: AnimoV2Spacing.xs },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: AnimoV2Spacing.xs },
});
