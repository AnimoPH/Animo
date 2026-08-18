import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ChevronRight,
  Clock,
  CloudRain,
  ListChecks,
  ShoppingCart,
  User,
  Wheat,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { AppHeader } from "@/components/animo/app-header";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";
import {
  fetchFarmerHomeData,
  type FarmerHomeActivity,
  type FarmerHomeStats,
} from "@/services/farmer-home-service";

const AdvisoryOrange = "#F57C00";

const EMPTY_STATS: FarmerHomeStats = {
  activeListings: 0,
  pendingRequests: 0,
  pendingTransactions: 0,
};

/** Tahanan — farmer home: weather advisory, quick stats, sell CTA, activity feed. */
export default function FarmerHomeScreen() {
  const [hasActiveAdvisory] = useState(true);
  const [stats, setStats] = useState<FarmerHomeStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<FarmerHomeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmerHomeData();
      setStats(data.stats);
      setActivities(data.activities);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hindi ma-load ang dashboard.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  const statCards = [
    {
      key: "listings",
      icon: ListChecks,
      value: stats.activeListings,
      label: "Aktibong Listahan",
      onPress: () => router.push("/(farmer)/(tabs)/palengke"),
    },
    {
      key: "requests",
      icon: ShoppingCart,
      value: stats.pendingRequests,
      label: "Bagong Kahilingan",
      onPress: () => router.push("/(farmer)/(tabs)/transaksyon"),
    },
    {
      key: "transactions",
      icon: Clock,
      value: stats.pendingTransactions,
      label: "Nakabinbing Transaksyon",
      onPress: () => router.push("/(farmer)/(tabs)/transaksyon"),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader onPressBell={() => router.push("/(farmer)/notipikasyon")} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
      >
        {hasActiveAdvisory ? (
          <AdvisoryCard
            onPress={() => router.push("/(farmer)/advisory")}
          />
        ) : null}

        <View style={styles.statsRow}>
          {statCards.map((stat) => (
            <StatCard
              key={stat.key}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              loading={loading}
              onPress={stat.onPress}
            />
          ))}
        </View>

        <CtaBanner onPress={() => router.push("/(farmer)/(tabs)/palengke")} />

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Mga Aktibidad
            </AnimoText>
            <Pressable
              onPress={() => router.push("/(farmer)/(tabs)/transaksyon")}
              hitSlop={8}
            >
              <AnimoText variant="caption" color={AnimoColors.green}>
                Tignan Lahat
              </AnimoText>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.activityLoading}>
              <ActivityIndicator color={AnimoColors.green} />
            </View>
          ) : error ? (
            <AnimoText variant="caption" color={AnimoColors.danger}>
              {error}
            </AnimoText>
          ) : activities.length === 0 ? (
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Walang aktibidad pa. Maglista ng palay para magsimula.
            </AnimoText>
          ) : (
            <View style={styles.activityList}>
              {activities.map((activity, index) => (
                <View key={`${activity.id}-${index}`}>
                  <ActivityRow activity={activity} />
                  {index < activities.length - 1 ? (
                    <View style={styles.divider} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AdvisoryCard({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.advisoryCard}>
      <View style={styles.advisoryTopRow}>
        <View style={styles.advisoryTopLeft}>
          <CloudRain size={18} color={AnimoColors.white} />
          <AnimoText variant="h3" color={AnimoColors.white}>
            Payo sa Bukid
          </AnimoText>
        </View>
        <View style={styles.advisoryBadge}>
          <AnimoText
            variant="tag"
            color={AnimoColors.white}
            style={styles.advisoryBadgeText}
          >
            ADVISORY
          </AnimoText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.advisoryInner,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.advisoryIconWrap}>
          <CloudRain size={26} color={AnimoColors.muted} />
        </View>
        <View style={styles.advisoryTextWrap}>
          <AnimoText variant="bodyEmphasis" color={AdvisoryOrange}>
            Tip: Maagang Pag-aani
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted}>
            Inaasahang malakas na ulan sa susunod na 3 araw dulot ng monsoon.
          </AnimoText>
        </View>
        <ChevronRight size={18} color={AnimoColors.muted} />
      </Pressable>
    </View>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  loading,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: number;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
    >
      <Icon size={22} color={AnimoColors.green} />
      {loading ? (
        <ActivityIndicator
          color={AnimoColors.green}
          size="small"
          style={styles.statSpinner}
        />
      ) : (
        <AnimoText
          variant="h1"
          color={AnimoColors.black}
          style={styles.statValue}
        >
          {value}
        </AnimoText>
      )}
      <AnimoText
        variant="caption"
        color={AnimoColors.muted}
        style={styles.statLabel}
      >
        {label}
      </AnimoText>
    </Pressable>
  );
}

function CtaBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ctaBanner, pressed && styles.pressed]}
    >
      <View style={styles.ctaIconWrap}>
        <Wheat size={22} color={AnimoColors.green} />
      </View>
      <View style={styles.ctaTextWrap}>
        <AnimoText variant="h3" color={AnimoColors.white}>
          Ibenta ang aking Palay
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.white}>
          Magsimulang ilista ang iyong ani ngayon
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.white} />
    </Pressable>
  );
}

function ActivityRow({ activity }: { activity: FarmerHomeActivity }) {
  const handlePress = () => {
    if (activity.stage === "request_pending") {
      router.push({
        pathname: "/(farmer)/listing-detail",
        params: { id: activity.id, tab: "orders" },
      });
      return;
    }
    router.push({ pathname: "/(farmer)/transaksyon/[id]", params: { id: activity.id } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <User size={20} color={AnimoColors.green} />
      </View>
      <View style={styles.activityTextWrap}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black} numberOfLines={1}>
          {activity.buyer}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {activity.variety} · {activity.weight}
        </AnimoText>
      </View>
      <AnimoText variant="h3" color={AnimoColors.accentPrimary}>
        {activity.amount}
      </AnimoText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.white,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.lg,
  },
  pressed: {
    opacity: 0.9,
  },
  advisoryCard: {
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  advisoryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advisoryTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.sm,
  },
  advisoryBadge: {
    backgroundColor: AdvisoryOrange,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  advisoryBadgeText: {
    letterSpacing: 0.5,
  },
  advisoryInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  advisoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  advisoryTextWrap: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: AnimoSpacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.lg,
    paddingHorizontal: AnimoSpacing.xs,
    alignItems: "center",
    gap: AnimoSpacing.xs,
    borderWidth: 1,
    borderColor: "rgba(46, 125, 50, 0.12)",
  },
  statValue: {
    marginTop: 2,
  },
  statSpinner: {
    marginTop: 2,
    height: 32,
  },
  statLabel: {
    textAlign: "center",
  },
  ctaBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTextWrap: {
    flex: 1,
    gap: 2,
  },
  activitySection: {
    gap: AnimoSpacing.md,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityLoading: {
    alignItems: "center",
    paddingVertical: AnimoSpacing.lg,
  },
  activityList: {
    gap: AnimoSpacing.md,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.greenTint,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTextWrap: {
    flex: 1,
    gap: 5,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
  },
});
