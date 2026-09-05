import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronRight,
  Flame,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wheat,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { MarketplaceListingCard } from '@/components/animo/buyer/marketplace-listing-card';
import {
  OnboardingWalkthroughModal,
  TUTORIAL_STORAGE_KEY,
} from '@/components/animo/onboarding-walkthrough-modal';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { fetchCoverPhotos } from '@/services/crop-listing-service';
import {
  fetchMarketPopularityInsights,
  type MarketPopularityInsight,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import type { RankedListing } from '@/types/marketplace-filter';

const TrendingOrange = '#F57C00';

/** Tahanan — buyer home: welcome, market analytics, trending varieties, and fresh harvest recommendations. */
export default function BuyerHomeScreen() {
  const { t } = useLanguage();
  const [featured, setFeatured] = useState<RankedListing[]>([]);
  const [coverPhotos, setCoverPhotos] = useState<Map<string, string>>(new Map());
  const [insights, setInsights] = useState<MarketPopularityInsight | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check first-time user tutorial flag
    AsyncStorage.getItem(TUTORIAL_STORAGE_KEY)
      .then((seen) => {
        if (!seen) {
          setShowTutorial(true);
        }
      })
      .catch(() => {});

    fetchMarketPopularityInsights().then(setInsights).catch(() => {});
    fetchMarketplaceListings({})
      .then(async (ranked) => {
        const topFeatured = ranked.slice(0, 3);
        setFeatured(topFeatured);
        try {
          const photos = await fetchCoverPhotos(topFeatured.map((item) => item.listing.id));
          setCoverPhotos(photos);
        } catch {
          // fallback
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader onPressBell={() => router.push('/(buyer)/notipikasyon')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Greeting */}
        <View style={styles.hero}>
          <AnimoText variant="h1" color={AnimoColors.black}>
            {t('buyer.greeting')}
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {t('buyer.heroSubtitle')}
          </AnimoText>
        </View>

        {/* Market Insights & Popularity Card */}
        {insights ? (
          <View style={styles.marketInsightCard}>
            <View style={styles.marketInsightTopRow}>
              <View style={styles.marketInsightTopLeft}>
                <Flame size={18} color={AnimoColors.white} />
                <AnimoText variant="h3" color={AnimoColors.white}>
                  {t('buyer.marketTrends')}
                </AnimoText>
              </View>
              <View style={styles.trendingBadge}>
                <AnimoText variant="tag" color={AnimoColors.white} style={styles.trendingBadgeText}>
                  {t('buyer.trending')}
                </AnimoText>
              </View>
            </View>

            <View style={styles.marketInsightInner}>
              <View style={styles.insightBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  {t('buyer.mostSold')}
                </AnimoText>
                <AnimoText
                  variant="h2"
                  color={AnimoColors.accentPrimary}
                  style={styles.insightVarietyValueLarge}
                  numberOfLines={2}>
                  {insights.topVariety}
                </AnimoText>
                {insights.topVariety.toLowerCase().includes('hybrid') ? (
                  <View style={styles.hybridBadge}>
                    <AnimoText variant="tag" color="#1E40AF">
                      High-Yield F1 Palay
                    </AnimoText>
                  </View>
                ) : null}
              </View>

              <View style={styles.insightBox}>
                <View style={styles.insightBoxHeader}>
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    {t('buyer.averagePrice')}
                  </AnimoText>
                  <View style={styles.trendRow}>
                    <TrendingUp size={14} strokeWidth={2.5} color={AnimoColors.accentPrimary} />
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                      {t('buyer.stablePrice')}
                    </AnimoText>
                  </View>
                </View>

                <View style={styles.priceRowHighlight}>
                  <AnimoText
                    variant="h1"
                    color={AnimoColors.accentPrimary}
                    style={styles.insightPriceValue}>
                    ₱{insights.averagePricePerKg.toFixed(2)}
                  </AnimoText>
                  <AnimoText
                    variant="body"
                    color={AnimoColors.textMediumEmphasis}
                    style={styles.perKgText}>
                    {t('common.perKg')}
                  </AnimoText>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Colored Quick Actions */}
        <View style={styles.actions}>
          <QuickAction
            icon={<ShoppingBag size={22} color={AnimoColors.accentPrimary} />}
            label={t('buyer.quickMarket')}
            hint={t('buyer.quickMarketHint')}
            onPress={() => router.push('/(buyer)/palengke')}
          />
          <QuickAction
            icon={<ReceiptText size={22} color={AnimoColors.accentPrimary} />}
            label={t('buyer.quickTxn')}
            hint={t('buyer.quickTxnHint')}
            onPress={() => router.push('/(buyer)/transaksyon')}
          />
        </View>

        {/* Patok na Uri ng Palay — live avg of Available listings per variety */}
        {insights && insights.popularVarieties.length > 0 ? (
          <View style={styles.varietiesSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Sparkles size={18} color={AnimoColors.accentPrimary} />
                <AnimoText variant="h2" color={AnimoColors.black}>
                  {t('buyer.popularVarieties')}
                </AnimoText>
              </View>
              <Pressable
                onPress={() => router.push('/(buyer)/palengke')}
                hitSlop={10}
                style={styles.seeAllButton}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                  {t('common.seeAll')}
                </AnimoText>
                <ChevronRight size={15} color={AnimoColors.green} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.varietiesCarousel}>
              {insights.popularVarieties.map((item) => {
                const isHybrid = item.name.toLowerCase().includes('hybrid');
                return (
                  <Pressable
                    key={item.name}
                    accessibilityRole="button"
                    accessibilityLabel={`Tingnan ang mga listing ng ${item.name}`}
                    onPress={() => router.push('/(buyer)/palengke')}
                    style={styles.varietyCard}>
                    <View style={styles.varietyIconWrap}>
                      <Wheat size={20} color={AnimoColors.accentPrimary} />
                    </View>

                    <AnimoText
                      variant="bodyEmphasis"
                      color={AnimoColors.textHighEmphasis}
                      style={styles.varietyName}
                      numberOfLines={2}>
                      {item.name}
                    </AnimoText>

                    <View style={styles.varietyTagBadge}>
                      <AnimoText
                        variant="caption"
                        color={AnimoColors.accentPrimary}
                        style={styles.varietyTagText}>
                        {item.listingCount} {item.listingCount === 1 ? 'listing' : 'listings'}
                      </AnimoText>
                    </View>

                    {isHybrid ? (
                      <View style={styles.hybridPill}>
                        <AnimoText variant="tag" color="#1E40AF" style={styles.hybridPillText}>
                          Mataas na Ani (High-Yield)
                        </AnimoText>
                      </View>
                    ) : null}

                    <View style={styles.varietyPriceBlock}>
                      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                        {t('buyer.averagePrice')}
                      </AnimoText>
                      <View style={styles.varietyPriceRow}>
                        <AnimoText
                          variant="h2"
                          color={AnimoColors.accentPrimary}
                          style={styles.varietyPriceLarge}>
                          ₱{item.avgPricePerKg.toFixed(2)}
                        </AnimoText>
                        <AnimoText
                          variant="caption"
                          color={AnimoColors.textMediumEmphasis}
                          style={styles.varietyPerKgText}>
                          {t('common.perKg')}
                        </AnimoText>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Mga Rekomendasyon Section */}
        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Wheat size={18} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h2" color={AnimoColors.black}>
                {t('buyer.recommendations')}
              </AnimoText>
            </View>
            <Pressable
              onPress={() => router.push('/(buyer)/palengke')}
              hitSlop={10}
              style={styles.seeAllButton}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                {t('common.seeAll')}
              </AnimoText>
              <ChevronRight size={15} color={AnimoColors.green} />
            </Pressable>
          </View>

          <View style={styles.featured}>
            {featured.map(({ listing }) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                coverPhotoUrl={coverPhotos.get(listing.id)}
                onPress={() => router.push(`/(buyer)/palengke/${listing.id}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Onboarding / Tutorial Walkthrough Modal */}
      <OnboardingWalkthroughModal
        visible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.flex}>
        <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
          {label}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
          {hint}
        </AnimoText>
      </View>
      <ChevronRight size={18} color={AnimoColors.accentPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.xl,
  },
  hero: {
    gap: AnimoSpacing.xs,
  },
  marketInsightCard: {
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  marketInsightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketInsightTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  trendingBadge: {
    backgroundColor: TrendingOrange,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: AnimoSpacing.xs,
  },
  trendingBadgeText: {
    letterSpacing: 0.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  marketInsightInner: {
    flexDirection: 'column',
    gap: AnimoSpacing.sm,
  },
  insightBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  insightBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRowHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  insightPriceValue: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 28,
  },
  insightVarietyValueLarge: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 24,
    marginTop: 2,
  },
  hybridBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 2,
  },
  perKgText: {
    fontSize: 14,
    color: AnimoColors.textMediumEmphasis,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actions: {
    gap: AnimoSpacing.md,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.greenTint,
  },
  pressed: {
    opacity: 0.9,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  varietiesSection: {
    gap: AnimoSpacing.md,
  },
  recommendationsSection: {
    gap: AnimoSpacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.greenTint,
  },
  varietiesCarousel: {
    gap: AnimoSpacing.md,
    paddingRight: AnimoSpacing.md,
  },
  varietyCard: {
    width: 190,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    padding: AnimoSpacing.md,
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  varietyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  varietyName: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  varietyTagBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  varietyTagText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  hybridPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  hybridPillText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  varietyPriceBlock: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 2,
  },
  varietyPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  varietyPriceLarge: {
    fontSize: 19,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 22,
  },
  varietyPerKgText: {
    fontSize: 12.5,
    color: AnimoColors.textMediumEmphasis,
  },
  featured: {
    gap: AnimoSpacing.md,
  },
});
