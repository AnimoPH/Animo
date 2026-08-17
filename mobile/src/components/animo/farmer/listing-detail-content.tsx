import { Image } from "expo-image";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Droplets,
  ImageIcon,
  Maximize2,
  MapPin,
  Scale,
  ShieldCheck,
  Sprout,
  X,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { SpecBox } from "@/components/animo/spec-box";
import { StatusBadge } from "@/components/animo/status-badge";
import { AnimoColors, AnimoRadius, AnimoSpacing } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import {
  STATUS_LABELS,
  moistureLabel,
  purityLabel,
  varietyLabel,
  type CropListing,
  type ListingPhoto,
  type PhotoType,
} from "@/types/crop-listing";

const STATUS_TONE: Record<CropListing["status"], "success" | "neutral" | "warning"> = {
  Draft: "neutral",
  Available: "success",
  Sold_Out: "neutral",
  Cancelled: "warning",
};

const PHOTO_TYPE_DETAILS: {
  type: PhotoType;
  title: string;
  shortLabel: string;
  subtitle: string;
}[] = [
  {
    type: "Overview",
    title: "Pangkalahatang Larawan",
    shortLabel: "Overview",
    subtitle: "Kabuuang ani at sako ng palay",
  },
  {
    type: "BeforeHarvest",
    title: "Bago Anihin (Taniman)",
    shortLabel: "Bago Anihin",
    subtitle: "Kalagayan ng palay sa bukid",
  },
  {
    type: "AfterHarvestUnsacked",
    title: "Pagkatapos Anihin (Butil)",
    shortLabel: "Butil ng Palay",
    subtitle: "Lapitang anyo ng mga butil",
  },
];

export type ListingDetailContentProps = {
  listing: CropListing;
  /** Whichever of the 3 photo_type slots have been uploaded, already signed. */
  photos: ListingPhoto[];
  /** Farmer barangay from session; omit the Lokasyon spec when empty. */
  location?: string | null;
};

type GalleryItem = (typeof PHOTO_TYPE_DETAILS)[number] & { url: string | null };

function PhotoFill({ url, contentFit }: { url: string | null; contentFit: "cover" | "contain" }) {
  if (url) {
    return <Image source={{ uri: url }} style={styles.photoFill} contentFit={contentFit} />;
  }
  return (
    <View style={styles.photoPlaceholder}>
      <ImageIcon size={32} color={AnimoColors.objectLowEmphasis} />
    </View>
  );
}

