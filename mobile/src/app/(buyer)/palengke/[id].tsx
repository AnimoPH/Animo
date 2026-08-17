import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Droplets,
  ImageIcon,
  MapPin,
  Scale,
  ShieldCheck,
  Sprout,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FarmerPublicStatsCard } from '@/components/animo/buyer/farmer-public-stats-card';
import { ScreenHeader } from '@/components/animo/screen-header';
import { SpecBox } from '@/components/animo/spec-box';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchListingPhotos } from '@/services/crop-listing-service';
import {
  fetchFarmerPublicProfile,
  type FarmerPublicProfile,
} from '@/services/farmer-public-profile';
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
 * Displays full rice specifications, prominent location, and the farmer's
 * public transaction track record (without exposing private personal info).
 */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<CropListing | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerPublicProfile | null>(null);
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

        // Fetch photos and farmer public stats in parallel
        try {
          const [listingPhotos, profile] = await Promise.all([
            fetchListingPhotos(result.id).catch(() => []),
            fetchFarmerPublicProfile(result.id, result).catch(() => null),
          ]);
          if (!cancelled) {
            setPhotos(listingPhotos);
            setFarmerProfile(profile);
          }
        } catch {
          // Display falls back gracefully
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
  const locationText = farmerProfile?.location || 'San Isidro, Nueva Ecija';

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
          <View style={styles.titleRow}>
            <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
              {varietyLabel(listing)}
            </AnimoText>
          </View>

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

        {/* Impormasyon ng Palay */}
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
            <SpecBox
              icon={<MapPin size={14} color={AnimoColors.textMediumEmphasis} />}
              label="Lokasyon"
              value={locationText}
            />
          </View>
        </View>

        {/* Farmer Profile & Transaction Records */}
        {farmerProfile ? (
          <View style={styles.section}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              Profile at Talaan ng Magsasaka
            </AnimoText>
            <FarmerPublicStatsCard profile={farmerProfile} />
          </View>
        ) : null}
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
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AnimoColors.surfaceSecondary,
    alignSelf: 'flex-start',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 6,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: 4,
    backgroundColor: AnimoColors.surfaceSecondary,
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

