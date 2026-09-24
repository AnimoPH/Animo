import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloudRain, Info, Sprout } from "lucide-react-native";

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
} from "@/services/advisory-service";

const AdvisoryOrange = "#F57C00";
const HISTORY_PREVIEW_COUNT = 5;

function formatDateTime(iso: string, isTagalog: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isTagalog ? "fil-PH" : "en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatShortDate(dateStr: string, isTagalog: boolean): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(isTagalog ? "fil-PH" : "en-US", { month: "short", day: "numeric" });
}

function formatHoursAgo(iso: string, isTagalog: boolean): string {
  if (!iso) return "—";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
  if (isTagalog) {
    if (hours === 0) return "Kararaan lamang";
    return `${hours} oras ang nakaraan`;
  }
  if (hours === 0) return "Just now";
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

/** Payo sa Bukid — the active advisory's rationale (ripeness, rain forecast, data freshness) plus retained history. */
export default function AdvisoryDetailScreen() {
  const { t, language, isTagalog } = useLanguage();
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
            <View style={[styles.activeCard, styles.shadow]}>
              <View style={styles.activeStrip}>
                <AnimoText variant="tag" color={AnimoColors.white}>
                  {isTagalog ? "Kasalukuyang Payo" : "Current Advisory"}
                </AnimoText>
              </View>
              <View style={styles.activeBody}>
                <AnimoText variant="h2" color={AnimoColors.black}>
                  {actionLabel(current.advisory.recommendedAction, language)}
                </AnimoText>

                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    <Sprout size={20} color={AnimoColors.green} />
                    <AnimoText variant="h2" color={AnimoColors.black} style={styles.statValue}>
                      {Math.round(ripenessPct(current.advisory.plantingDate, current.advisory.riceTypeCategory) * 100)}%
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted} style={styles.statLabel}>
                      {isTagalog ? "Antas ng Pagkahinog" : "Ripeness Level"}
                    </AnimoText>
                  </View>
                  <View style={styles.statTile}>
                    <CloudRain size={20} color={AnimoColors.green} />
                    <AnimoText variant="h2" color={AnimoColors.black} style={styles.statValue}>
                      {current.advisory.precipitationMmH.toFixed(1)}
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted} style={styles.statLabel}>
                      {isTagalog ? "mm/h Inaasahang Ulan" : "mm/h Expected Rain"}
                    </AnimoText>
                  </View>
                </View>

                <View style={styles.freshnessRow}>
                  <View style={[styles.statusBadge, current.advisory.isStale && styles.statusBadgeStale]}>
                    <AnimoText variant="tag" color={current.advisory.isStale ? AdvisoryOrange : AnimoColors.green}>
                      {current.advisory.isStale ? (isTagalog ? "LUMA" : "STALE") : (isTagalog ? "SARIWA" : "FRESH")}
                    </AnimoText>
                  </View>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    {isTagalog ? "Huling na-update:" : "Last updated:"} {formatHoursAgo(current.advisory.forecastFetchedAt, isTagalog)}
                  </AnimoText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowDisclaimer((v) => !v)}
                  style={styles.disclaimerToggle}
                  hitSlop={8}>
                  <Info size={14} color={AnimoColors.muted} />
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    {isTagalog ? "Paano ito kinakalkula?" : "How is this computed?"}
                  </AnimoText>
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
              <View style={[styles.historyCard, styles.shadow]}>
                {visibleHistory.map((entry, i) => (
                  <PastAdvisoryRow
                    key={entry.advisoryId}
                    entry={entry}
                    showPlantingTag={showPlantingTag}
                    isLast={i === visibleHistory.length - 1}
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
  language: 'tl' | 'en';
}) {
  const isNoAction = entry.recommendedAction === "No_Action_Needed";
  const accentColor = isNoAction ? AnimoColors.green : AdvisoryOrange;

  return (
    <View style={[styles.pastRow, !isLast && styles.pastRowDivider]}>
      <View style={[styles.pastDot, { backgroundColor: accentColor }]} />
      <View style={styles.pastContent}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary} numberOfLines={1}>
          {actionLabel(entry.recommendedAction, language)}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {formatDateTime(entry.dateIssued, isTagalog)}
          {showPlantingTag && entry.plantingDate ? ` · ${isTagalog ? 'Tinanim' : 'Planted'} ${formatShortDate(entry.plantingDate, isTagalog)}` : ""}
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
  statsRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.md,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    textAlign: "center",
  },
  freshnessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  historyCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    marginHorizontal: AnimoSpacing.lg,
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
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  pastRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.surfaceTertiary,
  },
  pastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pastContent: {
    flex: 1,
    gap: 2,
  },
});
