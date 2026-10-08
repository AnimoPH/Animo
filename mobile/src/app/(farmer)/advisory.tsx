import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, CloudRain, RotateCcw, Sprout, type LucideIcon } from "lucide-react-native";

import { AnimoText } from "@/components/animo/animo-text";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import { BackHeader } from "@/components/animo/back-header";
import { useLanguage } from "@/hooks/use-language";
import {
  actionLabel,
  fetchAdvisoryHistory,
  fetchCurrentAdvisory,
  ripenessPct,
  type AdvisoryHistoryEntry,
  type AdvisoryState,
  type RecommendedAction,
} from "@/services/advisory-service";

const AdvisoryOrange = "#F57C00";
const HISTORY_PREVIEW_COUNT = 5;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ADVISORY_BANNERS: Record<RecommendedAction, ImageSourcePropType> = {
  No_Action_Needed: require("@/assets/images/animo/advisory1-walang-kailangang-gawin.jpg"),
  Advance_Cut: require("@/assets/images/animo/advisory2-maagang-anihin.jpg"),
  Delayed_Harvest: require("@/assets/images/animo/advisory3-antalahin-anihan.jpg"),
};

const HISTORY_ICONS: Record<RecommendedAction, LucideIcon> = {
  No_Action_Needed: Sprout,
  Delayed_Harvest: RotateCcw,
  Advance_Cut: CloudRain,
};

