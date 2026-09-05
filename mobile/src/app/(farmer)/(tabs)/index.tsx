import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChevronRight,
  Clock,
  CloudRain,
  LayoutGrid,
  ListChecks,
  ShoppingCart,
  Sprout,
  User,
  Wheat,
} from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import {
  SpotlightTour,
  type SpotlightStep,
  FARMER_TUTORIAL_STORAGE_KEY,
} from '@/components/animo/spotlight-tour';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  fetchFarmerHomeData,
  type FarmerHomeActivity,
  type FarmerHomeStats,
} from '@/services/farmer-home-service';

const AdvisoryOrange = '#F57C00';

const EMPTY_STATS: FarmerHomeStats = {
  activeListings: 0,
  pendingRequests: 0,
  pendingTransactions: 0,
};

/** Tahanan — farmer home: weather advisory, quick stats, sell CTA, activity feed. */
export default function FarmerHomeScreen() {
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ startTour?: string }>();
  const [hasActiveAdvisory] = useState(true);
  const [stats, setStats] = useState<FarmerHomeStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<FarmerHomeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Spotlight target refs
  const advisoryRef = useRef<View>(null);
  const statsRef = useRef<View>(null);
  const ctaRef = useRef<View>(null);
  const bellRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchFarmerHomeData();
      setStats(data.stats);
      setActivities(data.activities);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang dashboard.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Check query param trigger (e.g. from Profile > Settings > Gabay)
      if (params.startTour === 'true') {
        setShowTutorial(true);
      } else {
        // Check first-time farmer tutorial flag
        AsyncStorage.getItem(FARMER_TUTORIAL_STORAGE_KEY)
          .then((seen) => {
            if (!seen) {
              setShowTutorial(true);
            }
          })
          .catch(() => {});
      }

      load(false);
    }, [load, params.startTour]),
  );

  const statCards = [
    {
      key: 'listings',
      icon: ListChecks,
      value: stats.activeListings,
      label: t('farmer.activeListings'),
      onPress: () => router.push('/(farmer)/(tabs)/palengke'),
    },
    {
      key: 'requests',
      icon: ShoppingCart,
      value: stats.pendingRequests,
      label: t('farmer.newRequests'),
      onPress: () => router.push('/(farmer)/(tabs)/transaksyon'),
    },
    {
      key: 'transactions',
      icon: Clock,
      value: stats.pendingTransactions,
      label: t('farmer.pendingTxns'),
      onPress: () => router.push('/(farmer)/(tabs)/transaksyon'),
    },
  ];

  const farmerTourSteps: SpotlightStep[] = [
    {
      id: 'farmer-advisory',
      title: t('spotlight.farmer.step1Title'),
      description: t('spotlight.farmer.step1Desc'),
      icon: CloudRain,
      targetRef: advisoryRef,
      shape: 'rectangle',
      borderRadius: 20,
      padding: 6,
    },
    {
      id: 'farmer-stats',
      title: t('spotlight.farmer.step2Title'),
      description: t('spotlight.farmer.step2Desc'),
      icon: LayoutGrid,
      targetRef: statsRef,
      shape: 'rectangle',
      borderRadius: 16,
      padding: 6,
    },
    {
      id: 'farmer-sell-cta',
      title: t('spotlight.farmer.step3Title'),
      description: t('spotlight.farmer.step3Desc'),
      icon: Sprout,
      targetRef: ctaRef,
      shape: 'rectangle',
      borderRadius: 20,
      padding: 6,
    },
    {
      id: 'farmer-bell',
      title: t('spotlight.farmer.step4Title'),
      description: t('spotlight.farmer.step4Desc'),
      icon: Bell,
      targetRef: bellRef,
      shape: 'circle',
      padding: 6,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader
        bellRef={bellRef}
        onPressBell={() => router.push('/(farmer)/notipikasyon')}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
        {hasActiveAdvisory ? (
          <View ref={advisoryRef} collapsable={false}>
            <AdvisoryCard
              title={t('farmer.advisoryTitle')}
              badge={t('farmer.advisoryBadge')}
              tip={t('farmer.advisoryTip')}
              desc={t('farmer.advisoryDesc')}
              onPress={() => router.push('/(farmer)/advisory')}
            />
          </View>
        ) : null}

        <View ref={statsRef} collapsable={false} style={styles.statsRow}>
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

        <View ref={ctaRef} collapsable={false}>
          <CtaBanner
            title={t('farmer.sellCtaTitle')}
            subtitle={t('farmer.sellCtaSubtitle')}
            onPress={() => router.push('/(farmer)/(tabs)/palengke')}
          />
        </View>

        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              {t('farmer.activities')}
            </AnimoText>
            <Pressable
              onPress={() => router.push('/(farmer)/(tabs)/transaksyon')}
              hitSlop={8}>
              <AnimoText variant="caption" color={AnimoColors.green}>
                {t('common.seeAll')}
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
              {t('farmer.noActivities')}
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

      {/* GCash-style Interactive Spotlight Tour for Farmers */}
      <SpotlightTour
        visible={showTutorial}
        role="magsasaka"
        steps={farmerTourSteps}
        scrollViewRef={scrollViewRef}
        onClose={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

function AdvisoryCard({
  title,
  badge,
  tip,
  desc,
  onPress,
}: {
  title: string;
  badge: string;
  tip: string;
  desc: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.advisoryCard}>
      <View style={styles.advisoryTopRow}>
        <View style={styles.advisoryTopLeft}>
          <CloudRain size={18} color={AnimoColors.white} />
          <AnimoText variant="h3" color={AnimoColors.white}>
            {title}
          </AnimoText>
        </View>
        <View style={styles.advisoryBadge}>
          <AnimoText
            variant="tag"
            color={AnimoColors.white}
            style={styles.advisoryBadgeText}>
            {badge}
          </AnimoText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.advisoryInner,
          pressed && styles.pressed,
        ]}>
        <View style={styles.advisoryIconWrap}>
          <CloudRain size={24} color={AnimoColors.muted} />
        </View>
        <View style={styles.advisoryTextWrap}>
          <AnimoText variant="bodyEmphasis" color={AdvisoryOrange}>
            {tip}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.muted} numberOfLines={2}>
            {desc}
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
      style={({ pressed }) => [styles.statCard, pressed && styles.pressed]}>
      <Icon size={20} color={AnimoColors.green} />
      {loading ? (
        <ActivityIndicator
          color={AnimoColors.green}
          size="small"
          style={styles.statSpinner}
        />
      ) : (
        <AnimoText
          variant="h2"
          color={AnimoColors.black}
          style={styles.statValue}>
          {value}
        </AnimoText>
      )}
      <AnimoText
        variant="caption"
        color={AnimoColors.textMediumEmphasis}
        style={styles.statLabel}
        numberOfLines={2}>
        {label}
      </AnimoText>
    </Pressable>
  );
}

