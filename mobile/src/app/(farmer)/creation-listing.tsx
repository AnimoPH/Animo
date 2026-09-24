import { router } from "expo-router";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Camera, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoButton } from "@/components/animo/animo-button";
import { AnimoText } from "@/components/animo/animo-text";
import { ScreenHeader } from "@/components/animo/screen-header";
import { PhotoSourceSheet } from "@/components/animo/photo-source-sheet";
import { ProgressSteps } from "@/components/animo/farmer/progress-steps";

import { LabeledInput } from "@/components/animo/labeled-input";
import { SelectField } from "@/components/animo/select-field";
import { SpecificVarietyField } from "@/components/animo/specific-variety-field";
import { SegmentedChoice } from "@/components/animo/segmented-choice";

import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { useLanguage } from "@/hooks/use-language";
import { createCropListing, uploadListingPhoto } from "@/services/crop-listing-service";
import {
  SPECIFIC_VARIETY_OTHER,
  getHybridSpecificVarieties,
  getInbredSpecificVarieties,
  getMoistureOptions,
  getPhotoSlots,
  getPurityOptions,
  getVarietyOptions,
  type DeclaredVariety,
  type MoistureType,
  type PhotoType,
  type PurityGrade,
  type SpecificVarietyOption,
  type VarietyCode,
} from "@/types/crop-listing";
import { BackHeader } from "@/components/animo/back-header";

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