function formatIssuedAt(iso: string, isTagalog: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(isTagalog ? "fil-PH" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHistoryDate(iso: string, isTagalog: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isTagalog ? "fil-PH" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function historyLabel(action: RecommendedAction, language: "tl" | "en"): string {
  if (action === "No_Action_Needed") {
    return language === "en" ? "No action needed" : "Walang kailangang gawin";
  }
  return actionLabel(action, language);
}

function formatShortDate(dateStr: string, isTagalog: boolean): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isTagalog ? "fil-PH" : "en-US", { month: "short", day: "numeric" });
}

/** Payo sa Bukid — the active advisory's rationale (ripeness, rain forecast, data freshness) plus retained history. */
export default function AdvisoryDetailScreen() {
  const { language, isTagalog } = useLanguage();
  const [current, setCurrent] = useState<AdvisoryState | null>(null);
  const [history, setHistory] = useState<AdvisoryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentResult, historyResult] = await Promise.all([fetchCurrentAdvisory(), fetchAdvisoryHistory()]);
      setCurrent(currentResult);
      setHistory(historyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isTagalog ? "Hindi ma-load ang payo." : "Could not load advisory."));
    } finally {
      setLoading(false);
    }
  }, [isTagalog]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Only tag rows with their planting once a farmer actually has more than
  // one — otherwise it's a redundant label on every single entry.
  const showPlantingTag = new Set(history.map((h) => h.cropcycleId)).size > 1;
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <BackHeader title={isTagalog ? "Payo sa Bukid" : "Farm Advisory"} />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.danger}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {current?.kind === "active" ? (
            <ActiveAdvisoryCard
              advisory={current.advisory}
              isTagalog={isTagalog}
              language={language}
              showDisclaimer={showDisclaimer}
              onToggleDisclaimer={() => setShowDisclaimer((v) => !v)}
            />
          ) : current?.kind === "awaiting_advisory" ? (
            <View style={[styles.activeCard, styles.shadow, styles.emptyCard]}>
              <AnimoText variant="body" color={AnimoColors.muted} style={styles.centerText}>
                {isTagalog
                  ? "Naitala na ang iyong taniman. Hinihintay ang susunod na pagsusuri ng panahon — makakatanggap ka ng babala sa loob ng ilang oras."
                  : "Your planting is recorded. Awaiting the next weather cycle analysis — you will receive an advisory within a few hours."}
              </AnimoText>
            </View>
          ) : (
            <View style={[styles.activeCard, styles.shadow, styles.emptyCard]}>
              <AnimoText variant="body" color={AnimoColors.muted} style={styles.centerText}>
                {isTagalog
                  ? "Wala pang aktibong payo. Kailangan munang maitala ang iyong taniman."
                  : "No active advisory yet. Your planting needs to be recorded first."}
              </AnimoText>
            </View>
          )}

          <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionHeader}>
            {isTagalog ? "Mga nakaraang payo" : "Past Advisories"}
          </AnimoText>

          {history.length === 0 ? (
            <AnimoText variant="body" color={AnimoColors.muted} style={styles.emptyHistoryText}>
              {isTagalog ? "Wala pang naitalang payo." : "No advisory history recorded."}
            </AnimoText>
          ) : (
            <>
              <View style={styles.historyList}>
                {visibleHistory.map((entry, index) => (
                  <PastAdvisoryRow
                    key={entry.advisoryId}
                    entry={entry}
                    showPlantingTag={showPlantingTag}
                    isLast={index === visibleHistory.length - 1}
                    isTagalog={isTagalog}
                    language={language}
                  />
                ))}
              </View>

              {history.length > HISTORY_PREVIEW_COUNT ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAllHistory((v) => !v)}
                  style={styles.viewAllButton}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    {showAllHistory
                      ? (isTagalog ? "Ipakita ang Kaunti" : "Show Less")
                      : (isTagalog ? "Tingnan Lahat" : "View All")}
                  </AnimoText>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ActiveAdvisoryCard({
  advisory,
  isTagalog,
  language,
  showDisclaimer,
  onToggleDisclaimer,
}: {
  advisory: Extract<AdvisoryState, { kind: "active" }>["advisory"];
  isTagalog: boolean;
  language: "tl" | "en";
  showDisclaimer: boolean;
  onToggleDisclaimer: () => void;
}) {
  const issuedAt = advisory.forecastFetchedAt || advisory.dateIssued;
  const rainIsHeavy = advisory.recommendedAction !== "No_Action_Needed";
  const chevronTurn = useRef(new Animated.Value(showDisclaimer ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chevronTurn, {
      toValue: showDisclaimer ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chevronTurn, showDisclaimer]);

  const toggleDisclaimer = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggleDisclaimer();
  };

  return (
    <View style={[styles.activeCard, styles.shadow]}>
      <View style={styles.activeStrip}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
          {isTagalog ? "Kasalukuyang Payo" : "Current Advisory"}
        </AnimoText>
      </View>
      <View style={styles.activeBody}>
        <View style={styles.metaRow}>
          <AnimoText variant="caption" color={AnimoColors.muted} style={styles.metaDate}>
            {formatIssuedAt(issuedAt, isTagalog)}
          </AnimoText>
          <View style={[styles.statusBadge, advisory.isStale && styles.statusBadgeStale]}>
            <AnimoText variant="tag" color={advisory.isStale ? AdvisoryOrange : AnimoColors.green}>
              {advisory.isStale ? (isTagalog ? "Luma" : "Stale") : (isTagalog ? "Sariwa" : "Fresh")}
            </AnimoText>
          </View>
        </View>

        <AnimoText variant="h2" color={AnimoColors.black}>
          {isTagalog ? "Inirerekomenda: " : "Recommended: "}
          {actionLabel(advisory.recommendedAction, language)}
        </AnimoText>

        <Image source={ADVISORY_BANNERS[advisory.recommendedAction]} style={styles.banner} resizeMode="cover" />

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
              <View style={styles.statTileIcon}>
              <Sprout size={20} color={AnimoColors.muted} />
            </View>
            <View>
              <AnimoText variant="tag" color={AnimoColors.muted} style={styles.statLabel}>
                {isTagalog ? "Antas ng Pagkahinog" : "Ripeness Level"}
              </AnimoText>
              <AnimoText variant="h1" color={AnimoColors.black} style={styles.statValue}>
                {Math.round(ripenessPct(advisory.plantingDate, advisory.riceTypeCategory) * 100)}%
              </AnimoText>
            </View>
          </View>
          <View style={styles.statTile}>
            <View style={styles.statTileIcon}>
              <CloudRain size={20} color={AnimoColors.muted} />
            </View>
            <View>
              <AnimoText variant="tag" color={AnimoColors.muted} style={styles.statLabel}>
                {isTagalog ? "Inaasahang Ulan" : "Expected Rain"}
              </AnimoText>
              <AnimoText variant="h2" color={rainIsHeavy ? AdvisoryOrange : AnimoColors.black} style={styles.statValue}>
                {advisory.precipitationMmH.toFixed(1)}
              </AnimoText>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={toggleDisclaimer}
          style={styles.disclaimerToggle}
          hitSlop={8}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.disclaimerLabel}>
            {isTagalog ? "Paano ito kinakalkula?" : "How is this computed?"}
          </AnimoText>
          <Animated.View
            style={[
              styles.disclaimerChevron,
              {
                transform: [
                  {
                    rotate: chevronTurn.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "180deg"],
                    }),
                  },
                ],
              },
            ]}>
            <ChevronDown size={18} color={AnimoColors.muted} />
          </Animated.View>
        </Pressable>
        {showDisclaimer ? (
          <AnimoText variant="caption" color={AnimoColors.muted} style={styles.disclaimer}>
            {isTagalog
              ? "Batay ito sa isang simpleng panuntunan (antas ng pagkahinog + inaasahang ulan), hindi isang AI prediction. Hindi rin ito sumasalamin sa kondisyon ng lupa o pagbaha sa bukid."
              : "Based on agricultural guidelines (ripeness level + expected precipitation), not an AI prediction. Does not reflect soil condition or field flooding."}
          </AnimoText>
        ) : null}
      </View>
    </View>
  );
}

