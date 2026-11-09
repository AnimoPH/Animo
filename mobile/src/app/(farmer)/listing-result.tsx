import { router, useLocalSearchParams, type Href } from "expo-router";
import { Lock } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { ChunkyButton } from "@/components/animo/ui/chunky-button";
import { Confetti } from "@/components/animo/ui/confetti";
import { Mascot } from "@/components/animo/ui/mascot";
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from "@/constants/animo";
import { formatPeso } from "@/constants/marketplace";
import { useLanguage } from "@/hooks/use-language";

/**
 * Success screen shown after publishing. The price is the server-locked
 * `computed_price_per_kg`, passed in by the uploading screen.
 */
export default function ListingResultScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { listingId, price } = useLocalSearchParams<{ listingId?: string; price?: string }>();
  const pricePerKg = price ? parseFloat(price) : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + AnimoV2Spacing.xxxl, paddingBottom: AnimoV2Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}>
        <Mascot size={128} />
        <View style={styles.textBlock}>
          <AnimoText variant="title" style={styles.center} accessibilityRole="header">
            {t("wizV2.resultTitle")}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.center}>
            {t("wizV2.resultSub")}
          </AnimoText>
        </View>

        <View style={styles.reveal}>
          <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
            {t("wizV2.fairPrice")}
          </AnimoText>
          <AnimoText variant="priceHero" color={AnimoV2Colors.textOnBrand} style={styles.center}>
            {pricePerKg !== null ? `${formatPeso(pricePerKg)}${t("aniV2.perKg")}` : t("wizV2.calculating")}
          </AnimoText>
          <View style={styles.lockedRow}>
            <Lock size={16} color={AnimoV2Colors.textOnBrand} strokeWidth={3} />
            <AnimoText variant="captionV2" color={AnimoV2Colors.textOnBrand}>
              {t("listing.priceWhyLockedLabel")}
            </AnimoText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + AnimoV2Spacing.md }]}>
        <ChunkyButton
          label={t("wizV2.viewListing")}
          onPress={() =>
            listingId
              ? router.push({ pathname: "/(farmer)/listing-detail", params: { id: listingId } })
              : router.push("/(farmer)/(tabs)/palengke" as Href)
          }
        />
        <ChunkyButton
          label={t("wizV2.backToAni")}
          variant="secondary"
          onPress={() => router.push("/(farmer)/(tabs)/palengke" as Href)}
        />
      </View>

      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  content: {
    flexGrow: 1,
    alignItems: "center",
    gap: AnimoV2Spacing.lg,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  textBlock: { gap: AnimoV2Spacing.sm, alignItems: "center" },
  center: { textAlign: "center" },
  reveal: {
    width: "100%",
    alignItems: "center",
    gap: AnimoV2Spacing.sm,
    padding: 20,
    backgroundColor: AnimoV2Colors.surfaceBrand,
    borderRadius: AnimoV2Radius.xl,
    borderBottomWidth: 6,
    borderBottomColor: AnimoV2Colors.actionPrimaryDepth,
  },
  lockedRow: { flexDirection: "row", alignItems: "center", gap: AnimoV2Spacing.sm },
  footer: { paddingHorizontal: AnimoV2Spacing.lg, paddingTop: AnimoV2Spacing.md, gap: AnimoV2Spacing.md },
});
