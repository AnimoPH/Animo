import { router, Stack, useLocalSearchParams, type Href } from "expo-router";
import { StyleSheet, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Info } from "lucide-react-native";
import { ScreenHeader } from "@/components/animo/screen-header";
import { ProgressSteps } from "@/components/animo/farmer/progress-steps";
import { AnimoText } from "@/components/animo/animo-text";
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
} from "@/constants/animo";
import { AnimoButton } from "@/components/animo/animo-button";
import { formatPeso } from "@/constants/marketplace";

/** Resulta ng Listing — shown after "Ipasa na" creates the listing; price comes from the server-locked `computed_price_per_kg`. */
export default function ListingResultScreen() {
  const { price } = useLocalSearchParams<{ listingId?: string; price?: string }>();
  const pricePerKg = price ? parseFloat(price) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="Gumawa ng Listing" />

      {/* Progress Bar */}
      <ProgressSteps currentStep={2} />

      <View style={styles.content}>
        <View style={styles.topContainer}>
          {/* Image Banner */}
          <View style={styles.photoArea}>
            <Image
              source={require("@/assets/images/animo/approved-banner.png")}
              style={styles.image}
            />
          </View>

          {/* Approved Text */}
          <View style={styles.approvedText}>
            <AnimoText variant="h1" color={AnimoColors.accentPrimary}>
              Congrats! Naaprubahan.
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
              Pasok sa pamantayan ang iyong palay.
            </AnimoText>
          </View>
        </View>

        {/* Price Card */}
        <View style={styles.cardPrice}>
          <AnimoText
            variant="h3"
            color={AnimoColors.textMediumEmphasis}
            style={styles.title}
          >
            Inirerekomendang Presyo
          </AnimoText>

          <AnimoText variant="display" color={AnimoColors.accentPrimary}>
            {pricePerKg !== null ? `${formatPeso(pricePerKg)}/kg` : "Kinakalkula..."}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
            LOCKED AT BEST MARKETPLACE
          </AnimoText>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Info
            size={16}
            color={AnimoColors.textLowEmphasis}
            style={styles.infoIcon}
          />
          <AnimoText
            variant="caption"
            color={AnimoColors.textLowEmphasis}
            style={styles.infoText}
          >
            Ang iyong listahan ay aktibo na at makikita na ng mga mamimili sa
            Palengke.
          </AnimoText>
        </View>

        {/* Submit Button */}
        <View style={styles.submitBar}>
          <AnimoButton
            label="Tignan ang Palengke"
            variant="primary"
            onPress={() => router.push("/(farmer)/(tabs)/palengke" as Href)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 18,
    backgroundColor: AnimoColors.appBackground,
    padding: AnimoSpacing.lg,
  },
  topContainer: {
    gap: 10,
  },
  approvedText: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: AnimoSpacing.md,
  },
  body: {
    textAlign: "center",
    // paddingHorizontal: SCREEN_PADDING,
  },
  photoArea: {
    width: "100%",
    aspectRatio: 16 / 9,
    // backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  cardPrice: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoColors.surfacePrimary,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.xl,
    width: "100%",
    borderWidth: 1,
    borderRadius: 24,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  infoCard: {
    flexDirection: "row",
    // gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoColors.surfaceSecondary,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.lg,
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  infoText: {
    flex: 1,
  },
  infoIcon: {
    marginRight: 8,
  },
  submitBar: {
    // backgroundColor: AnimoColors.surfacePrimary,
    width: "100%",
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
});
