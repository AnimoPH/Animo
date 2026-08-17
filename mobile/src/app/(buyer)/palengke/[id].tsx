import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Droplets, ImageIcon, Scale, ShieldCheck, Sprout } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { ScreenHeader } from '@/components/animo/screen-header';
import { SpecBox } from '@/components/animo/spec-box';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchListingPhotos } from '@/services/crop-listing-service';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import {
  moistureLabel,
  purityLabel,
  varietyLabel,
  type CropListing,
  type ListingPhoto,
} from '@/types/crop-listing';

/**
 * Detalye ng Listing — one real `croplisting` row for a buyer.
 *
 * There is no location section: `farmer.barangay` / `farm.location` are behind
 * owner-only RLS, so a buyer has no readable source for it.
 */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<CropListing | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);
    fetchMarketplaceListing(id)
      .then(async (result) => {
        if (cancelled) return;
        setListing(result);
        if (!result) return;
        // Photos are a display nicety — a failure here shouldn't blank out an
        // otherwise-successful listing fetch.
        try {
          const listingPhotos = await fetchListingPhotos(result.id);
          if (!cancelled) setPhotos(listingPhotos);
        } catch {
          // Falls back to the placeholder icon.
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Hindi ma-load ang listing.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="Detalye ng Listing" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !listing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="Detalye ng Listing" />
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.centerText}>
            {errorMessage ?? 'Hindi nahanap ang listing na ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const coverPhoto = photos[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalye ng Listing" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoArea}>
          {coverPhoto ? (
            <Image source={{ uri: coverPhoto.url }} style={styles.photoImage} contentFit="cover" />
          ) : (
            <ImageIcon size={40} color={AnimoColors.objectLowEmphasis} />
          )}
        </View>

        {/* Summary card */}
        <View style={styles.card}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
            {varietyLabel(listing)}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {listing.remainingQuantityKg} kg na available
          </AnimoText>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <AnimoText variant="price" color={AnimoColors.accentPrimary}>
                {formatPeso(listing.pricePerKg ?? 0)}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                {' '}
                bawat kilo
              </AnimoText>
            </View>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
              Nakatakda ang presyo ng sistema — hindi na ito maaaring tawaran.
            </AnimoText>
          </View>

          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            Pinakamaliit na order: {listing.minimumRequestKg} kg
          </AnimoText>
        </View>

        <View style={styles.section}>
          <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
            Impormasyon ng Palay
          </AnimoText>
          <View style={styles.specGrid}>
            <SpecBox
              icon={<Sprout size={14} color={AnimoColors.textMediumEmphasis} />}
              label="Uri ng palay"
              value={varietyLabel(listing)}
            />
            <SpecBox
              icon={<Scale size={14} color={AnimoColors.textMediumEmphasis} />}
              label="Aktwal na timbang"
              value={`${listing.netWeightKg} kg`}
            />
            <SpecBox
              icon={<Droplets size={14} color={AnimoColors.textMediumEmphasis} />}
              label="Moisture"
              value={moistureLabel(listing.declaredMoisture)}
            />
            <SpecBox
              icon={<ShieldCheck size={14} color={AnimoColors.textMediumEmphasis} />}
              label="Kalidad"
              value={purityLabel(listing.declaredPurityGrade)}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AnimoButton
          label="Bumili"
          onPress={() =>
            router.push({ pathname: '/(buyer)/palengke/bid', params: { id: listing.id } })
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  centerText: {
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  photoArea: {
    width: '100%',
    height: 200,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  section: {
    gap: AnimoSpacing.md,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
  },
});
