import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fil-PH", { year: "numeric", month: "long", day: "numeric" });
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

                <View style={styles.rationaleTable}>
                  <RationaleRow
                    label="Antas ng Pagkahinog"
                    value={`${Math.round(ripenessPct(current.advisory.plantingDate, current.advisory.riceTypeCategory) * 100)}%`}
                  />
                  <RationaleRow
                    label="Inaasahang Ulan"
                    value={`${current.advisory.precipitationMmH.toFixed(1)} mm/h`}
                  />
                  <RationaleRow label="Huling Na-update" value={formatHoursAgo(current.advisory.forecastFetchedAt)} />
                  <View style={styles.rationaleRow}>
                    <AnimoText variant="caption" color={AnimoColors.muted}>
                      Katayuan ng Datos
                    </AnimoText>
                    <View style={[styles.statusBadge, current.advisory.isStale && styles.statusBadgeStale]}>
                      <AnimoText variant="tag" color={current.advisory.isStale ? AdvisoryOrange : AnimoColors.green}>
                        {current.advisory.isStale ? "LUMA" : "SARIWA"}
                      </AnimoText>
                    </View>
                  </View>
                </View>

                <AnimoText variant="caption" color={AnimoColors.muted} style={styles.disclaimer}>
                  Batay ito sa isang simpleng panuntunan (antas ng pagkahinog + inaasahang ulan), hindi isang AI
                  prediction. Hindi rin ito sumasalamin sa kondisyon ng lupa o pagbaha sa bukid.
                </AnimoText>
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
            history.map((entry) => <PastAdvisoryRow key={entry.advisoryId} entry={entry} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RationaleRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rationaleRow}>
      <AnimoText variant="caption" color={AnimoColors.muted}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {value}
      </AnimoText>
    </View>
  );
}

function PastAdvisoryRow({ entry }: { entry: AdvisoryHistoryEntry }) {
  const isNoAction = entry.recommendedAction === "No_Action_Needed";
  const accentColor = isNoAction ? AnimoColors.green : AdvisoryOrange;

  return (
    <View style={[styles.pastRow, styles.shadow]}>
      <View style={[styles.pastDot, { backgroundColor: accentColor }]} />
      <View style={styles.pastContent}>
        <AnimoText variant="body" color={AnimoColors.blackSecondary} numberOfLines={1}>
          {actionLabel(entry.recommendedAction)}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {formatDateTime(entry.dateIssued)}
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
    gap: AnimoSpacing.sm,
  },
  rationaleTable: {
    marginTop: AnimoSpacing.sm,
  },
  rationaleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: AnimoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.surfaceTertiary,
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
  disclaimer: {
    marginTop: AnimoSpacing.sm,
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
  pastRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    marginHorizontal: AnimoSpacing.lg,
    marginBottom: AnimoSpacing.sm,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
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
