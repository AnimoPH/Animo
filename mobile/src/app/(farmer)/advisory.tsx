import { router, useFocusEffect } from 'expo-router';
import { ChevronDown, ChevronUp, Clock, CloudRain, Sprout, Sun, type LucideIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { ProgressBar } from '@/components/animo/ui/progress-bar';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import {
  AnimoV2Colors,
  AnimoV2Radius,
  AnimoV2Size,
  AnimoV2Spacing,
  AnimoV2Status,
  type StatusTone,
} from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  actionLabel,
  fetchAdvisoryHistory,
  fetchCurrentAdvisory,
  ripenessPct,
  type AdvisoryHistoryEntry,
  type AdvisoryState,
  type RecommendedAction,
} from '@/services/advisory-service';

const HISTORY_PREVIEW_COUNT = 5;
const BANNER_HEIGHT = 168;

const ADVISORY_BANNERS: Record<RecommendedAction, ImageSourcePropType> = {
  No_Action_Needed: require('@/assets/images/animo/advisory1-walang-kailangang-gawin.jpg'),
  Advance_Cut: require('@/assets/images/animo/advisory2-maagang-anihin.jpg'),
  Delayed_Harvest: require('@/assets/images/animo/advisory3-antalahin-anihan.jpg'),
};

/** The three rule-engine states mapped to v2 tones and icons. */
const ADVISORY_STYLE: Record<RecommendedAction, { tone: StatusTone; icon: LucideIcon }> = {
  Advance_Cut: { tone: 'caution', icon: CloudRain },
  Delayed_Harvest: { tone: 'warning', icon: Clock },
  No_Action_Needed: { tone: 'success', icon: Sun },
};