function CtaBanner({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ctaBanner, pressed && styles.pressed]}>
      <View style={styles.ctaIconWrap}>
        <Wheat size={22} color={AnimoColors.green} />
      </View>
      <View style={styles.ctaTextWrap}>
        <AnimoText variant="h3" color={AnimoColors.white}>
          {title}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.white} numberOfLines={1}>
          {subtitle}
        </AnimoText>
      </View>
      <ChevronRight size={20} color={AnimoColors.white} />
    </Pressable>
  );
}

function ActivityRow({ activity }: { activity: FarmerHomeActivity }) {
  const handlePress = () => {
    if (activity.stage === 'request_pending') {
      router.push({
        pathname: '/(farmer)/listing-detail',
        params: { id: activity.id, tab: 'orders' },
      });
      return;
    }
    router.push({ pathname: '/(farmer)/transaksyon/[id]', params: { id: activity.id } });
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}>
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
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  advisoryTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  advisoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisoryTextWrap: {
    flex: 1,
    gap: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.sm,
  },
  statCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.14)',
  },
  statValue: {
    marginTop: 2,
    fontSize: 22,
    lineHeight: 26,
  },
  statSpinner: {
    marginTop: 2,
    height: 26,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 11.5,
    lineHeight: 15,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextWrap: {
    flex: 1,
    gap: 2,
  },
  activitySection: {
    gap: AnimoSpacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityLoading: {
    alignItems: 'center',
    paddingVertical: AnimoSpacing.lg,
  },
  activityList: {
    gap: AnimoSpacing.md,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextWrap: {
    flex: 1,
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
  },
});
