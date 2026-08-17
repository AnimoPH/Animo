import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  MapPin,
  Maximize2,
  Scale,
  ShieldCheck,
  Sprout,
  Star,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
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
  type PhotoType,
} from '@/types/crop-listing';

const DEFAULT_PALAY_PHOTOS: Record<PhotoType, string> = {
  Overview:
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&auto=format&fit=crop&q=80',
  BeforeHarvest:
    'https://images.unsplash.com/photo-1536657464919-892534f60d6e?w=1200&auto=format&fit=crop&q=80',
  AfterHarvestUnsacked:
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&auto=format&fit=crop&q=80',
};

const PHOTO_TYPE_DETAILS: {
  type: PhotoType;
  title: string;
  shortLabel: string;
  subtitle: string;
}[] = [
  {
    type: 'Overview',
    title: 'Pangkalahatang Larawan',
    shortLabel: 'Overview',
    subtitle: 'Kabuuang ani at sako ng palay',
  },
  {
    type: 'BeforeHarvest',
    title: 'Bago Anihin (Taniman)',
    shortLabel: 'Bago Anihin',
    subtitle: 'Kalagayan ng palay sa bukid',
  },
  {
    type: 'AfterHarvestUnsacked',
    title: 'Pagkatapos Anihin (Butil)',
    shortLabel: 'Butil ng Palay',
    subtitle: 'Lapitang anyo ng mga butil',
  },
];

/**
 * Detalye ng Listing — one real `croplisting` row for a buyer.
 *
 * Displays full rice specifications, 3-image expandable gallery, prominent location,
 * green icons, and the farmer's public transaction track record with large reviews.
 */
