import { Image } from "expo-image";
import { router } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  Droplets,
  ImageIcon,
  Lock,
  Maximize2,
  Minus,
  Scale,
  ShieldCheck,
  Sprout,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { PalayReviewsCard } from "@/components/animo/palay-reviews";
import {
  priceRationaleRows,
  type PriceRationaleIcon,
} from "@/components/animo/price-rationale";
import { DepthCard } from "@/components/animo/ui/depth-card";
import { FilterChip } from "@/components/animo/ui/filter-chip";
import { IconTile } from "@/components/animo/ui/icon-tile";
import { StatusPill } from "@/components/animo/ui/status-pill";
import {
  AnimoV2Colors,
  AnimoV2Radius,
  AnimoV2Spacing,
  type StatusTone,
} from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { useLanguage } from "@/hooks/use-language";
import type { TranslationKey } from "@/i18n/translations";
import {
  getStatusLabel,
  listingTitle,
  moistureLabel,
  purityLabel,
  specificVarietyDisplay,
  varietyLabel,
  type CropListing,
  type ListingPhoto,
  type PhotoType,
} from "@/types/crop-listing";

const HERO_HEIGHT = 200;
const MODAL_THUMB = 60;

const STATUS_TONE: Record<CropListing["status"], StatusTone> = {
  Draft: "neutral",
  Available: "success",
  Sold_Out: "neutral",
  Cancelled: "warning",
  Archived: "neutral",
};

const RATIONALE_ICON: Record<PriceRationaleIcon, { icon: LucideIcon; tone: StatusTone }> = {
  lock: { icon: Lock, tone: "success" },
  moisture: { icon: Droplets, tone: "warning" },
  premium: { icon: TrendingUp, tone: "caution" },
  noPremium: { icon: Minus, tone: "neutral" },
};

type GalleryItem = {
  type: PhotoType;
  title: string;
  shortLabel: string;
  subtitle: string;
  url: string | null;
};

const PHOTO_SLOTS: {
  type: PhotoType;
  title: TranslationKey;
  short: TranslationKey;
  sub: TranslationKey;
}[] = [
  { type: "Overview", title: "detailV2.photoOverviewTitle", short: "detailV2.photoOverviewShort", sub: "detailV2.photoOverviewSub" },
  { type: "BeforeHarvest", title: "detailV2.photoBeforeTitle", short: "detailV2.photoBeforeShort", sub: "detailV2.photoBeforeSub" },
  { type: "AfterHarvestUnsacked", title: "detailV2.photoGrainTitle", short: "detailV2.photoGrainShort", sub: "detailV2.photoGrainSub" },
];

function PhotoFill({ url, contentFit }: { url: string | null; contentFit: "cover" | "contain" }) {
  if (url) {
    return <Image source={{ uri: url }} style={styles.photoFill} contentFit={contentFit} />;
  }
  return (
    <View style={styles.photoPlaceholder}>
      <ImageIcon size={32} color={AnimoV2Colors.textTertiary} strokeWidth={2.25} />
    </View>
  );
}

export type ListingDetailContentProps = {
  listing: CropListing;
  /** Whichever of the 3 photo_type slots have been uploaded, already signed. */
  photos: ListingPhoto[];
};

/**
 * Top of the listing detail: 3-slot gallery (200 high hero + chips), name,
 * sold kg and the availability pill. Shown above the Detalye / Mga Kahilingan tabs.
 */
