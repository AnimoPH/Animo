import { router } from "expo-router";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Lock, WifiOff, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import {
  InlineError,
  MoistureGradeFields,
  PhotoSlotGrid,
  PhotoSourceSheetV2,
  VarietyFields,
  WeightFields,
} from "@/components/animo/farmer/listing-form-v2";
import { ChunkyButton } from "@/components/animo/ui/chunky-button";
import { DepthCard } from "@/components/animo/ui/depth-card";
import { V2Dialog } from "@/components/animo/ui/dialog";
import { IconTile } from "@/components/animo/ui/icon-tile";
import { ProgressBar } from "@/components/animo/ui/progress-bar";
import { IconButton, StickyFooter } from "@/components/animo/ui/screen-bits";
import { TextField } from "@/components/animo/ui/text-field";

import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from "@/constants/animo";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";
import { formatPeso } from "@/constants/marketplace";
import {
  computeLockedPrice,
  getCachedPriceFeed,
  refreshPriceFeedCache,
  type PriceFeedCache,
} from "@/lib/outbox";
import { isOnlineNow, isSignalError, newRequestId, saveListingOffline } from "@/lib/outbox/enqueue-actions";
import { createCropListing, uploadListingPhoto } from "@/services/crop-listing-service";
import {
  SPECIFIC_VARIETY_OTHER,
  getHybridSpecificVarieties,
  getInbredSpecificVarieties,
  getMoistureOptions,
  getPurityOptions,
  getVarietyOptions,
  type DeclaredVariety,
  type MoistureType,
  type PhotoType,
  type PurityGrade,
  type SpecificVarietyOption,
  type VarietyCode,
} from "@/types/crop-listing";

const TOTAL_STEPS = 5;

