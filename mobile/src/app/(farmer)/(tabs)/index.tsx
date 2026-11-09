import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Bell,
  ChevronRight,
  Clock,
  CloudRain,
  MapPin,
  Sprout,
  Sun,
  Wheat,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import {
  SpotlightTour,
  type SpotlightStep,
  FARMER_TUTORIAL_STORAGE_KEY,
} from '@/components/animo/spotlight-tour';
import { SuspensionNotice } from '@/components/animo/suspension-notice';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { EmphasisText } from '@/components/animo/ui/emphasis-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { ProgressBar } from '@/components/animo/ui/progress-bar';
import { SeeAllLink } from '@/components/animo/ui/see-all-link';
import { StatusPill } from '@/components/animo/ui/status-pill';
import {
  AnimoV2Colors,
  AnimoV2Radius,
  AnimoV2Size,
  AnimoV2Spacing,
  AnimoV2Status,
  type StatusTone,
} from '@/constants/animo';
import { barangayLabel } from '@/constants/profile-options';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import {
  fetchCurrentAdvisory,
  ripenessPct,
  type AdvisoryState,
  type CurrentAdvisory,
  type RecommendedAction,
} from '@/services/advisory-service';
import {
  fetchFarmerHomeData,
  type FarmerHomeActivity,
  type FarmerHomeStats,
} from '@/services/farmer-home-service';
import { fetchUnreadNotificationCount } from '@/services/notification-service';
import { getDisplayStageLabel, isFarmerNeedsActionStage } from '@/types/transaction';
import type { TranslationKey } from '@/i18n/translations';

const EMPTY_STATS: FarmerHomeStats = {
  activeListings: 0,
  pendingRequests: 0,
  pendingTransactions: 0,
};

/** How many recent activities Tahanan shows (DESIGN_SPEC: the last two). */
const ACTIVITY_LIMIT = 2;

/** The three rule-engine states mapped to v2 status tones and icons. */
const ADVISORY_STYLE: Record<
  RecommendedAction,
  { tone: StatusTone; icon: LucideIcon; titleKey: TranslationKey; descKey: TranslationKey }
> = {
  Advance_Cut: {
    tone: 'caution',
    icon: CloudRain,
    titleKey: 'home.advisory.advanceCut.title',
    descKey: 'home.advisory.advanceCut.desc',
  },
  Delayed_Harvest: {
    tone: 'warning',
    icon: Clock,
    titleKey: 'home.advisory.delayedHarvest.title',
    descKey: 'home.advisory.delayedHarvest.desc',
  },
  No_Action_Needed: {
    tone: 'success',
    icon: Sun,
    titleKey: 'home.advisory.noAction.title',
    descKey: 'home.advisory.noAction.desc',
  },
};

