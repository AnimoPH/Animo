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
import { createCropListing, uploadListingPhoto } from "@/services/crop-listing-service";
import {
  HYBRID_SPECIFIC_VARIETY_OPTIONS,
  INBRED_SPECIFIC_VARIETY_OPTIONS,
  MOISTURE_OPTIONS,
  PHOTO_SLOTS,
  PURITY_OPTIONS,
  SPECIFIC_VARIETY_OTHER,
  VARIETY_OPTIONS,
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
      ? INBRED_SPECIFIC_VARIETY_OPTIONS
      : variety === "Hybrid"
        ? HYBRID_SPECIFIC_VARIETY_OPTIONS
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
          ? "Kailangan ng pahintulot para makakuha ng larawan."
          : "Kailangan ng pahintulot. Buksan ang Settings ng telepono para payagan ang ANIMO.",
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
      setErrorMessage("Hindi maproseso ang larawan. Subukan muli.");
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
          `Hindi na-upload ang ${newlyFailed.length} larawan. Subukan muli o magpatuloy nang wala.`,
        );
        return;
      }

      navigateToUploading(listingId, price);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Hindi na-submit ang listing.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedWithoutPhotos = () => {
    if (!createdListingId) return;
    navigateToUploading(createdListingId, createdPrice);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <BackHeader title="Gumawa ng Listing" />

      {/* Progress Bar */}
      <ProgressSteps />

      {/* Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            Maglista ng Palay
          </AnimoText>
          <AnimoText
            variant="body"
            color={AnimoColors.textMediumEmphasis}
            style={styles.introBody}
          >
            Ilagay ang detalye ng iyong palay para sa merkado. Tandaan na dapat
            ang mga ilalagay niyong impormasyon ay tama at eksakto.
          </AnimoText>
        </View>

        {/* Photo Slots */}
        <View style={[styles.card, styles.shadow]}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            Mga Larawan ng Palay
          </AnimoText>
          <AnimoText
            variant="caption"
            color={AnimoColors.textLowEmphasis}
            style={styles.introBody}
          >
            Kailangan ng hindi bababa sa isang larawan. Kumuha gamit ang camera
            o pumili mula sa gallery.
          </AnimoText>

          <View style={styles.photoRow}>
            {PHOTO_SLOTS.map((slot) => {
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
              label="Pangalan ng Listing"
              value={listingName}
              onChangeText={setListingName}
              placeholder="Hal. Palay Listing"
            />
            <View style={styles.inlineFieldSpacing}>
              <SelectField
                label="Uri ng Palay"
                placeholder="Pumili ng uri ng palay"
                options={VARIETY_OPTIONS}
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
                  placeholder="Ilagay ang pangalan ng uri"
                />
              </View>
            ) : null}
            {needsSpecificVariety ? (
              <View style={styles.inlineFieldSpacing}>
                <SpecificVarietyField
                  label="Tiyak na Uri ng Palay"
                  placeholder="Pumili ng tiyak na uri"
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
                      placeholder="Ilagay ang tiyak na uri"
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>

          <SegmentedChoice
            label="Moisture %"
            options={MOISTURE_OPTIONS}
            value={moistureType}
            onChange={setMoistureType}
          />

          <SelectField
            label="Kalinisan (Purity Grade)"
            placeholder="Pumili ng kalinisan ng palay"
            options={PURITY_OPTIONS}
            value={purityGrade || null}
            onChange={(value) => setPurityGrade(value as PurityGrade)}
          />
        </View>

        {/* Weight Card */}
        <View style={[styles.card, styles.shadow]}>
          <LabeledInput
            label="Timbang ng Palay (Gross Weight)"
            value={grossWeight}
            onChangeText={setGrossWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText="kilo/kg"
          />
          <LabeledInput
            label="Timbang ng Sako at iba pa (Tare Weight)"
            value={tareWeight}
            onChangeText={setTareWeight}
            keyboardType="numeric"
            placeholder="0"
            suffixText="kilo/kg"
          />
          <NetWeightField value={netWeight} />
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
                label="Subukan Muli"
                variant="secondary"
                loading={submitting}
                onPress={handleSubmit}
              />
              <AnimoButton
                label="Magpatuloy nang Wala Munang Larawan"
                variant="primary"
                disabled={submitting}
                onPress={handleProceedWithoutPhotos}
              />
            </View>
          ) : (
            <AnimoButton
              label="Ipasa na"
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

function NetWeightField({ value }: { value: number }) {
  return (
    <View>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
        Kabuuan (Net Weight)
      </AnimoText>
      <View style={styles.netWeightField}>
        <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
          {value}
        </AnimoText>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
          kilo/kg
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