export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [farmerProfile, setFarmerProfile] = useState<FarmerPublicProfile | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // 3-Image Gallery State
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

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

  // Construct 3 distinct images (with real photos or high-res fallbacks)
  const galleryItems = useMemo(() => {
    return PHOTO_TYPE_DETAILS.map((slot) => {
      const found = photos.find((p) => p.photoType === slot.type);
      return {
        ...slot,
        url: found?.url || DEFAULT_PALAY_PHOTOS[slot.type],
      };
    });
  }, [photos]);

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

  const activePhoto = galleryItems[selectedPhotoIndex] || galleryItems[0];
  const modalActivePhoto = galleryItems[modalPhotoIndex] || galleryItems[0];
  const locationText = farmerProfile?.location || 'San Isidro, Nueva Ecija';

  const openModalAt = (index: number) => {
    setModalPhotoIndex(index);
    setModalVisible(true);
  };

  const handlePrevModalPhoto = () => {
    setModalPhotoIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
  };

  const handleNextModalPhoto = () => {
    setModalPhotoIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalye ng Listing" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 3-Image Gallery Section */}
        <View style={styles.galleryContainer}>
          {/* Main Active Image with Expand Trigger */}
          <Pressable
            accessibilityRole="button"
            onPress={() => openModalAt(selectedPhotoIndex)}
            style={styles.heroPhotoArea}>
            <Image
              source={{ uri: activePhoto.url }}
              style={styles.heroPhotoImage}
              contentFit="cover"
            />

            {/* Top Left Title Badge */}
            <View style={styles.photoTagBadge}>
              <AnimoText variant="caption" color={AnimoColors.white} style={styles.photoTagText}>
                {activePhoto.title}
              </AnimoText>
            </View>

            {/* Top Right Expand Button */}
            <View style={styles.expandButton}>
              <Maximize2 size={16} color={AnimoColors.white} />
            </View>

            {/* Bottom Right Counter */}
            <View style={styles.counterBadge}>
              <AnimoText variant="tag" color={AnimoColors.white}>
                {selectedPhotoIndex + 1} / {galleryItems.length}
              </AnimoText>
            </View>
          </Pressable>

          {/* 3-Thumbnail Row */}
          <View style={styles.thumbnailRow}>
            {galleryItems.map((item, index) => {
              const isSelected = selectedPhotoIndex === index;
              return (
                <Pressable
                  key={item.type}
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={[
                    styles.thumbnailCard,
                    isSelected && styles.thumbnailCardActive,
                  ]}>
                  <Image source={{ uri: item.url }} style={styles.thumbnailImg} contentFit="cover" />
                  <View style={[styles.thumbnailLabelWrap, isSelected && styles.thumbnailLabelWrapActive]}>
                    <AnimoText
                      variant="caption"
                      color={isSelected ? AnimoColors.accentPrimary : AnimoColors.textMediumEmphasis}
                      style={isSelected && styles.thumbnailTextActive}>
                      {item.shortLabel}
                    </AnimoText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.galleryHint}>
            Pindutin ang larawan para palakihin at tingnan nang buo ang 3 anggulo ng palay.
          </AnimoText>
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

        {/* Impormasyon ng Palay (with Green Icons) */}
        <View style={styles.section}>
          <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
            Impormasyon ng Palay
          </AnimoText>
          <View style={styles.specGrid}>
            <SpecBox
              icon={<Sprout size={16} color={AnimoColors.accentPrimary} />}
              label="Uri ng palay"
              value={varietyLabel(listing)}
            />
            <SpecBox
              icon={<Scale size={16} color={AnimoColors.accentPrimary} />}
              label="Aktwal na timbang"
              value={`${listing.netWeightKg} kg`}
            />
            <SpecBox
              icon={<Droplets size={16} color={AnimoColors.accentPrimary} />}
              label="Moisture"
              value={moistureLabel(listing.declaredMoisture)}
            />
            <SpecBox
              icon={<ShieldCheck size={16} color={AnimoColors.accentPrimary} />}
              label="Kalidad"
              value={purityLabel(listing.declaredPurityGrade)}
            />
            <SpecBox
              icon={<MapPin size={16} color={AnimoColors.accentPrimary} />}
              label="Lokasyon"
              value={locationText}
            />
          </View>
        </View>

        {/* Farmer Profile Summary Card (Clickable to view full details) */}
        {farmerProfile ? (
          <View style={styles.section}>
            <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
              Profile ng Magsasaka
            </AnimoText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tingnan ang buong profile ng magsasaka"
              onPress={() =>
                router.push({
                  pathname: '/(buyer)/palengke/magsasaka/[id]',
                  params: { id: listing.id },
                })
              }
              style={styles.farmerCard}>
              <View style={styles.farmerCardLeft}>
                <View style={styles.farmerAvatar}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
                    {farmerProfile.name[0] || 'M'}
                  </AnimoText>
                </View>

                <View style={styles.farmerDetails}>
                  <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} numberOfLines={1}>
                    {farmerProfile.name}
                  </AnimoText>

                  <View style={styles.farmerLocationRow}>
                    <MapPin size={13} color={AnimoColors.accentPrimary} />
                    <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                      {farmerProfile.location}
                    </AnimoText>
                  </View>

                  <View style={styles.farmerRatingRow}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <AnimoText variant="caption" color={AnimoColors.textHighEmphasis} style={styles.farmerRatingText}>
                      {farmerProfile.averageRating}
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                      ({farmerProfile.totalReviews} review)
                    </AnimoText>
                  </View>
                </View>
              </View>

              <View style={styles.viewProfilePill}>
                <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.viewProfilePillText}>
                  Tingnan ang Profile
                </AnimoText>
                <ChevronRight size={16} color={AnimoColors.accentPrimary} />
              </View>
            </Pressable>
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

      {/* Full-Screen 3-Image Expand Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          {/* Top Modal Navigation Bar with Safe Margin from Notifications */}
          <View
            style={[
              styles.modalTopBar,
              { paddingTop: Math.max(insets.top, 24) + AnimoSpacing.md },
            ]}>
            <View style={styles.modalTitleWrap}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
                {modalActivePhoto.title}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {modalPhotoIndex + 1} ng {galleryItems.length} · {modalActivePhoto.subtitle}
              </AnimoText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Isara ang larawan"
              hitSlop={16}
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseBtn}>
              <X size={22} color={AnimoColors.white} />
            </Pressable>
          </View>

          {/* Main Full-Screen Photo Display with Prev/Next Controls */}
          <View style={styles.modalMainPhotoContainer}>
            <Image
              source={{ uri: modalActivePhoto.url }}
              style={styles.modalMainImage}
              contentFit="contain"
            />

            {/* Left Nav Arrow */}
            <Pressable
              hitSlop={12}
              onPress={handlePrevModalPhoto}
              style={[styles.navArrowBtn, styles.navArrowLeft]}>
              <ChevronLeft size={24} color={AnimoColors.white} />
            </Pressable>

            {/* Right Nav Arrow */}
            <Pressable
              hitSlop={12}
              onPress={handleNextModalPhoto}
              style={[styles.navArrowBtn, styles.navArrowRight]}>
              <ChevronRight size={24} color={AnimoColors.white} />
            </Pressable>
          </View>

          {/* Bottom Thumbnail Strip in Modal */}
          <SafeAreaView style={styles.modalBottomStrip} edges={['bottom']}>
            <View style={styles.modalThumbRow}>
              {galleryItems.map((item, index) => {
                const isModalSelected = modalPhotoIndex === index;
                return (
                  <Pressable
                    key={item.type}
                    onPress={() => setModalPhotoIndex(index)}
                    style={[
                      styles.modalThumbBox,
                      isModalSelected && styles.modalThumbBoxActive,
                    ]}>
                    <Image source={{ uri: item.url }} style={styles.modalThumbImg} contentFit="cover" />
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  galleryContainer: {
    gap: AnimoSpacing.sm,
  },
  heroPhotoArea: {
    width: '100%',
    height: 220,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  heroPhotoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoTagBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 4,
    borderRadius: AnimoRadius.pill,
  },
  photoTagText: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  expandButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
  },
  thumbnailRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.sm,
  },
  thumbnailCard: {
    flex: 1,
    height: 80,
    borderRadius: AnimoRadius.md,
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
    overflow: 'hidden',
  },
  thumbnailCardActive: {
    borderColor: AnimoColors.accentPrimary,
  },
  thumbnailImg: {
    flex: 1,
    width: '100%',
  },
  thumbnailLabelWrap: {
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  thumbnailLabelWrapActive: {
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  thumbnailTextActive: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  galleryHint: {
    textAlign: 'center',
    marginTop: 2,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
    justifyContent: 'space-between',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  modalTitleWrap: {
    flex: 1,
    gap: 2,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMainPhotoContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.sm,
  },
  modalMainImage: {
    width: '100%',
    height: '100%',
  },
  navArrowBtn: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  modalBottomStrip: {
    paddingVertical: AnimoSpacing.md,
    alignItems: 'center',
  },
  modalThumbRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  modalThumbBox: {
    width: 60,
    height: 60,
    borderRadius: AnimoRadius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  modalThumbBoxActive: {
    borderColor: AnimoColors.accentPrimary,
  },
  modalThumbImg: {
    width: '100%',
    height: '100%',
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  farmerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    flex: 1,
  },
  farmerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AnimoColors.accentPrimary,
  },
  farmerDetails: {
    flex: 1,
    gap: 3,
  },
  farmerLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  farmerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  farmerRatingText: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  viewProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
  },
  viewProfilePillText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});