/** Tahanan: farmer home with the greeting hero, Payo sa Bukid, sell CTA and recent activity. */
export default function FarmerHomeScreen() {
  const { t, language } = useLanguage();
  const { account } = useSession();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ startTour?: string }>();
  const [currentAdvisory, setCurrentAdvisory] = useState<AdvisoryState | null>(null);
  const [stats, setStats] = useState<FarmerHomeStats>(EMPTY_STATS);
  const [activities, setActivities] = useState<FarmerHomeActivity[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  // Spotlight target refs
  const advisoryRef = useRef<View>(null);
  const ctaRef = useRef<View>(null);
  const bellRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const load = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [data, advisory] = await Promise.all([fetchFarmerHomeData(), fetchCurrentAdvisory()]);
        setStats(data.stats);
        setActivities(data.activities);
        setCurrentAdvisory(advisory);
      } catch (e) {
        setError(e instanceof Error ? e.message : t('home.loadError'));
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [t],
  );

  const loadUnread = useCallback(() => {
    fetchUnreadNotificationCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
      loadUnread();
    }, [load, loadUnread]),
  );

  useAutoRefresh(
    useCallback(() => {
      load(true);
      loadUnread();
    }, [load, loadUnread]),
  );

  // Shown once, until the tour is finished or skipped. Profile can clear the
  // flag so the next visit to this home plays it again.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (params.startTour === 'true') {
        setShowTutorial(true);
      } else {
        AsyncStorage.getItem(FARMER_TUTORIAL_STORAGE_KEY).then((seen) => {
          if (active) setShowTutorial(seen !== 'true');
        });
      }
      return () => {
        active = false;
      };
    }, [params.startTour]),
  );

  const farmerTourSteps: SpotlightStep[] = [
    {
      id: 'farmer-advisory',
      title: t('spotlight.farmer.step1Title'),
      description: t('spotlight.farmer.step1Desc'),
      icon: CloudRain,
      targetRef: advisoryRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.xl,
      padding: 6,
    },
    {
      id: 'farmer-sell-cta',
      title: t('spotlight.farmer.step3Title'),
      description: t('spotlight.farmer.step3Desc'),
      icon: Sprout,
      targetRef: ctaRef,
      shape: 'rectangle',
      borderRadius: AnimoV2Radius.xl,
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

  const fullName = account?.fullName?.trim() || t('role.farmer');
  /** Greet with the first name only — the full name overflowed the header and truncated. */
  const firstName = fullName.split(/\s+/)[0] || fullName;
  const namedBarangay = barangayLabel(account?.barangay);
  const location = namedBarangay
    ? `${namedBarangay.startsWith('Brgy.') ? namedBarangay : `Brgy. ${namedBarangay}`}, Antipolo`
    : 'Antipolo, Rizal';
  /**
   * One alarm at a time: when the advisory itself is amber/orange, activity rows that need action
   * drop their warm frame so two different warm signals aren't competing side by side.
   */
  const advisoryIsWarm =
    currentAdvisory?.kind === 'active' &&
    ADVISORY_STYLE[currentAdvisory.advisory.recommendedAction].tone !== 'success';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        {/* Hero: extends under the status bar */}
        <View style={[styles.hero, { paddingTop: insets.top + AnimoV2Spacing.lg }]}>
          <View style={styles.greetingRow}>
            <Mascot size={52} tile={false} />
            <View style={styles.flex}>
              <AnimoText variant="title" color={AnimoV2Colors.textOnBrand} numberOfLines={1} accessibilityRole="header">
                {t('home.greeting', { name: firstName })}
              </AnimoText>
              <View style={styles.locationRow}>
                <MapPin size={14} color={AnimoV2Colors.brandLight} strokeWidth={2.75} />
                <AnimoText
                  variant="captionV2"
                  color={AnimoV2Colors.brandLight}
                  numberOfLines={1}
                  style={styles.flex}>
                  {location}
                </AnimoText>
              </View>
            </View>
            <View ref={bellRef} collapsable={false}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  unread > 0 ? t('home.bellLabel', { count: unread }) : t('home.bellLabelNone')
                }
                onPress={() => router.push('/(farmer)/notipikasyon')}
                style={styles.bell}>
                <Bell size={26} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                {unread > 0 ? <View style={styles.bellDot} /> : null}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          <SuspensionNotice />

          <View style={styles.section}>
            <SectionHeading title={t('farmer.advisoryTitle')} />
            <View ref={advisoryRef} collapsable={false}>
              {currentAdvisory?.kind === 'active' ? (
                <AdvisoryCard
                  advisory={currentAdvisory.advisory}
                  onPress={() => router.push('/(farmer)/advisory')}
                />
              ) : currentAdvisory?.kind === 'awaiting_advisory' ? (
                <InfoAdvisoryCard
                  icon={Clock}
                  title={t('home.advisory.pendingTitle')}
                  body={t('home.advisory.pendingDesc')}
                  onPress={() => router.push('/(farmer)/advisory')}
                />
              ) : (
                <InfoAdvisoryCard
                  icon={CloudRain}
                  title={t('home.advisory.emptyTitle')}
                  body={t('home.advisory.emptyDesc')}
                  actionLabel={t('home.advisory.emptyCta')}
                  onPress={() => router.push('/(farmer)/itala-taniman' as Href)}
                />
              )}
            </View>
          </View>

          {/* Sell prompt: a line of copy and the one solid-green button, no card of its own. */}
          <View ref={ctaRef} collapsable={false} style={styles.ctaSection}>
            <View style={styles.ctaCopy}>
              <AnimoText variant="bodyStrong">{t('home.ctaHeading')}</AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('home.ctaBody')}
              </AnimoText>
            </View>
            <ChunkyButton
              label={t('farmer.sellCtaTitle')}
              icon={Wheat}
              onPress={() => router.push('/(farmer)/(tabs)/palengke')}
            />
          </View>

          <View style={styles.section}>
            <SectionHeading
              title={t('farmer.activities')}
              action={
                activities.length > 0 ? (
                  <SeeAllLink
                    label={t('farmer.activitiesView')}
                    onPress={() => router.push('/(farmer)/(tabs)/transaksyon')}
                  />
                ) : null
              }
            />

            {loading ? (
              <View style={styles.activityLoading}>
                <ActivityIndicator color={AnimoV2Colors.actionPrimary} accessibilityLabel={t('common.loading')} />
              </View>
            ) : error ? (
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
                {error}
              </AnimoText>
            ) : activities.length === 0 ? (
              <View style={styles.emptyBlock}>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                  {t('farmer.noActivities')}
                </AnimoText>
              </View>
            ) : (
              <View style={styles.activityList}>
                {activities.slice(0, ACTIVITY_LIMIT).map((activity, index) => (
                  <ActivityRow
                    key={`${activity.id}-${index}`}
                    activity={activity}
                    lang={language}
                    softenAlert={advisoryIsWarm}
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* GCash-style Interactive Spotlight Tour for Farmers */}
      <SpotlightTour
        visible={showTutorial}
        role="magsasaka"
        steps={farmerTourSteps}
        scrollViewRef={scrollViewRef}
        storageKey={FARMER_TUTORIAL_STORAGE_KEY}
        onClose={() => {
          setShowTutorial(false);
          AsyncStorage.setItem(FARMER_TUTORIAL_STORAGE_KEY, 'true').catch(() => {});
          // Drop the replay flag, otherwise coming back to this tab would
          // re-open the tour because startTour is still on the route.
          if (params.startTour === 'true') {
            router.setParams({ startTour: undefined });
          }
          // Guided next step, not a thing to stumble on later: matches
          // the tour's own "here's what this is" intent for a farmer who
          // has never logged a planting yet. Not shown once they've already
          // planted, even if the advisory itself is still pending.
          if (!loading && currentAdvisory?.kind === 'no_cropcycle') {
            router.push('/(farmer)/itala-taniman' as Href);
          }
        }}
      />
    </View>
  );
}

/** Section label, and its optional trailing link. Shared by Payo sa Bukid and Mga Aktibidad. */
function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeading}>
      <AnimoText variant="heading" accessibilityRole="header" style={styles.flex}>
        {title}
      </AnimoText>
      {action}
    </View>
  );
}