/** Gumawa ng Listing — farmer creates a new palay listing: photo, quality, weight. */
export default function PalayListingScreen() {
  const { language, isTagalog } = useLanguage();
  const [variety, setVariety] = useState<DeclaredVariety | "">("");
  const [listingName, setListingName] = useState("");
  const [customVariety, setCustomVariety] = useState("");
  // Second modal, shown only for Inbred/Hybrid — persisted as
  // specific_variety_name (+ custom) and variety_code (218 vs OTHER).
  const [specificVariety, setSpecificVariety] = useState<SpecificVarietyOption | null>(null);
  const [specificVarietyOpen, setSpecificVarietyOpen] = useState(false);
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

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      let listingId = createdListingId;
      let price = createdPrice;

      if (!listingId) {
        if (!canSubmit || !variety || !purityGrade) return;
        const listing = await createCropListing({
          listingName,
          declaredVariety: variety,
          customVariety: variety === "Others" ? customVariety : undefined,
          varietyCode,
          specificVarietyName: needsSpecificVariety ? specificVariety?.value ?? null : null,
          specificVarietyNameCustom:
            specificVariety?.value === SPECIFIC_VARIETY_OTHER ? specificVarietyCustom : undefined,
          declaredMoisture: moistureType,
          declaredPurityGrade: purityGrade,
          grossWeightKg: parseFloat(grossWeight) || 0,
          tareWeightKg: parseFloat(tareWeight) || 0,
        });
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

  const photoSlots = getPhotoSlots(language);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <BackHeader title={isTagalog ? "Gumawa ng Listing" : "Create Listing"} />

      {/* Progress Bar */}
      <ProgressSteps />

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Maglista ng Palay" : "List Palay Harvest"}
          </AnimoText>
          <AnimoText
            variant="body"
            color={AnimoColors.textMediumEmphasis}
            style={styles.introBody}
          >
            {isTagalog
              ? "Ilagay ang detalye ng iyong palay para sa merkado. Tandaan na dapat ang mga ilalagay niyong impormasyon ay tama at eksakto."
              : "Enter your palay harvest details for the marketplace. Please ensure all information entered is accurate."}
          </AnimoText>
        </View>

        {/* Photo Slots */}
        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {isTagalog ? "Mga Larawan ng Palay" : "Harvest Photos"}
          </AnimoText>
          <AnimoText
            variant="caption"
            color={AnimoColors.textLowEmphasis}
            style={styles.introBody}
          >
            {isTagalog
              ? "Kailangan ng hindi bababa sa isang larawan. Kumuha gamit ang camera o pumili mula sa gallery."
              : "At least one photo is required. Take photos using the camera or select from your gallery."}
          </AnimoText>

          <View style={styles.photoRow}>
            {photoSlots.map((slot) => {
              const localUri = photos[slot.value];
              const failed = failedSlots.includes(slot.value);
              return (
                <Pressable
                  key={slot.value}
                  accessibilityRole="button"
                  onPress={() => setActiveSlot(slot.value)}
                  style={[styles.photoTile, failed && styles.photoTileFailed]}
                >
                  {localUri ? (
                    <View style={styles.photoTileImageWrap}>
                      <Image
                        source={{ uri: localUri }}
                        style={styles.photoTileImage}
                        contentFit="cover"
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => handleClearPhoto(slot.value)}
                        style={styles.photoTileClear}
                        hitSlop={8}
                      >
                        <X size={12} color={AnimoColors.textHighEmphasisInverse} />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.photoTileEmptyWrap}>
                      <View style={styles.photoTileIconWrap}>
                        <Camera size={25} color={AnimoColors.accentPrimary} />
                      </View>
                    </View>
                  )}
                  <AnimoText
                    variant="tag"
                    color={AnimoColors.textMediumEmphasis}
                    style={styles.photoTileLabel}
                  >
                    {slot.label}
                  </AnimoText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.shadow]}>
          {/* Palay Details */}
          <View>
            <LabeledInput
              label={isTagalog ? "Pangalan ng Listing" : "Listing Name"}
              value={listingName}
              onChangeText={setListingName}
              placeholder={isTagalog ? "Hal. Palay Listing" : "e.g. Palay Listing"}
            />
            <View style={styles.inlineFieldSpacing}>
              <SelectField
                label={isTagalog ? "Uri ng Palay" : "Rice Variety"}
                placeholder={isTagalog ? "Pumili ng uri ng palay" : "Select rice variety"}
                options={getVarietyOptions(language)}
                value={variety || null}
                onChange={(value) => {
                  const next = value as DeclaredVariety;
                  setVariety(next);
                  setCustomVariety("");
                  setSpecificVariety(null);
                  setSpecificVarietyCustom("");
                  // Opens right after this modal closes — only for Inbred/Hybrid;
                  // every other pick sets variety_code = OTHER directly (above).
                  setSpecificVarietyOpen(next === "Inbred" || next === "Hybrid");
                }}
              />
            </View>
            {variety === "Others" ? (
              <View style={styles.inlineFieldSpacing}>
                <LabeledInput
                  value={customVariety}
                  onChangeText={setCustomVariety}
                  placeholder={isTagalog ? "Ilagay ang pangalan ng uri" : "Enter variety name"}
                />
              </View>
            ) : null}
            {needsSpecificVariety ? (
              <View style={styles.inlineFieldSpacing}>
                <SpecificVarietyField
                  label={isTagalog ? "Tiyak na Uri ng Palay" : "Specific Rice Variety"}
                  placeholder={isTagalog ? "Pumili ng tiyak na uri" : "Select specific variety"}
                  options={specificVarietyOptions}
                  value={specificVariety?.value ?? null}
                  open={specificVarietyOpen}
                  onOpenChange={setSpecificVarietyOpen}
                  onSelect={(option) => {
                    setSpecificVariety(option);
                    if (option.value !== SPECIFIC_VARIETY_OTHER) {
                      setSpecificVarietyCustom("");
                    }
                  }}
                />
                {specificVariety?.value === SPECIFIC_VARIETY_OTHER ? (
                  <View style={styles.inlineFieldSpacing}>
                    <LabeledInput
                      value={specificVarietyCustom}
                      onChangeText={setSpecificVarietyCustom}
                      placeholder={isTagalog ? "Ilagay ang tiyak na uri" : "Enter specific variety"}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          <SegmentedChoice
            label="Moisture %"
            options={getMoistureOptions(language)}
            value={moistureType}
            onChange={setMoistureType}
          />

          <SelectField
            label={isTagalog ? "Kalinisan (Purity Grade)" : "Purity Grade"}
            placeholder={isTagalog ? "Pumili ng kalinisan ng palay" : "Select purity grade"}
            options={getPurityOptions(language)}
            value={purityGrade || null}
            onChange={(value) => setPurityGrade(value as PurityGrade)}
          />
        </View>

        {/* Weight Card */}
        <View style={[styles.card, styles.shadow]}>
          <LabeledInput
            label={isTagalog ? "Timbang ng Palay (Gross Weight)" : "Gross Weight"}
            value={grossWeight}
            onChangeText={setGrossWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText={isTagalog ? "kilo/kg" : "kg"}
          />
          <LabeledInput
            label={isTagalog ? "Timbang ng Sako at iba pa (Tare Weight)" : "Tare Weight (Sacks & deductibles)"}
            value={tareWeight}
            onChangeText={setTareWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText={isTagalog ? "kilo/kg" : "kg"}
          />
          <NetWeightField value={netWeight} isTagalog={isTagalog} />
        </View>

        {errorMessage ? (
          <AnimoText variant="body" color={AnimoColors.danger}>
            {errorMessage}
          </AnimoText>
        ) : null}

        {/* Submit Bar */}
        <View style={styles.submitBar}>
          {failedSlots.length > 0 ? (
            <View style={styles.retryBar}>
              <AnimoButton
                label={isTagalog ? "Subukan Muli" : "Try Again"}
                variant="secondary"
                loading={submitting}
                onPress={handleSubmit}
              />
              <AnimoButton
                label={isTagalog ? "Magpatuloy nang Wala Munang Larawan" : "Proceed Without Photos"}
                variant="primary"
                disabled={submitting}
                onPress={handleProceedWithoutPhotos}
              />
            </View>
          ) : (
            <AnimoButton
              label={isTagalog ? "Ipasa na" : "Submit Listing"}
              variant="primary"
              disabled={!canSubmit}
              loading={submitting}
              onPress={handleSubmit}
            />
          )}
        </View>
      </ScrollView>

      <PhotoSourceSheet
        visible={activeSlot !== null}
        onPickCamera={() => handlePickSource("camera")}
        onPickGallery={() => handlePickSource("gallery")}
        onClose={() => setActiveSlot(null)}
      />
    </SafeAreaView>
  );
}

function NetWeightField({ value, isTagalog = true }: { value: number; isTagalog?: boolean }) {
  return (
    <View>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
        {isTagalog ? "Kabuuan (Net Weight)" : "Net Weight"}
      </AnimoText>
      <View style={styles.netWeightField}>
        <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
          {value}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
          {isTagalog ? "kilo/kg" : "kg"}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scrollContent: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.xl,
  },
  shadow: {
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.xl,
  },
  introBody: {
    marginTop: AnimoSpacing.xs,
  },
  photoRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
  },
  photoTile: {
    flex: 1,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1.5,
    borderColor: AnimoColors.accentPrimary,
    borderStyle: "dashed",
    backgroundColor: "rgba(200, 230, 201, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: AnimoSpacing.sm,
  },
  photoTileFailed: {
    borderColor: AnimoColors.danger,
    borderStyle: "solid",
  },
  photoTileIconWrap: {
    width: 60,
    height: 60,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoTileEmptyWrap: {
    width: "100%",
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  photoTileImageWrap: {
    width: "100%",
    height: 70,
    position: "relative",
    overflow: "hidden",
    borderRadius: AnimoRadius.md,
  },
  photoTileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoTileClear: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: AnimoRadius.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoTileLabel: {
    marginTop: AnimoSpacing.xs,
    textAlign: "center",
  },
  inlineFieldSpacing: {
    marginTop: AnimoSpacing.sm,
  },
  netWeightField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: AnimoSpacing.sm,
    borderWidth: 1,
    borderColor: AnimoColors.borderAccentPrimary,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: "rgba(200, 230, 201, 0.15)",
  },
  submitBar: {
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
  retryBar: {
    gap: AnimoSpacing.md,
  },
});
