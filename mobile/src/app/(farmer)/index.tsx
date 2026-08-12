import { router } from "expo-router";
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
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimoText } from "@/components/animo/animo-text";
import { AppHeader } from "@/components/animo/app-header";
import { AnimoColors, AnimoSpacing, AnimoRadius } from "@/constants/animo";

const AdvisoryOrange = "#F57C00";

type Activity = {
  id: string;
  buyer: string;
  variety: string;
  weight: string;
  amount: string;
};

const ACTIVITIES: Activity[] = [
  {
    id: "1",
    buyer: "Aling Coring Rice Mill",
    variety: "RC 638 SR",
    weight: "200 kg",
    amount: "₱2,000.00",
  },
  {
    id: "2",
    buyer: "Tres Rice Corp",
    variety: "RC 638 SR",
    weight: "200 kg",
    amount: "₱4,000.00",
  },
  {
    id: "3",
    buyer: "Tres Rice Corp",
    variety: "RC 638 SR",
    weight: "200 kg",
    amount: "₱4,000.00",
  },
];

type StatDefinition = {
  key: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: number;
  label: string;
  onPress: () => void;
};

const STATS: StatDefinition[] = [
  {
    key: "listings",
    icon: ListChecks,
    value: 2,
    label: "Aktibong Listahan",
    onPress: () => router.push("/(farmer)/listings"),
  },
  {
    key: "requests",
    icon: ShoppingCart,
    value: 5,
    label: "Bagong Kahilingan",
    onPress: () => router.push("/(farmer)/transaksyon"),
  },
  {
    key: "transactions",
    icon: Clock,
    value: 3,
    label: "Nakabinbing Transaksyon",
    onPress: () => router.push("/(farmer)/transaksyon"),
  },
];

/** Tahanan — farmer home: weather advisory, quick stats, sell CTA, activity feed. */
export default function FarmerHomeScreen() {
  const [hasActiveAdvisory] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <AppHeader onPressBell={() => console.log("Bell pressed")} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {hasActiveAdvisory ? (
          <AdvisoryCard
            onPress={() => console.log("Navigate to advisory detail")}
          />
        ) : null}

        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <StatCard
              key={stat.key}
              icon={stat.icon}
              value={stat.value}
              label={stat.label}
              onPress={stat.onPress}
            />
          ))}
        </View>

        <CtaBanner onPress={() => router.push("/(farmer)/listings")} />

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Mga Aktibidad
            </AnimoText>
            <Pressable
              onPress={() => console.log("Tignan lahat pressed")}
              hitSlop={8}
            >
              <AnimoText variant="caption" color={AnimoColors.green}>
                Tignan Lahat
              </AnimoText>
            </Pressable>
          </View>

          <View style={styles.activityList}>
            {ACTIVITIES.map((activity, index) => (
              <View key={activity.id}>
                <ActivityRow activity={activity} />
                {index < ACTIVITIES.length - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))}
          </View>
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
        onPress={() => router.push("/(farmer)/advisory")}
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
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  value: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}
    >
      <Icon size={22} color={AnimoColors.green} />
      <AnimoText
        variant="h1"
        color={AnimoColors.black}
        style={styles.statValue}
      >
        {value}
      </AnimoText>
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

function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <View style={styles.activityRow}>
      <View style={styles.avatar}>
        <User size={20} color={AnimoColors.green} />
      </View>
      <View style={styles.activityTextWrap}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          Bagong Kahilingan mula sa {activity.buyer}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {activity.variety} {activity.weight}
        </AnimoText>
      </View>
      <AnimoText variant="price" color={AnimoColors.black}>
        {activity.amount}
      </AnimoText>
    </View>
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
  activityList: {
    gap: AnimoSpacing.xs,
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
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
  },
});