/** Re-encodes a picked photo to a size-capped JPEG before it's held in state / uploaded. */
async function toUploadableJpeg(uri: string): Promise<string> {
  try {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1440 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch {
    // If manipulation fails, fallback to original picked uri
    return uri;
  }
}

/** Gumawa ng Listing — five one-question steps: photos, name + variety, quality, weight, review + publish. */
export default function PalayListingScreen() {
  const { t, language, isTagalog } = useLanguage();
  const { account } = useSession();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [variety, setVariety] = useState<DeclaredVariety | "">("");
  const [listingName, setListingName] = useState("");
  const [customVariety, setCustomVariety] = useState("");
  // Shown only for Inbred/Hybrid — persisted as
  // specific_variety_name (+ custom) and variety_code (218 vs OTHER).
  const [specificVariety, setSpecificVariety] = useState<SpecificVarietyOption | null>(null);
  const [specificVarietyCustom, setSpecificVarietyCustom] = useState("");
  const [moistureType, setMoistureType] = useState<MoistureType>("Dry");
  const [purityGrade, setPurityGrade] = useState<PurityGrade | "">("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Photo slots — local uri per slot until uploaded. `createdListingId` is set
  // once the listing row itself exists, so a retry after a partial photo
  // upload failure never re-creates it (see handleSubmit).
  const [photos, setPhotos] = useState<Partial<Record<PhotoType, string>>>({});
  const [activeSlot, setActiveSlot] = useState<PhotoType | null>(null);
  const [failedSlots, setFailedSlots] = useState<PhotoType[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [createdPrice, setCreatedPrice] = useState<number | null>(null);

  // The peso shown before submitting comes from the feed saved on the phone, so
  // it is there offline too. The server still locks its own price from the feed
  // and only accepts the listing when it equals this one.
  const [feed, setFeed] = useState<PriceFeedCache | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  // One id per listing attempt: the online send and a later offline save share it,
  // so the server sees them as the same listing.
  const [requestId] = useState(newRequestId);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const loadFeed = useCallback(async (): Promise<PriceFeedCache | null> => {
    setLoadingFeed(true);
    try {
      const cached = await getCachedPriceFeed();
      if (cached) setFeed(cached);
      if (await isOnlineNow()) {
        const fresh = await refreshPriceFeedCache();
        if (fresh) {
          setFeed(fresh);
          return fresh;
        }
      }
      return cached;
    } catch {
      return null;
    } finally {
      setLoadingFeed(false);
    }
  }, []);
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const netWeight = Math.max(
    0,
    (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0),
  );

  const needsSpecificVariety = variety === "Inbred" || variety === "Hybrid";
  const specificVarietyOptions =
    variety === "Inbred"
      ? getInbredSpecificVarieties(language)
      : variety === "Hybrid"
        ? getHybridSpecificVarieties(language)
        : [];
  // Only NSIC Rc218 carries a price premium (see varietypricepremium); every
  // other pick, including non-Inbred/Hybrid varieties, resolves to OTHER.
  const varietyCode: VarietyCode = needsSpecificVariety
    ? (specificVariety?.varietyCode ?? "OTHER")
    : "OTHER";

  const shownPrice =
    feed && purityGrade !== "" ? computeLockedPrice(feed, moistureType, varietyCode, purityGrade) : null;

  const hasAnyPhoto = Object.keys(photos).length > 0;
  const canSubmit =
    listingName.trim().length > 0 &&
    variety !== "" &&
    (variety !== "Others" || customVariety.trim().length > 0) &&
    (!needsSpecificVariety || specificVariety !== null) &&
    (specificVariety?.value !== SPECIFIC_VARIETY_OTHER || specificVarietyCustom.trim().length > 0) &&
    purityGrade !== "" &&
    netWeight > 0 &&
    hasAnyPhoto;

  // Per-step validity: Next stays disabled until the step is valid.
  const nameAndVarietyValid =
    listingName.trim().length > 0 &&
    variety !== "" &&
    (variety !== "Others" || customVariety.trim().length > 0) &&
    (!needsSpecificVariety || specificVariety !== null) &&
    (specificVariety?.value !== SPECIFIC_VARIETY_OTHER || specificVarietyCustom.trim().length > 0);
  const stepValid =
    step === 1
      ? hasAnyPhoto
      : step === 2
        ? nameAndVarietyValid
        : step === 3
          ? purityGrade !== ""
          : step === 4
            ? netWeight > 0
            : canSubmit;

  const goBack = useCallback(() => {
    if (step === 1) {
      router.back();
    } else {
      setStep((s) => s - 1);
    }
  }, [step]);

  // Hardware back walks back one step instead of leaving the wizard.
  useEffect(() => {
    if (step === 1) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setStep((s) => Math.max(1, s - 1));
      return true;
    });
    return () => sub.remove();
  }, [step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  const handleClearPhoto = (slot: PhotoType) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
    setFailedSlots((prev) => prev.filter((s) => s !== slot));
  };

  const handlePickSource = async (source: "camera" | "gallery") => {
    const slot = activeSlot;
    setActiveSlot(null);
    if (!slot) return;

    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage(
        permission.canAskAgain
          ? (isTagalog ? "Kailangan ng pahintulot para makakuha ng larawan." : "Permission required to capture photos.")
          : (isTagalog ? "Kailangan ng pahintulot. Buksan ang Settings ng telepono para payagan ang ANIMO." : "Permission required. Open phone Settings to allow ANIMO."),
      );
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.[0]) return;

    try {
      const uploadableUri = await toUploadableJpeg(result.assets[0].uri);
      setPhotos((prev) => ({ ...prev, [slot]: uploadableUri }));
      setFailedSlots((prev) => prev.filter((s) => s !== slot));
      setErrorMessage(undefined);
    } catch {
      setErrorMessage(isTagalog ? "Hindi maproseso ang larawan. Subukan muli." : "Failed to process photo. Please try again.");
    }
  };

  const navigateToUploading = (listingId: string, price: number | null) => {
    router.push({
      pathname: "/(farmer)/listing-uploading",
      params: { listingId, price: price !== null ? String(price) : "" },
    });
  };

  const buildInput = () => ({
    listingName,
    declaredVariety: variety as DeclaredVariety,
    customVariety: variety === "Others" ? customVariety : undefined,
    varietyCode,
    specificVarietyName: needsSpecificVariety ? specificVariety?.value ?? null : null,
    specificVarietyNameCustom:
      specificVariety?.value === SPECIFIC_VARIETY_OTHER ? specificVarietyCustom : undefined,
    declaredMoisture: moistureType,
    declaredPurityGrade: purityGrade as PurityGrade,
    grossWeightKg: parseFloat(grossWeight) || 0,
    tareWeightKg: parseFloat(tareWeight) || 0,
  });

  /** Keeps the listing on the phone to send when the signal returns. Returns false when it cannot. */
  const saveOffline = async (): Promise<boolean> => {
    let price = shownPrice;
    if (account && price === null && purityGrade !== "") {
      // No saved price yet: one try to fetch it now, in case the signal just came back.
      const fresh = await loadFeed();
      if (fresh) price = computeLockedPrice(fresh, moistureType, varietyCode, purityGrade);
    }
    if (!account || price === null) {
      setErrorMessage(
        isTagalog
          ? "Walang naka-save na presyo sa phone. Kailangan ng signal para sa unang listing."
          : "No price is saved on this phone yet. The first listing needs a signal.",
      );
      return false;
    }
    await saveListingOffline(account.id, buildInput(), photos, price, requestId);
    setSavedOffline(true);
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      let listingId = createdListingId;
      let price = createdPrice;

      if (!listingId) {
        if (!canSubmit || !variety || !purityGrade) return;
        if (!(await isOnlineNow())) {
          await saveOffline();
          return;
        }
        const listing = await createCropListing(buildInput(), requestId);
        listingId = listing.id;
        price = listing.pricePerKg;
        setCreatedListingId(listing.id);
        setCreatedPrice(listing.pricePerKg);
      }

      const slotsToUpload = Object.keys(photos) as PhotoType[];
      const results = await Promise.allSettled(
        slotsToUpload.map((slot) => uploadListingPhoto(listingId!, slot, photos[slot]!)),
      );
      const newlyFailed = slotsToUpload.filter((_, i) => results[i].status === "rejected");

      if (newlyFailed.length > 0) {
        setFailedSlots(newlyFailed);
        setErrorMessage(
          isTagalog
            ? `Hindi na-upload ang ${newlyFailed.length} larawan. Subukan muli o magpatuloy nang wala.`
            : `Failed to upload ${newlyFailed.length} photo(s). Try again or proceed without photos.`,
        );
        return;
      }

      navigateToUploading(listingId, price);
    } catch (err) {
      // The signal dropped before the listing reached the server: keep it instead of losing it.
      if (!createdListingId && isSignalError(err) && (await saveOffline().catch(() => false))) return;
      setErrorMessage(
        err instanceof Error ? err.message : (isTagalog ? "Hindi na-submit ang listing." : "Failed to submit listing."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedWithoutPhotos = () => {
    if (!createdListingId) return;
    navigateToUploading(createdListingId, createdPrice);
  };

  const onNext = () => {
    if (!stepValid) return;
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const titles: Record<number, { title: string; sub: string }> = {
    1: { title: t("wizV2.s1Title"), sub: t("wizV2.s1Sub") },
    2: { title: t("wizV2.s2Title"), sub: t("wizV2.s2Sub") },
    3: { title: t("wizV2.s3Title"), sub: t("wizV2.s3Sub") },
    4: { title: t("wizV2.s4Title"), sub: t("wizV2.s4Sub") },
    5: { title: t("wizV2.s5Title"), sub: t("wizV2.s5Sub") },
  };

  // Review summary text.
  const varietyOption = getVarietyOptions(language).find((o) => o.value === variety);
  const varietySummary =
    variety === "Others"
      ? customVariety.trim()
      : needsSpecificVariety && specificVariety
        ? specificVariety.value === SPECIFIC_VARIETY_OTHER
          ? specificVarietyCustom.trim() || specificVariety.label
          : specificVariety.label
        : varietyOption?.label ?? "";
  const moistureSummary = getMoistureOptions(language).find((o) => o.value === moistureType)?.label ?? moistureType;
  const gradeSummary = getPurityOptions(language).find((o) => o.value === purityGrade)?.label ?? purityGrade;

  const summaryRows: { label: string; value: string }[] = [
    { label: t("wizV2.sumName"), value: listingName.trim() },
    { label: t("wizV2.sumVariety"), value: varietySummary },
    { label: t("wizV2.sumQuality"), value: `${moistureSummary}, ${gradeSummary}` },
    { label: t("wizV2.sumQty"), value: `${netWeight.toLocaleString("en-PH")} kg` },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: "padding", default: "height" })}>
      {/* Top row: close / back, progress bar, step counter */}
      <View style={[styles.progressRow, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
        <IconButton
          label={step === 1 ? t("wizV2.close") : t("wizV2.back")}
          onPress={goBack}
          icon={
            step === 1 ? (
              <X size={28} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
            ) : (
              <ChevronLeft size={28} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
            )
          }
        />
        <View style={styles.track}>
          <ProgressBar value={step / TOTAL_STEPS} />
        </View>
        <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary} style={styles.counter}>
          {step}/{TOTAL_STEPS}
        </AnimoText>
      </View>

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={{ gap: AnimoV2Spacing.xs }}>
          <AnimoText variant="title" accessibilityRole="header">
            {titles[step].title}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {titles[step].sub}
          </AnimoText>
        </View>

        {step === 1 ? (
          <>
            <PhotoSlotGrid
              photos={photos}
              failedSlots={failedSlots}
              onPressSlot={setActiveSlot}
              onClear={handleClearPhoto}
            />
            <DepthCard
              depth="flat"
              radius="lg"
              backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
              borderColor={AnimoV2Colors.brandLight}
              style={styles.tipCard}>
              <IconTile icon={Lock} tone="success" size={36} />
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={{ flex: 1 }}>
                {t("wizV2.s1Tip")}
              </AnimoText>
            </DepthCard>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <TextField
              label={t("wizV2.nameLabel")}
              value={listingName}
              onChangeText={setListingName}
              placeholder={t("wizV2.namePh")}
              autoCorrect={false}
            />
            <VarietyFields
              variety={variety}
              onVarietyChange={(next) => {
                setVariety(next);
                setCustomVariety("");
                setSpecificVariety(null);
                setSpecificVarietyCustom("");
              }}
              customVariety={customVariety}
              onCustomVarietyChange={setCustomVariety}
              specificOptions={specificVarietyOptions}
              specificVariety={specificVariety}
              onSpecificSelect={(option) => {
                setSpecificVariety(option);
                if (option.value !== SPECIFIC_VARIETY_OTHER) {
                  setSpecificVarietyCustom("");
                }
              }}
              specificCustom={specificVarietyCustom}
              onSpecificCustomChange={setSpecificVarietyCustom}
            />
          </>
        ) : null}

        {step === 3 ? (
          <MoistureGradeFields
            moisture={moistureType}
            onMoistureChange={setMoistureType}
            grade={purityGrade}
            onGradeChange={setPurityGrade}
          />
        ) : null}

        {step === 4 ? (
          <WeightFields
            gross={grossWeight}
            tare={tareWeight}
            onGrossChange={setGrossWeight}
            onTareChange={setTareWeight}
            net={netWeight}
          />
        ) : null}

        {step === 5 ? (
          <>
            {shownPrice !== null ? (
              <View style={styles.reveal}>
                <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
                  {t("wizV2.fairPrice")}
                </AnimoText>
                <View style={styles.revealPriceRow}>
                  <AnimoText variant="priceHero" color={AnimoV2Colors.textOnBrand}>
                    {formatPeso(shownPrice)}
                  </AnimoText>
                  <AnimoText variant="subheading" color={AnimoV2Colors.textOnBrand}>
                    {t("wizV2.perKgLong")}
                  </AnimoText>
                </View>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textOnBrand}>
                  {t("wizV2.totalValue", { n: netWeight.toLocaleString("en-PH") })}:{" "}
                  <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
                    {formatPeso(shownPrice * netWeight)}
                  </AnimoText>
                </AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textOnBrand}>
                  {t("wizV2.priceSource", { date: feed?.effectiveDate ?? "" })}
                </AnimoText>
              </View>
            ) : (
              <DepthCard depth="flat" radius="lg" style={{ padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm }}>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t("wizV2.noPrice")}
                </AnimoText>
                <Pressable
                  onPress={loadFeed}
                  disabled={loadingFeed}
                  accessibilityRole="button"
                  accessibilityLabel={loadingFeed ? t("wizV2.loadingPrice") : t("wizV2.retryUpload")}
                  style={styles.retryPrice}>
                  <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                    {loadingFeed ? t("wizV2.loadingPrice") : t("wizV2.retryUpload")}
                  </AnimoText>
                </Pressable>
              </DepthCard>
            )}

            <DepthCard depth="flat" radius="lg" style={{ padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md }}>
              {summaryRows.map((row, i) => (
                <View key={row.label} style={{ gap: AnimoV2Spacing.md }}>
                  {i > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.summaryRow}>
                    <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                      {row.label}
                    </AnimoText>
                    <AnimoText variant="bodyStrong" style={styles.summaryValue}>
                      {row.value}
                    </AnimoText>
                  </View>
                </View>
              ))}
            </DepthCard>

            <View style={styles.lockRow}>
              <Lock size={20} color={AnimoV2Colors.textSecondary} strokeWidth={2.5} />
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={{ flex: 1 }}>
                {t("wizV2.lockNote")}
              </AnimoText>
            </View>
          </>
        ) : null}

        {errorMessage ? <InlineError message={errorMessage} /> : null}
      </ScrollView>

      {/* Sticky action bar */}
      <StickyFooter>
        {step === 5 && failedSlots.length > 0 ? (
          <>
            <ChunkyButton
              label={t("wizV2.retryUpload")}
              variant="secondary"
              loading={submitting}
              onPress={handleSubmit}
            />
            <ChunkyButton
              label={t("wizV2.proceedNoPhotos")}
              disabled={submitting}
              onPress={handleProceedWithoutPhotos}
            />
          </>
        ) : step === 5 ? (
          <ChunkyButton
            label={t("wizV2.publish")}
            disabled={!stepValid}
            loading={submitting}
            onPress={handleSubmit}
          />
        ) : (
          <ChunkyButton label={t("wizV2.next")} disabled={!stepValid} onPress={onNext} />
        )}
        <View style={{ height: insets.bottom }} />
      </StickyFooter>

      <V2Dialog
        visible={savedOffline}
        onClose={() => {
          setSavedOffline(false);
          router.replace("/(farmer)/(tabs)/palengke");
        }}
        dismissable={false}
        icon={WifiOff}
        iconTone="warning"
        title={t("wizV2.savedTitle")}
        message={t("wizV2.savedMsg")}
        actions={
          <ChunkyButton
            label={t("wizV2.ok")}
            onPress={() => {
              setSavedOffline(false);
              router.replace("/(farmer)/(tabs)/palengke");
            }}
          />
        }
      />

      <PhotoSourceSheetV2
        visible={activeSlot !== null}
        onPickCamera={() => handlePickSource("camera")}
        onPickGallery={() => handlePickSource("gallery")}
        onClose={() => setActiveSlot(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.sm,
  },
  track: { flex: 1 },
  counter: { paddingRight: AnimoV2Spacing.sm },
  scrollContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.md,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  reveal: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    borderBottomWidth: 6,
    borderBottomColor: AnimoV2Colors.actionPrimaryDepth,
    padding: 20,
    gap: AnimoV2Spacing.sm,
  },
  revealPriceRow: { flexDirection: "row", alignItems: "baseline", gap: AnimoV2Spacing.sm, flexWrap: "wrap" },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: AnimoV2Spacing.md },
  summaryValue: { flexShrink: 1, textAlign: "right" },
  lockRow: { flexDirection: "row", alignItems: "center", gap: AnimoV2Spacing.sm },
  retryPrice: { minHeight: 48, justifyContent: "center" },
});
