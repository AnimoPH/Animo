import { router } from "expo-router";
import { ChevronLeft, CloudRain, Leaf } from "lucide-react-native";
import { FlatList, Pressable, StyleSheet, View, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";

const AdvisoryOrange = "#F57C00";

type AdvisoryType = "Rain Advisory" | "Care Tip";

type PastAdvisory = {
  id: string;
  type: AdvisoryType;
  date: string;
  description: string;
};

const PAST_ADVISORIES: PastAdvisory[] = [
  {
    id: "1",
    type: "Rain Advisory",
    date: "August 7, 2026",
    description: "I-cover ang Naaning Palay",
  },
  {
    id: "2",
    type: "Care Tip",
    date: "June 12, 2026",
    description: "Mag-ipon ng Binhi para sa Susunod na Tanim",
  },
  {
    id: "3",
    type: "Rain Advisory",
    date: "August 7, 2026",
    description: "I-cover ang Naaning Palay",
  },
  {
    id: "4",
    type: "Care Tip",
    date: "June 12, 2026",
    description: "Mag-ipon ng Binhi para sa Susunod na Tanim",
  },
];

/** Payo sa Bukid — advisory detail: active advisory plus a history of past advisories. */
export default function AdvisoryDetailScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
          accessibilityLabel="Bumalik"
        >
          <ChevronLeft size={24} color={AnimoColors.black} />
        </Pressable>
        <AnimoText variant="h3" color={AnimoColors.black}>
          Payo sa Bukid
        </AnimoText>
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={PAST_ADVISORIES}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={[styles.activeCard, styles.shadow]}>
              <View style={styles.activeStrip}>
                <AnimoText variant="tag" color={AnimoColors.white}>
                  Aktibong Advisory
                </AnimoText>
              </View>

              {/* advisory-banner.png isn't in the repo yet; falls back to a placeholder until the asset lands */}
              <View style={styles.imageArea}>
                <Image
                  source={require("../../../assets/images/animo/advisory-banner-maagang-ani.png")} // Replace 'advisory.png' with your file name
                  style={styles.image}
                  resizeMode="contain" // Use "cover" or "contain" depending on layout needs
                />
              </View>
              <View style={styles.activeBody}>
                <AnimoText variant="h2" color={AnimoColors.black}>
                  Inirerekomenda: Maagang Pag-aani
                </AnimoText>
                <AnimoText
                  variant="body"
                  color={AnimoColors.blackSecondary}
                  style={styles.activeDescription}
                >
                  Inaasahang malakas na ulan sa susunod na 3 araw mula sa PAGASA
                  forecast. Posibleng mapinsala ang hindi pa naaaning palay kung
                  hahayaan pa sa bukid.
                </AnimoText>
                <View style={styles.activeMetaRow}>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    August 7, 2026, 9:00 AM
                  </AnimoText>
                  <View style={styles.activeBadge}>
                    <AnimoText variant="tag" color={AnimoColors.white}>
                      Aktibo
                    </AnimoText>
                  </View>
                </View>
              </View>
            </View>

            <AnimoText
              variant="h3"
              color={AnimoColors.black}
              style={styles.sectionHeader}
            >
              Mga nakaraang payo
            </AnimoText>
          </>
        }
        renderItem={({ item }) => <PastAdvisoryRow advisory={item} />}
      />
    </SafeAreaView>
  );
}

function PastAdvisoryRow({ advisory }: { advisory: PastAdvisory }) {
  const isRainAdvisory = advisory.type === "Rain Advisory";
  const Icon = isRainAdvisory ? CloudRain : Leaf;
  const accentColor = isRainAdvisory ? AdvisoryOrange : AnimoColors.green;
  const iconBackground = isRainAdvisory ? "#FFF3E0" : AnimoColors.greenTint;

  return (
    <View style={[styles.pastRow, styles.shadow]}>
      <View style={[styles.pastIconWrap, { backgroundColor: iconBackground }]}>
        <Icon size={20} color={accentColor} />
      </View>
      <View style={styles.pastContent}>
        <View style={styles.pastTopRow}>
          <AnimoText variant="tag" color={accentColor}>
            {advisory.type}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            {advisory.date}
          </AnimoText>
        </View>
        <AnimoText
          variant="body"
          color={AnimoColors.blackSecondary}
          numberOfLines={1}
        >
          {advisory.description}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: AnimoSpacing.xxl,
  },
  shadow: {
    shadowColor: AnimoColors.black,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activeCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: AnimoSpacing.lg,
    marginTop: AnimoSpacing.lg,
    overflow: "hidden",
  },
  activeStrip: {
    backgroundColor: AdvisoryOrange,
    borderTopLeftRadius: AnimoRadius.lg,
    borderTopRightRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.md,
  },
  imageArea: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#FEF9EF",
    alignItems: "center",
    justifyContent: "center",
  },
  image:{
    width: "100%",
    height: "90%",
  },
  activeBody: {
    padding: AnimoSpacing.lg,
  },
  activeDescription: {
    marginTop: AnimoSpacing.sm,
  },
  activeMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: AnimoSpacing.md,
  },
  activeBadge: {
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  sectionHeader: {
    marginHorizontal: AnimoSpacing.lg,
    marginTop: AnimoSpacing.xl,
    marginBottom: AnimoSpacing.md,
  },
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    marginHorizontal: AnimoSpacing.lg,
    marginBottom: AnimoSpacing.sm,
    padding: AnimoSpacing.md,
  },
  pastIconWrap: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pastContent: {
    flex: 1,
    marginLeft: AnimoSpacing.md,
    gap: 2,
  },
  pastTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
