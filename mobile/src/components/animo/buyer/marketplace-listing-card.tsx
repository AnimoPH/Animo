import { Image } from 'expo-image';
import { ImageIcon } from 'lucide-react-native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { StatusBadge, type BadgeTone } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import {
  listingTitle,
  specificVarietyDisplay,
  STATUS_LABELS,
  type CropListing,
  type ListingStatus,
} from '@/types/crop-listing';

const STATUS_TONES: Record<ListingStatus, BadgeTone> = {
  Draft: 'neutral',
  Available: 'success',
  Sold_Out: 'neutral',
  Cancelled: 'danger',
  Archived: 'neutral',
};

const TITLE_LINE_HEIGHT = 20;
const TITLE_MAX_LINES = 2;

export type MarketplaceListingCardProps = {
  listing: CropListing;
  coverPhotoUrl?: string;
  onPress: () => void;
};

/**
 * Buyer marketplace card for a real `croplisting` row — 2-column compact layout.
 */
export function MarketplaceListingCard({
  listing,
  coverPhotoUrl,
  onPress,
}: MarketplaceListingCardProps) {
  const { t } = useLanguage();
  const specificVariety = specificVarietyDisplay(listing);

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
          <ImageIcon size={24} color={AnimoColors.objectLowEmphasis} />
        )}
        <View style={styles.statusBadgeWrap}>
          <StatusBadge label={STATUS_LABELS[listing.status]} tone={STATUS_TONES[listing.status]} />
        </View>
      </View>

      <View style={styles.body}>
        <AnimoText
          variant="h3"
          color={AnimoColors.textHighEmphasis}
          numberOfLines={TITLE_MAX_LINES}
          ellipsizeMode="tail"
          style={styles.cardTitle}>
          {listingTitle(listing)}
        </AnimoText>

        <View style={styles.priceRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary} style={styles.priceText}>
            {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : '—'}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {' '}
            {t('common.perKg')}
          </AnimoText>
        </View>

        <View style={styles.footerRow}>
          {specificVariety ? (
            <AnimoText
              variant="caption"
              color={AnimoColors.textMediumEmphasis}
              numberOfLines={1}
              style={styles.variety}>
              {specificVariety}
            </AnimoText>
          ) : (
            <View style={styles.variety} />
          )}
          <AnimoText
            variant="caption"
            color={AnimoColors.textMediumEmphasis}
            numberOfLines={1}
            style={styles.quantity}>
            {listing.remainingQuantityKg} {t('common.kg')}
          </AnimoText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
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
    aspectRatio: 1.35,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadgeWrap: {
    position: 'absolute',
    top: AnimoSpacing.xs,
    right: AnimoSpacing.xs,
  },
  body: {
    padding: AnimoSpacing.sm,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: TITLE_LINE_HEIGHT,
    fontFamily: 'PlusJakartaSans_700Bold',
    minHeight: TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 18,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.xs,
  },
  variety: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
  },
  quantity: {
    flexShrink: 0,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
});
