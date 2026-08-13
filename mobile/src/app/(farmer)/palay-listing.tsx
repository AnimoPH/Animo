import { router } from "expo-router";
import {
  Camera,
  Check,
  ChevronLeft,
  Clock,
  ShoppingBasket,
} from "lucide-react-native";
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
import { LabeledInput } from "@/components/animo/labeled-input";
import { SelectField } from "@/components/animo/select-field";
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

const MOISTURE_OPTIONS: { key: "Dry" | "Wet"; label: string }[] = [
  { key: "Dry", label: "Tuyo (Dry)" },
  { key: "Wet", label: "Basa (Wet)" },
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
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Bumalik"
        >
          <ChevronLeft size={24} color={AnimoColors.textHighEmphasis} />
        </Pressable>
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
          Gumawa ng Listing
        </AnimoText>
      </View>

      <ProgressSteps />

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

          <MoistureToggle value={moistureType} onChange={setMoistureType} />

          <SelectField
            label="Kalinisan (Purity Grade)"
            placeholder="Pumili ng kalinisan ng palay"
            options={PURITY_OPTIONS}
            value={purityGrade || null}
            onChange={setPurityGrade}
          />
        </View>

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
      </ScrollView>

      <View style={styles.submitBar}>
        <AnimoButton
          label="Ipasa na"
          variant="primary"
          onPress={() => console.log("Ipasa na pressed")}
        />
      </View>
    </SafeAreaView>
  );
}

function ProgressSteps() {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleDone]}>
          <Check size={14} color={AnimoColors.objectHighEmphasisInverse} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textAccentPrimary}
          style={styles.stepLabel}
        >
          Gumawa
        </AnimoText>
      </View>

      <View style={[styles.stepConnector, styles.stepConnectorDone]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleUpcoming]}>
          <Clock size={14} color={AnimoColors.objectLowEmphasis} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textLowEmphasis}
          style={styles.stepLabel}
        >
          Sinusuri
        </AnimoText>
      </View>

      <View style={[styles.stepConnector, styles.stepConnectorUpcoming]} />

      <View style={styles.stepItem}>
        <View style={[styles.stepCircle, styles.stepCircleUpcoming]}>
          <ShoppingBasket size={14} color={AnimoColors.objectLowEmphasis} />
        </View>
        <AnimoText
          variant="caption"
          color={AnimoColors.textLowEmphasis}
          style={styles.stepLabel}
        >
          Available
        </AnimoText>
      </View>
    </View>
  );
}

function MoistureToggle({
  value,
  onChange,
}: {
  value: "Dry" | "Wet";
  onChange: (value: "Dry" | "Wet") => void;
}) {
  return (
    <View>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
        Moisture %
      </AnimoText>
      <View style={styles.moistureRow}>
        {MOISTURE_OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.key)}
              style={[
                styles.moistureOption,
                selected
                  ? styles.moistureOptionSelected
                  : styles.moistureOptionUnselected,
              ]}
            >
              <View
                style={[
                  styles.moistureRadio,
                  selected && styles.moistureRadioSelected,
                ]}
              >
                {selected ? <View style={styles.moistureRadioDot} /> : null}
              </View>
              <AnimoText
                variant="bodyEmphasis"
                color={
                  selected
                    ? AnimoColors.accentPrimary
                    : AnimoColors.textMediumEmphasis
                }
              >
                {option.label}
              </AnimoText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function NetWeightField({ value }: { value: number }) {
  return (
    <View>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
        Kabuuan (Net Weight)
      </AnimoText>
      <View style={styles.netWeightField}>
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: AnimoSpacing.md,
  },
  stepItem: {
    alignItems: "center",
    width: 72,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: AnimoRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  stepCircleUpcoming: {
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  stepLabel: {
    marginTop: AnimoSpacing.xs,
    textAlign: "center",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginTop: 13,
  },
  stepConnectorDone: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  stepConnectorUpcoming: {
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xxl,
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
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.md,
    gap: AnimoSpacing.lg,
  },
  introBody: {
    marginTop: AnimoSpacing.xs,
  },
  photoUpload: {
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.md,
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
  moistureRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.sm,
  },
  moistureOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
    width: "auto",
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1.5,
  },
  moistureOptionSelected: {
    borderColor: AnimoColors.accentPrimary,
    // backgroundColor: AnimoColors,
  },
  moistureOptionUnselected: {
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  moistureRadio: {
    width: 16,
    height: 16,
    borderRadius: AnimoRadius.pill,
    borderWidth: 2,
    borderColor: AnimoColors.borderLowEmphasis,
    alignItems: "center",
    justifyContent: "center",
  },
  moistureRadioSelected: {
    borderColor: AnimoColors.accentPrimary,
  },
  moistureRadioDot: {
    width: 8,
    height: 8,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
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
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
