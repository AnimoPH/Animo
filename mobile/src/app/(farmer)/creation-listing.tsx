import { router, type Href } from "expo-router";
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

const SCREEN_PADDING = AnimoSpacing.lg;

const VARIETY_OPTIONS = [
  { value: "inbred", label: "Inbred" },
  { value: "hybrid", label: "Hybrid" },
  { value: "tradisyonal", label: "Tradisyonal o Pamana" },
  { value: "halo-halo", label: "Halo-halong Uri" },
  { value: "iba-pa", label: "Iba pa" },
];

const PURITY_OPTIONS = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
  { value: "walang-grado", label: "Walang Grado" },
];

const MOISTURE_OPTIONS: { value: "Dry" | "Wet"; label: string }[] = [
  { value: "Dry", label: "Tuyo (Dry)" },
  { value: "Wet", label: "Basa (Wet)" },
];

/** Gumawa ng Listing — farmer creates a new palay listing: photo, quality, weight. */
export default function PalayListingScreen() {
  const [variety, setVariety] = useState("");
  const [customVariety, setCustomVariety] = useState("");
  const [moistureType, setMoistureType] = useState<"Dry" | "Wet">("Dry");
  const [purityGrade, setPurityGrade] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const netWeight = Math.max(
    0,
    (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0),
  );

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
              onChange={setVariety}
            />
            {variety === "iba-pa" ? (
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
            onChange={setPurityGrade}
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

        {/* Submit Button */}
        <View style={styles.submitBar}>
          <AnimoButton
            label="Ipasa na"
            variant="primary"
            onPress={() =>
              router.push("/(farmer)/listing-uploading" as Href)
            }
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