/** Detalye ng Listing tab: 3-slot gallery, summary with Patas na Presyo, SpecBox grid. */
export function ListingDetailContent({
  listing,
  photos,
  location,
}: ListingDetailContentProps) {
  const insets = useSafeAreaInsets();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

  const galleryItems: GalleryItem[] = useMemo(
    () =>
      PHOTO_TYPE_DETAILS.map((slot) => {
        const found = photos.find((p) => p.photoType === slot.type);
        return { ...slot, url: found?.url ?? null };
      }),
    [photos],
  );

  const activePhoto = galleryItems[selectedPhotoIndex] ?? galleryItems[0];
  const modalActivePhoto = galleryItems[modalPhotoIndex] ?? galleryItems[0];
  const locationText = location?.trim() ? location.trim() : null;

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
    <>
      <View style={styles.galleryContainer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => openModalAt(selectedPhotoIndex)}
          style={styles.heroPhotoArea}
        >
          <PhotoFill url={activePhoto.url} contentFit="cover" />
          <View style={styles.photoTagBadge}>
            <AnimoText variant="caption" color={AnimoColors.white} style={styles.photoTagText}>
              {activePhoto.title}
            </AnimoText>
          </View>
          <View style={styles.expandButton}>
            <Maximize2 size={16} color={AnimoColors.white} />
          </View>
          <View style={styles.counterBadge}>
            <AnimoText variant="tag" color={AnimoColors.white}>
              {selectedPhotoIndex + 1} / {galleryItems.length}
            </AnimoText>
          </View>
        </Pressable>

        <View style={styles.thumbnailRow}>
          {galleryItems.map((item, index) => {
            const isSelected = selectedPhotoIndex === index;
            return (
              <Pressable
                key={item.type}
                accessibilityRole="button"
                onPress={() => setSelectedPhotoIndex(index)}
                style={[styles.thumbnailCard, isSelected && styles.thumbnailCardActive]}
              >
                <View style={styles.thumbnailImgWrap}>
                  <PhotoFill url={item.url} contentFit="cover" />
                </View>
                <View
                  style={[
                    styles.thumbnailLabelWrap,
                    isSelected && styles.thumbnailLabelWrapActive,
                  ]}
                >
                  <AnimoText
                    variant="caption"
                    color={
                      isSelected
                        ? AnimoColors.accentPrimary
                        : AnimoColors.textMediumEmphasis
                    }
                    style={isSelected ? styles.thumbnailTextActive : undefined}
                  >
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

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <AnimoText variant="h2" color={AnimoColors.accentPrimary} style={styles.summaryTitle}>
            {varietyLabel(listing)}
          </AnimoText>
          <StatusBadge
            label={STATUS_LABELS[listing.status]}
            tone={STATUS_TONE[listing.status]}
            icon={<CheckCircle size={12} color={AnimoColors.accentPrimary} />}
          />
        </View>

        <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
          {listing.remainingQuantityKg} kg na available
        </AnimoText>

        <View style={styles.priceBlock}>
          <AnimoText
            variant="caption"
            color={AnimoColors.textHighEmphasisInverse}
            style={styles.priceLabel}
          >
            Patas na Presyo
          </AnimoText>
          <View style={styles.priceRow}>
            <AnimoText variant="display" color={AnimoColors.textHighEmphasisInverse}>
              {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : "—"}
            </AnimoText>
            <AnimoText
              variant="body"
              color={AnimoColors.textHighEmphasisInverse}
              style={styles.priceUnit}
            >
              {" "}
              bawat kilo
            </AnimoText>
          </View>
          <AnimoText
            variant="caption"
            color={AnimoColors.textHighEmphasisInverse}
            style={styles.priceTotal}
          >
            Kabuuan na halaga ({listing.remainingQuantityKg}kg):{" "}
            {listing.pricePerKg !== null
              ? formatPeso(listing.pricePerKg * listing.remainingQuantityKg)
              : "—"}
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
          {locationText ? (
            <SpecBox
              icon={<MapPin size={16} color={AnimoColors.accentPrimary} />}
              label="Lokasyon"
              value={locationText}
            />
          ) : null}
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalTopBar,
              { paddingTop: Math.max(insets.top, 24) + AnimoSpacing.md },
            ]}
          >
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
              style={styles.modalCloseBtn}
            >
              <X size={22} color={AnimoColors.white} />
            </Pressable>
          </View>

          <View style={styles.modalMainPhotoContainer}>
            <PhotoFill url={modalActivePhoto.url} contentFit="contain" />
            <Pressable
              hitSlop={12}
              onPress={handlePrevModalPhoto}
              style={[styles.navArrowBtn, styles.navArrowLeft]}
            >
              <ChevronLeft size={24} color={AnimoColors.white} />
            </Pressable>
            <Pressable
              hitSlop={12}
              onPress={handleNextModalPhoto}
              style={[styles.navArrowBtn, styles.navArrowRight]}
            >
              <ChevronRight size={24} color={AnimoColors.white} />
            </Pressable>
          </View>

          <SafeAreaView style={styles.modalBottomStrip} edges={["bottom"]}>
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
                    ]}
                  >
                    <PhotoFill url={item.url} contentFit="cover" />
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  galleryContainer: {
    gap: AnimoSpacing.sm,
  },
  heroPhotoArea: {
    width: "100%",
    height: 220,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  photoFill: {
    ...StyleSheet.absoluteFillObject,
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoColors.surfaceTertiary,
  },
  photoTagBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 4,
    borderRadius: AnimoRadius.pill,
  },
  photoTagText: {
    fontSize: 13.5,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  expandButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  counterBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
  },
  thumbnailCard: {
    flex: 1,
    height: 80,
    borderRadius: AnimoRadius.md,
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
    overflow: "hidden",
  },
  thumbnailCardActive: {
    borderColor: AnimoColors.accentPrimary,
  },
  thumbnailImgWrap: {
    flex: 1,
    width: "100%",
    position: "relative",
    backgroundColor: AnimoColors.surfaceTertiary,
  },
  thumbnailLabelWrap: {
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  thumbnailLabelWrapActive: {
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  thumbnailTextActive: {
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  galleryHint: {
    textAlign: "center",
    marginTop: 2,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: AnimoSpacing.sm,
  },
  summaryTitle: {
    flex: 1,
  },
  priceBlock: {
    backgroundColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
  },
  priceLabel: {
    opacity: 0.85,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: AnimoSpacing.sm,
  },
  priceUnit: {
    opacity: 0.85,
    marginBottom: AnimoSpacing.xs,
  },
  priceTotal: {
    opacity: 0.8,
    marginTop: AnimoSpacing.xs,
  },
  section: {
    gap: AnimoSpacing.md,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AnimoSpacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "space-between",
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalMainPhotoContainer: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: AnimoSpacing.sm,
  },
  navArrowBtn: {
    position: "absolute",
    top: "50%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  navArrowLeft: {
    left: 12,
  },
  navArrowRight: {
    right: 12,
  },
  modalBottomStrip: {
    paddingVertical: AnimoSpacing.md,
    alignItems: "center",
  },
  modalThumbRow: {
    flexDirection: "row",
    gap: AnimoSpacing.md,
  },
  modalThumbBox: {
    width: 60,
    height: 60,
    borderRadius: AnimoRadius.sm,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  modalThumbBoxActive: {
    borderColor: AnimoColors.accentPrimary,
  },
});
