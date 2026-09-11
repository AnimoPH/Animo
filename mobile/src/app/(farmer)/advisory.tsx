import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CloudRain, Info, Sprout } from "lucide-react-native";

import { ScreenHeader } from "@/components/animo/screen-header";
import { AnimoText } from "@/components/animo/animo-text";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fil-PH", { year: "numeric", month: "long", day: "numeric" });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fil-PH", { month: "short", day: "numeric" });
}

function formatHoursAgo(iso: string): string {
  if (!iso) return "—";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
  if (hours === 0) return "Kararaan lamang";
  return `${hours} oras ang nakaraan`;
}

/** Payo sa Bukid — the active advisory's rationale (ripeness, rain forecast, data freshness) plus retained history. */
export default function AdvisoryDetailScreen() {
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
      setError(e instanceof Error ? e.message : "Hindi ma-load ang payo.");
    } finally {
      setLoading(false);
    }
  }, []);

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
      <ScreenHeader title="Payo sa Bukid" />

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
                  Kasalukuyang Payo
                </AnimoText>
              </View>
              <View style={styles.activeBody}>
                <AnimoText variant="h2" color={AnimoColors.black}>
                  {actionLabel(current.advisory.recommendedAction)}
                </AnimoText>

                <View style={styles.statsRow}>
                  <View style={styles.statTile}>
                    <Sprout size={20} color={AnimoColors.green} />
                    <AnimoText variant="h2" color={AnimoColors.black} style={styles.statValue}>
                      {Math.round(ripenessPct(current.advisory.plantingDate, current.advisory.riceTypeCategory) * 100)}%
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted} style={styles.statLabel}>
                      Antas ng Pagkahinog
                    </AnimoText>
                  </View>
                  <View style={styles.statTile}>
                    <CloudRain size={20} color={AnimoColors.green} />
                    <AnimoText variant="h2" color={AnimoColors.black} style={styles.statValue}>
                      {current.advisory.precipitationMmH.toFixed(1)}
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted} style={styles.statLabel}>
                      mm/h Inaasahang Ulan
                    </AnimoText>
                  </View>
                </View>

                <View style={styles.freshnessRow}>
                  <View style={[styles.statusBadge, current.advisory.isStale && styles.statusBadgeStale]}>
                    <AnimoText variant="tag" color={current.advisory.isStale ? AdvisoryOrange : AnimoColors.green}>
                      {current.advisory.isStale ? "LUMA" : "SARIWA"}
                    </AnimoText>
                  </View>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Huling na-update: {formatHoursAgo(current.advisory.forecastFetchedAt)}
                  </AnimoText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowDisclaimer((v) => !v)}
                  style={styles.disclaimerToggle}
                  hitSlop={8}>
                  <Info size={14} color={AnimoColors.muted} />
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Paano ito kinakalkula?
                  </AnimoText>
                </Pressable>
                {showDisclaimer ? (
                  <AnimoText variant="caption" color={AnimoColors.muted} style={styles.disclaimer}>
                    Batay ito sa isang simpleng panuntunan (antas ng pagkahinog + inaasahang ulan), hindi isang AI
                    prediction. Hindi rin ito sumasalamin sa kondisyon ng lupa o pagbaha sa bukid.
                  </AnimoText>
                ) : null}
              </View>
            </View>
          ) : current?.kind === "awaiting_advisory" ? (
            <View style={[styles.activeCard, styles.shadow, styles.emptyCard]}>
              <AnimoText variant="body" color={AnimoColors.muted} style={styles.centerText}>
                Naitala na ang iyong taniman. Hinihintay ang susunod na pagsusuri ng panahon — makakatanggap ka ng
                babala sa loob ng ilang oras.
              </AnimoText>
            </View>
          ) : (
            <View style={[styles.activeCard, styles.shadow, styles.emptyCard]}>
              <AnimoText variant="body" color={AnimoColors.muted} style={styles.centerText}>
                Wala pang aktibong payo. Kailangan munang maitala ang iyong taniman.
              </AnimoText>
            </View>
          )}

          <AnimoText variant="h3" color={AnimoColors.black} style={styles.sectionHeader}>
            Mga nakaraang payo
          </AnimoText>

          {history.length === 0 ? (
            <AnimoText variant="body" color={AnimoColors.muted} style={styles.emptyHistoryText}>
              Wala pang naitalang payo.
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
                  />
                ))}
              </View>

              {history.length > HISTORY_PREVIEW_COUNT ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowAllHistory((v) => !v)}
                  style={styles.viewAllButton}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    {showAllHistory ? "Ipakita ang Kaunti" : "Tingnan Lahat"}
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
}: {
  entry: AdvisoryHistoryEntry;
  showPlantingTag: boolean;
  isLast: boolean;
}) {
  const isNoAction = entry.recommendedAction === "No_Action_Needed";
  const accentColor = isNoAction ? AnimoColors.green : AdvisoryOrange;

  return (
    <View style={[styles.pastRow, !isLast && styles.pastRowDivider]}>
      <View style={[styles.pastDot, { backgroundColor: accentColor }]} />
      <View style={styles.pastContent}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary} numberOfLines={1}>
          {actionLabel(entry.recommendedAction)}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {formatDateTime(entry.dateIssued)}
          {showPlantingTag && entry.plantingDate ? ` · Tinanim ${formatShortDate(entry.plantingDate)}` : ""}
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