/** First and last initial, for the activity avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${parts[0][0]}${last}`.toUpperCase();
}

/** Active Payo sa Bukid card: tinted bg, 2px colored border, 64px solid icon tile, ripeness bar. */
function AdvisoryCard({ advisory, onPress }: { advisory: CurrentAdvisory; onPress: () => void }) {
  const { t } = useLanguage();
  const style = ADVISORY_STYLE[advisory.recommendedAction];
  const tone = AnimoV2Status[style.tone];
  const ripeness = ripenessPct(advisory.plantingDate, advisory.riceTypeCategory);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('home.advisory.open')} ${t(style.titleKey)}`}
      onPress={onPress}
      style={[styles.advisoryCard, { backgroundColor: tone.bg, borderColor: tone.solid }]}>
      {/* The title carries the state's own text color (never the bright solid): that colored
          title plus the tinted field is what makes an amber/orange advisory read at a glance. */}
      <View style={styles.advisoryTop}>
        <IconTile icon={style.icon} tone={style.tone} size={64} solid shape="rounded" />
        <AnimoText variant="heading" color={tone.fg} style={styles.flex}>
          {t(style.titleKey)}
        </AnimoText>
        <ChevronRight size={24} color={tone.fg} strokeWidth={2.75} />
      </View>
      <EmphasisText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
        {t(style.descKey)}
      </EmphasisText>
      <View style={styles.advisoryMeter}>
        <View style={styles.advisoryMeterLabels}>
          <AnimoText variant="bodyStrong">
            {t('home.advisory.ripeness', { pct: Math.round(ripeness * 100) })}
          </AnimoText>
          <AnimoText variant="bodyStrong" color={tone.fg}>
            {t('home.advisory.rain', { mm: advisory.precipitationMmH.toFixed(1) })}
          </AnimoText>
        </View>
        <ProgressBar value={ripeness} height={14} fill={tone.solid} track={AnimoV2Colors.surfaceCard} />
      </View>
    </Pressable>
  );
}

/** Advisory placeholder for "no planting logged" and "awaiting the next weather analysis". */
function InfoAdvisoryCard({
  icon,
  title,
  body,
  actionLabel,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onPress: () => void;
}) {
  // Same slot and same left-aligned structure as the active card, so the advisory never jumps
  // between layouts. The dashed edge reads as "nothing here yet" without adding another color.
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.advisoryEmptyCard}>
      <View style={styles.advisoryTop}>
        <IconTile icon={icon} tone="neutral" size={64} shape="rounded" />
        <AnimoText variant="heading" style={styles.flex}>
          {title}
        </AnimoText>
        {/* Chevron only when there is no button: one affordance per action. */}
        {actionLabel ? null : (
          <ChevronRight size={24} color={AnimoV2Colors.textTertiary} strokeWidth={2.75} />
        )}
      </View>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
        {body}
      </AnimoText>
      {actionLabel ? (
        <ChunkyButton variant="secondary" label={actionLabel} onPress={onPress} style={styles.fullWidth} />
      ) : null}
    </Pressable>
  );
}

function ActivityRow({
  activity,
  lang,
  softenAlert,
}: {
  activity: FarmerHomeActivity;
  lang: 'tl' | 'en';
  /** Drop the warm frame: the advisory above is already carrying a warm state. */
  softenAlert: boolean;
}) {
  const stageLabel = getDisplayStageLabel(activity.stage, lang);
  const needsAction = isFarmerNeedsActionStage(activity.stage);
  const framed = needsAction && !softenAlert;

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
    <DepthCard
      depth="flat"
      radius="lg"
      onPress={handlePress}
      borderColor={framed ? AnimoV2Colors.warningSolid : AnimoV2Colors.borderDefault}
      accessibilityLabel={`${activity.buyer}, ${activity.variety}, ${activity.weight}, ${activity.amount}, ${stageLabel}`}
      style={styles.activityRow}>
      <View style={styles.activityAvatar}>
        <AnimoText variant="bodyStrong" color={AnimoV2Colors.textSecondary}>
          {initials(activity.buyer)}
        </AnimoText>
      </View>
      <View style={styles.activityBody}>
        <View style={styles.activityTopRow}>
          <AnimoText variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {activity.buyer}
          </AnimoText>
          <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
            {activity.amount}
          </AnimoText>
        </View>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} numberOfLines={1}>
          {activity.variety} · {activity.weight}
          {needsAction ? '' : ` · ${stageLabel}`}
        </AnimoText>
        {/* A row that needs the farmer grows a pill, so it is taller than a settled one. */}
        {needsAction ? <StatusPill tone="warning" label={stageLabel} /> : null}
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  scrollContent: { paddingBottom: AnimoV2Spacing.xxl },
  flex: { flex: 1 },
  fullWidth: { alignSelf: 'stretch' },
  centerText: { textAlign: 'center' },
  hero: {
    backgroundColor: AnimoV2Colors.surfaceBrand,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.lg,
    borderBottomLeftRadius: AnimoV2Radius.xl,
    borderBottomRightRadius: AnimoV2Radius.xl,
    overflow: 'hidden',
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  bell: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceCard,
  },
  body: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.xl,
  },
  section: { gap: AnimoV2Spacing.md },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
  },
  advisoryCard: {
    borderRadius: AnimoV2Radius.xl,
    borderWidth: 2,
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  advisoryTop: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  advisoryMeter: { gap: AnimoV2Spacing.xs },
  advisoryMeterLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: AnimoV2Spacing.sm },
  /** Advisory placeholder: same shape as the active card, dashed so it reads as an unfilled slot. */
  advisoryEmptyCard: {
    borderRadius: AnimoV2Radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: AnimoV2Colors.borderDefault,
    backgroundColor: AnimoV2Colors.surfaceCard,
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  emptyBlock: {
    borderRadius: AnimoV2Radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: AnimoV2Colors.borderDefault,
    paddingVertical: AnimoV2Spacing.xl,
    paddingHorizontal: AnimoV2Spacing.lg,
  },
  ctaSection: { gap: AnimoV2Spacing.md },
  ctaCopy: { gap: 2 },
  activityLoading: { alignItems: 'center', paddingVertical: AnimoV2Spacing.lg },
  activityList: { gap: AnimoV2Spacing.md },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityBody: { flex: 1, minWidth: 0, gap: AnimoV2Spacing.xs, alignItems: 'flex-start' },
  activityTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: AnimoV2Spacing.sm,
    alignSelf: 'stretch',
  },
});