export function ListingDetailHeader({ listing, photos }: ListingDetailContentProps) {
  const insets = useSafeAreaInsets();
  const { t, language: lang } = useLanguage();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPhotoIndex, setModalPhotoIndex] = useState(0);

  const galleryItems: GalleryItem[] = useMemo(
    () =>
      PHOTO_SLOTS.map((slot) => {
        const found = photos.find((p) => p.photoType === slot.type);
        return {
          type: slot.type,
          title: t(slot.title),
          shortLabel: t(slot.short),
          subtitle: t(slot.sub),
          url: found?.url ?? null,
        };
      }),
    [photos, t],
  );

  const activePhoto = galleryItems[selectedPhotoIndex] ?? galleryItems[0];
  const modalActivePhoto = galleryItems[modalPhotoIndex] ?? galleryItems[0];
  const soldKg = Math.max(0, listing.netWeightKg - listing.remainingQuantityKg);

  const openModalAt = (index: number) => {
    setModalPhotoIndex(index);
    setModalVisible(true);
  };
  const handlePrev = () =>
    setModalPhotoIndex((prev) => (prev > 0 ? prev - 1 : galleryItems.length - 1));
  const handleNext = () =>
    setModalPhotoIndex((prev) => (prev < galleryItems.length - 1 ? prev + 1 : 0));

  return (
    <>
      <View style={styles.gallery}>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`${t("detailV2.enlargePhoto")}: ${activePhoto.title}`}
          onPress={() => openModalAt(selectedPhotoIndex)}
          style={styles.hero}>
          <PhotoFill url={activePhoto.url} contentFit="cover" />
          <View style={styles.expandButton}>
            <Maximize2 size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={2.5} />
          </View>
        </Pressable>

        <View style={styles.chipRow}>
          {galleryItems.map((item, index) => (
            <FilterChip
              key={item.type}
              compact
              label={item.shortLabel}
              selected={selectedPhotoIndex === index}
              onPress={() => setSelectedPhotoIndex(index)}
            />
          ))}
        </View>
      </View>

      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <AnimoText variant="heading" accessibilityRole="header">
            {listingTitle(listing)}
          </AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t("detailV2.sold", { kg: soldKg.toLocaleString("en-PH") })}
          </AnimoText>
        </View>
        <StatusPill
          tone={STATUS_TONE[listing.status]}
          label={getStatusLabel(listing.status, lang)}
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalTopBar, { paddingTop: Math.max(insets.top, AnimoV2Spacing.xl) + AnimoV2Spacing.md }]}>
            <View style={styles.modalTitleWrap}>
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
                {modalActivePhoto.title}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.brandLight}>
                {t("detailV2.photoOf", { n: modalPhotoIndex + 1, total: galleryItems.length })} · {modalActivePhoto.subtitle}
              </AnimoText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("detailV2.closePhoto")}
              hitSlop={8}
              onPress={() => setModalVisible(false)}
              style={styles.modalIconBtn}>
              <X size={24} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
          </View>

          <View style={styles.modalMain}>
            <PhotoFill url={modalActivePhoto.url} contentFit="contain" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("detailV2.prevPhoto")}
              hitSlop={8}
              onPress={handlePrev}
              style={[styles.modalIconBtn, styles.navArrow, styles.navLeft]}>
              <ChevronLeft size={26} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("detailV2.nextPhoto")}
              hitSlop={8}
              onPress={handleNext}
              style={[styles.modalIconBtn, styles.navArrow, styles.navRight]}>
              <ChevronRight size={26} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
          </View>

          <SafeAreaView style={styles.modalBottom} edges={["bottom"]}>
            <View style={styles.modalThumbRow}>
              {galleryItems.map((item, index) => {
                const selected = modalPhotoIndex === index;
                return (
                  <Pressable
                    key={item.type}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={item.title}
                    onPress={() => setModalPhotoIndex(index)}
                    style={[styles.modalThumb, selected && styles.modalThumbOn]}>
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

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.infoRow} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon size={22} color={AnimoV2Colors.textBrand} strokeWidth={2.25} />
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.infoLabel}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyStrong" style={styles.infoValue} numberOfLines={2}>
        {value}
      </AnimoText>
    </View>
  );
}