function PastAdvisoryRow({
  entry,
  showPlantingTag,
  isLast,
  isTagalog,
  language,
}: {
  entry: AdvisoryHistoryEntry;
  showPlantingTag: boolean;
  isLast: boolean;
  isTagalog: boolean;
  language: "tl" | "en";
}) {
  const Icon = HISTORY_ICONS[entry.recommendedAction] ?? Sprout;

  return (
    <View style={[styles.pastRow, !isLast && styles.pastRowDivider]}>
      <View style={styles.pastIconWrap}>
        <Icon size={18} color={AnimoColors.muted} />
      </View>
      <View style={styles.pastContent}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {historyLabel(entry.recommendedAction, language)}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {formatHistoryDate(entry.dateIssued, isTagalog)}
          {showPlantingTag && entry.plantingDate ? ` · ${isTagalog ? "Tinanim" : "Planted"} ${formatShortDate(entry.plantingDate, isTagalog)}` : ""}
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: AnimoSpacing.xl },
  centerText: { textAlign: "center" },
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
    borderWidth: 1,
    borderColor: AnimoColors.border,
    marginHorizontal: AnimoSpacing.lg,
    marginTop: AnimoSpacing.lg,
    overflow: "hidden",
  },
  emptyCard: {
    padding: AnimoSpacing.xl,
    alignItems: "center",
  },
  activeStrip: {
    backgroundColor: AdvisoryOrange,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.md,
  },
  activeBody: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AnimoSpacing.sm,
  },
  metaDate: {
    flex: 1,
  },
  banner: {
    width: "100%",
    height: 168,
    borderRadius: AnimoRadius.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
  },
  statTile: {
    flex: 1,
    // flexDirection: "row",
    alignItems: "flex-start",
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.white,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.lg,
    // alignItems: "flex-",
  },
  statTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",  
  },
  statValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    textAlign: "center",
  },
  statusBadge: {
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  statusBadgeStale: {
    backgroundColor: "#FFF3E0",
  },
  disclaimerToggle: {
    position: "relative",
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.lg,
    // alignItems: "center",
    justifyContent: "center",
  },
  disclaimerLabel: {
    textAlign: "left",
  },
  disclaimerChevron: {
    position: "absolute",
    right: AnimoSpacing.md,
  },
  disclaimer: {
    lineHeight: 18,
  },
  sectionHeader: {
    marginHorizontal: AnimoSpacing.lg,
    marginTop: AnimoSpacing.xl,
    marginBottom: AnimoSpacing.md,
  },
  emptyHistoryText: {
    marginHorizontal: AnimoSpacing.lg,
  },
  historyList: {
    marginHorizontal: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    overflow: "hidden",
  },
  viewAllButton: {
    alignItems: "center",
    paddingVertical: AnimoSpacing.md,
    marginHorizontal: AnimoSpacing.lg,
  },
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AnimoColors.white,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  pastRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.border,
  },
  pastIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  pastContent: {
    flex: 1,
    gap: 2,
  },
});