function formatIssuedAt(iso: string, isTagalog: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(isTagalog ? 'fil-PH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatHistoryDate(iso: string, isTagalog: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function historyLabel(action: RecommendedAction, language: 'tl' | 'en'): string {
  if (action === 'No_Action_Needed') {
    return language === 'en' ? 'No action needed' : 'Walang kailangang gawin';
  }
  return actionLabel(action, language);
}

function formatShortDate(dateStr: string, isTagalog: boolean): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(isTagalog ? 'fil-PH' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** Payo sa Bukid: the active advisory's rationale (ripeness, rain forecast, data freshness) plus retained history. */
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
      const [currentResult, historyResult] = await Promise.all([
        fetchCurrentAdvisory(),
        fetchAdvisoryHistory(),
      ]);
      setCurrent(currentResult);
      setHistory(historyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('adv.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Only tag rows with their planting once a farmer actually has more than
  // one, otherwise it's a redundant label on every single entry.
  const showPlantingTag = new Set(history.map((h) => h.cropcycleId)).size > 1;
  const visibleHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW_COUNT);

  return (
    <View style={styles.screen}>
      <V2BackHeader title={t('farmer.advisoryTitle')} onBack={() => router.back()} backLabel={t('common.back')} />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} accessibilityLabel={t('common.loading')} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.centerText}>
            {error}
          </AnimoText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {current?.kind === 'active' ? (
            <ActiveAdvisoryCard
              advisory={current.advisory}
              isTagalog={isTagalog}
              language={language}
              showDisclaimer={showDisclaimer}
              onToggleDisclaimer={() => setShowDisclaimer((v) => !v)}
            />
          ) : (
            <DepthCard style={styles.emptyCard}>
              <IconTile icon={current?.kind === 'awaiting_advisory' ? Clock : CloudRain} tone="success" size={64} shape="rounded" />
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                {current?.kind === 'awaiting_advisory' ? t('adv.awaiting') : t('adv.none')}
              </AnimoText>
            </DepthCard>
          )}

          <AnimoText variant="heading" accessibilityRole="header" style={styles.sectionHeader}>
            {t('adv.past')}
          </AnimoText>

          {history.length === 0 ? (
            <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
              {t('adv.pastEmpty')}
            </AnimoText>
          ) : (
            <>
              <View style={styles.historyList}>
                {visibleHistory.map((entry) => (
                  <PastAdvisoryRow
                    key={entry.advisoryId}
                    entry={entry}
                    showPlantingTag={showPlantingTag}
                    isTagalog={isTagalog}
                    language={language}
                    plantedLabel={t('adv.planted')}
                  />
                ))}
              </View>

              {history.length > HISTORY_PREVIEW_COUNT ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showAllHistory ? t('adv.showLess') : t('adv.viewAll')}
                  onPress={() => setShowAllHistory((v) => !v)}
                  style={styles.viewAllButton}>
                  <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                    {showAllHistory ? t('adv.showLess') : t('adv.viewAll')}
                  </AnimoText>
                </Pressable>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function ActiveAdvisoryCard({
  advisory,
  isTagalog,
  language,
  showDisclaimer,
  onToggleDisclaimer,
}: {
  advisory: Extract<AdvisoryState, { kind: 'active' }>['advisory'];
  isTagalog: boolean;
  language: 'tl' | 'en';
  showDisclaimer: boolean;
  onToggleDisclaimer: () => void;
}) {
  const { t } = useLanguage();
  const issuedAt = advisory.forecastFetchedAt || advisory.dateIssued;
  const style = ADVISORY_STYLE[advisory.recommendedAction];
  const tone = AnimoV2Status[style.tone];
  const ripeness = ripenessPct(advisory.plantingDate, advisory.riceTypeCategory);
  const Chevron = showDisclaimer ? ChevronUp : ChevronDown;

  return (
    <View style={[styles.activeCard, { backgroundColor: tone.bg, borderColor: tone.solid }]}>
      <View style={styles.activeTop}>
        <IconTile icon={style.icon} tone={style.tone} size={64} solid shape="rounded" />
        <View style={styles.flex}>
          <AnimoText variant="tagV2" color={tone.fg}>
            {t('adv.current')}
          </AnimoText>
          <AnimoText variant="heading">{actionLabel(advisory.recommendedAction, language)}</AnimoText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
          {formatIssuedAt(issuedAt, isTagalog)}
        </AnimoText>
        {advisory.isStale ? (
          <StatusPill tone="caution" label={t('adv.stale')} />
        ) : (
          <StatusPill tone="success" label={t('adv.fresh')} />
        )}
      </View>

      <Image source={ADVISORY_BANNERS[advisory.recommendedAction]} style={styles.banner} resizeMode="cover" />

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <View style={styles.statHead}>
            <Sprout size={20} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
            <AnimoText variant="tagV2" color={AnimoV2Colors.textSecondary}>
              {t('adv.ripeness')}
            </AnimoText>
          </View>
          <AnimoText variant="title">{Math.round(ripeness * 100)}%</AnimoText>
          <ProgressBar value={ripeness} height={10} fill={tone.solid} track={AnimoV2Colors.surfaceMuted} />
        </View>
        <View style={styles.statTile}>
          <View style={styles.statHead}>
            <CloudRain size={20} color={tone.fg} strokeWidth={2.5} />
            <AnimoText variant="tagV2" color={AnimoV2Colors.textSecondary}>
              {t('adv.rain')}
            </AnimoText>
          </View>
          <AnimoText variant="title" color={tone.fg}>
            {advisory.precipitationMmH.toFixed(1)}
          </AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            mm/h
          </AnimoText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('adv.howComputed')}
        accessibilityState={{ expanded: showDisclaimer }}
        onPress={onToggleDisclaimer}
        style={styles.disclaimerToggle}>
        <AnimoText variant="bodyStrong" style={styles.flex}>
          {t('adv.howComputed')}
        </AnimoText>
        <Chevron size={22} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
      </Pressable>
      {showDisclaimer ? (
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {t('adv.disclaimer')}
        </AnimoText>
      ) : null}
    </View>
  );
}

function PastAdvisoryRow({
  entry,
  showPlantingTag,
  isTagalog,
  language,
  plantedLabel,
}: {
  entry: AdvisoryHistoryEntry;
  showPlantingTag: boolean;
  isTagalog: boolean;
  language: 'tl' | 'en';
  plantedLabel: string;
}) {
  const style = ADVISORY_STYLE[entry.recommendedAction] ?? ADVISORY_STYLE.No_Action_Needed;

  return (
    <DepthCard depth="flat" radius="lg" style={styles.pastRow}>
      <IconTile icon={style.icon} tone={style.tone} />
      <View style={styles.flex}>
        <AnimoText variant="bodyStrong">{historyLabel(entry.recommendedAction, language)}</AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {formatHistoryDate(entry.dateIssued, isTagalog)}
          {showPlantingTag && entry.plantingDate
            ? ` · ${plantedLabel} ${formatShortDate(entry.plantingDate, isTagalog)}`
            : ''}
        </AnimoText>
      </View>
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xxl,
    gap: AnimoV2Spacing.md,
  },
  emptyCard: { padding: AnimoV2Spacing.xl, alignItems: 'center', gap: AnimoV2Spacing.md },
  activeCard: {
    borderRadius: AnimoV2Radius.xl,
    borderWidth: 2,
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  banner: { width: '100%', height: BANNER_HEIGHT, borderRadius: AnimoV2Radius.lg },
  statsRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderRadius: AnimoV2Radius.lg,
    padding: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.xs,
  },
  statHead: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  disclaimerToggle: {
    minHeight: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderRadius: AnimoV2Radius.md,
    paddingHorizontal: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.sm,
  },
  sectionHeader: { marginTop: AnimoV2Spacing.md },
  historyList: { gap: AnimoV2Spacing.sm },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
  },
  viewAllButton: { alignItems: 'center', justifyContent: 'center', minHeight: AnimoV2Size.controlHeight },
});