/** Detalye tab body: fair price reveal, why-this-price rows, palay information, reviews. */
export function ListingDetailContent({ listing }: ListingDetailContentProps) {
  const { t, language: lang } = useLanguage();
  const specificVariety = specificVarietyDisplay(listing, lang);
  const rationale = priceRationaleRows(listing);

  const infoRows: { key: string; icon: LucideIcon; label: string; value: string }[] = [
    { key: "variety", icon: Sprout, label: t("detailV2.rowVariety"), value: varietyLabel(listing, lang) },
    ...(specificVariety
      ? [{ key: "specific", icon: Sprout, label: t("detailV2.rowSpecific"), value: specificVariety }]
      : []),
    { key: "moisture", icon: Droplets, label: t("detailV2.rowMoisture"), value: moistureLabel(listing.declaredMoisture, lang) },
    { key: "purity", icon: ShieldCheck, label: t("detailV2.rowPurity"), value: purityLabel(listing.declaredPurityGrade, lang) },
    { key: "weight", icon: Scale, label: t("detailV2.rowWeight"), value: `${listing.netWeightKg} kg` },
  ];

  return (
    <>
      {/* Fair price reveal */}
      <View style={styles.revealEdge}>
        <View style={styles.reveal}>
          <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand} style={styles.revealTag}>
            {t("detailV2.fairPrice")}
          </AnimoText>
          <View style={styles.priceRow}>
            <AnimoText variant="priceHero" color={AnimoV2Colors.textOnBrand}>
              {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg) : "—"}
            </AnimoText>
            <AnimoText variant="subheading" color={AnimoV2Colors.textOnBrand}>
              {t("detailV2.perKg")}
            </AnimoText>
          </View>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand}>
            {t("detailV2.totalValue", { kg: listing.remainingQuantityKg })}{" "}
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
              {listing.pricePerKg !== null ? formatPeso(listing.pricePerKg * listing.remainingQuantityKg) : "—"}
            </AnimoText>
          </AnimoText>
        </View>
      </View>

      {/* Why this price (only facts the listing supports) */}
      {rationale ? (
        <DepthCard depth="flat" style={styles.cardPad}>
          {rationale.map((row, index) => {
            const meta = RATIONALE_ICON[row.icon];
            return (
              <View key={row.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.factorRow}>
                  <IconTile icon={meta.icon} tone={meta.tone} size={36} />
                  <View style={styles.factorCopy}>
                    <AnimoText variant="bodyStrong">{t(row.label)}</AnimoText>
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                      {t(row.detail)}
                    </AnimoText>
                  </View>
                </View>
              </View>
            );
          })}
        </DepthCard>
      ) : null}

      {/* Palay information */}
      <DepthCard depth="flat" style={styles.cardPad}>
        <AnimoText variant="subheading" accessibilityRole="header">
          {t("detailV2.infoTitle")}
        </AnimoText>
        {infoRows.map((row) => (
          <InfoRow key={row.key} icon={row.icon} label={row.label} value={row.value} />
        ))}
      </DepthCard>

      <PalayReviewsCard
        v2
        listingId={listing.id}
        onPress={() =>
          router.push({
            pathname: "/(farmer)/palay-reviews",
            params: { id: listing.id },
          })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: AnimoV2Spacing.md },
  hero: {
    width: "100%",
    height: HERO_HEIGHT,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
  },
  photoFill: { ...StyleSheet.absoluteFillObject },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  expandButton: {
    position: "absolute",
    top: AnimoV2Spacing.md,
    right: AnimoV2Spacing.md,
    width: 36,
    height: 36,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: AnimoV2Spacing.sm },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: AnimoV2Spacing.md,
  },
  titleCol: { flex: 1, gap: 2 },
  revealEdge: { borderRadius: AnimoV2Radius.xl, backgroundColor: AnimoV2Colors.actionPrimaryDepth, paddingBottom: 6 },
  reveal: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    padding: 20,
    gap: AnimoV2Spacing.md,
  },
  revealTag: { opacity: 0.9 },
  priceRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: AnimoV2Spacing.sm },
  cardPad: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault, marginBottom: AnimoV2Spacing.md },
  factorRow: { flexDirection: "row", alignItems: "flex-start", gap: AnimoV2Spacing.md },
  factorCopy: { flex: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: AnimoV2Spacing.md },
  infoLabel: { flex: 1 },
  infoValue: { flexShrink: 1, maxWidth: "50%", textAlign: "right" },
  modalBackdrop: { flex: 1, backgroundColor: AnimoV2Colors.textPrimary, justifyContent: "space-between" },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.md,
  },
  modalTitleWrap: { flex: 1, gap: 2 },
  modalIconBtn: {
    width: 48,
    height: 48,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.scrim,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMain: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: AnimoV2Spacing.sm },
  navArrow: { position: "absolute", top: "50%" },
  navLeft: { left: AnimoV2Spacing.md },
  navRight: { right: AnimoV2Spacing.md },
  modalBottom: { paddingVertical: AnimoV2Spacing.md, alignItems: "center" },
  modalThumbRow: { flexDirection: "row", gap: AnimoV2Spacing.md },
  modalThumb: {
    width: MODAL_THUMB,
    height: MODAL_THUMB,
    borderRadius: AnimoV2Radius.sm,
    borderWidth: 3,
    borderColor: "transparent",
    overflow: "hidden",
  },
  modalThumbOn: { borderColor: AnimoV2Colors.actionPrimary },
});
