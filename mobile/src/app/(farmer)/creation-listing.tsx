import { router } from "expo-router";
import { Camera } from "lucide-react-native";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoButton } from "@/components/animo/animo-button";
import { AnimoText } from "@/components/animo/animo-text";
import { BackHeader } from "@/components/animo/back-header";
import { ProgressSteps } from "@/components/animo/farmer/progress-steps";

import { LabeledInput } from "@/components/animo/labeled-input";
import { SelectField } from "@/components/animo/select-field";
import { SegmentedChoice } from "@/components/animo/segmented-choice";

import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { createCropListing } from "@/services/crop-listing-service";
import {
  MOISTURE_OPTIONS,
  PURITY_OPTIONS,
  VARIETY_OPTIONS,
  type DeclaredVariety,
  type MoistureType,
  type PurityGrade,
} from "@/types/crop-listing";

const SCREEN_PADDING = AnimoSpacing.lg;

/** Gumawa ng Listing — farmer creates a new palay listing: photo, quality, weight. */
export default function PalayListingScreen() {
  const [variety, setVariety] = useState<DeclaredVariety | "">("");
  const [customVariety, setCustomVariety] = useState("");
  const [moistureType, setMoistureType] = useState<MoistureType>("Dry");
  const [purityGrade, setPurityGrade] = useState<PurityGrade | "">("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const netWeight = Math.max(
    0,
    (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0),
  );

  const canSubmit =
    variety !== "" &&
    (variety !== "Others" || customVariety.trim().length > 0) &&
    purityGrade !== "" &&
    netWeight > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !variety || !purityGrade) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      const listing = await createCropListing({
        declaredVariety: variety,
        customVariety: variety === "Others" ? customVariety : undefined,
        declaredMoisture: moistureType,
        declaredPurityGrade: purityGrade,
        grossWeightKg: parseFloat(grossWeight) || 0,
        tareWeightKg: parseFloat(tareWeight) || 0,
      });
      router.push({
        pathname: "/(farmer)/listing-uploading",
        params: {
          listingId: listing.id,
          price: listing.pricePerKg !== null ? String(listing.pricePerKg) : "",
        },
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Hindi na-submit ang listing.",
      );
    } finally {
      setSubmitting(false);
    }
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

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => console.log("Kumuha ng litrato ng palay pressed")}
          style={styles.photoUpload}
        >
          <View style={styles.photoUploadIconWrap}>
            <Camera size={36} color={AnimoColors.accentPrimary} />
          </View>
          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.accentPrimary}
            style={styles.photoUploadTitle}
          >
            Kumuha ng litrato ng palay
          </AnimoText>
          <AnimoText
            variant="caption"
            color={AnimoColors.textLowEmphasis}
            style={styles.photoUploadSubtext}
          >
            Siguraduhing maliwanag ang kuha para sa mabilis na pagsusuri.
          </AnimoText>
        </TouchableOpacity>

        <View style={[styles.card, styles.shadow]}>
          {/* Palay Details */}
          <View>
            <SelectField
              label="Uri ng Palay"
              placeholder="Pumili ng uri ng palay"
              options={VARIETY_OPTIONS}
              value={variety || null}
              onChange={(value) => setVariety(value as DeclaredVariety)}
            />
            {variety === "Others" ? (
              <View style={styles.inlineFieldSpacing}>
                <LabeledInput
                  value={customVariety}
                  onChangeText={setCustomVariety}
                  placeholder="Ilagay ang pangalan ng uri"
                />
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

        {/* Submit Button */}
        <View style={styles.submitBar}>
          <AnimoButton
            label="Ipasa na"
            variant="primary"
            disabled={!canSubmit}
            loading={submitting}
            onPress={handleSubmit}
          />
        </View>
      </ScrollView>
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
  photoUpload: {
    borderRadius: AnimoRadius.lg,
    borderWidth: 1.5,
    borderColor: AnimoColors.accentPrimary,
    borderStyle: "dashed",
    backgroundColor: "rgba(200, 230, 201, 0.3)",
    paddingVertical: AnimoSpacing.xxl,
    alignItems: "center",
  },
  photoUploadIconWrap: {
    width: 60,
    height: 60,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  photoUploadTitle: {
    marginTop: AnimoSpacing.md,
  },
  photoUploadSubtext: {
    textAlign: "center",
    marginTop: AnimoSpacing.xs,
    paddingHorizontal: AnimoSpacing.lg,
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
    // backgroundColor: AnimoColors.surfacePrimary,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
