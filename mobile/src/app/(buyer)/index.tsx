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
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  fetchMarketPopularityInsights,
  type MarketPopularityInsight,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListings } from '@/services/marketplace-service';
import type { RankedListing } from '@/types/marketplace-filter';

/** Curated popular rice varieties in the market. */
const POPULAR_VARIETIES = [
  { id: '1', name: 'RC 222', tag: 'Mataas ang Ani', avgPrice: 22.5 },
  { id: '2', name: 'Dinorado', tag: 'Mabango at Malambot', avgPrice: 25.0 },
  { id: '3', name: 'NSIC Rc 160', tag: 'De-kalidad na Butil', avgPrice: 23.0 },
  { id: '4', name: 'Sinandomeng', tag: 'Tradisyonal na Paborito', avgPrice: 21.5 },
  { id: '5', name: 'Inbred (Tuyo)', tag: 'Mabilis Maibenta', avgPrice: 20.0 },
];

/** Tahanan — buyer home: welcome, market analytics, trending varieties, and fresh harvest recommendations. */
export default function BuyerHomeScreen() {
  const [featured, setFeatured] = useState<RankedListing[]>([]);
  const [insights, setInsights] = useState<MarketPopularityInsight | null>(null);

  useEffect(() => {
    fetchMarketPopularityInsights().then(setInsights).catch(() => { });
    fetchMarketplaceListings({}).then((ranked) => setFeatured(ranked.slice(0, 3))).catch(() => { });
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Greeting */}
        <View style={styles.hero}>
          <AnimoText variant="display" color={AnimoColors.black}>
            Kumusta, Mamimili!
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Maghanap ng de-kalidad na palay mula sa mga lokal na magsasaka sa patas na presyo.
          </AnimoText>
        </View>

        {/* Market Insights & Popularity Card */}
        {insights ? (
          <View style={styles.insightCard}>
            <View style={styles.insightHeaderRow}>
              <View style={styles.insightTitleLeft}>
                <Flame size={18} color="#D97706" />
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Patok sa Merkado Ngayong Buwan
                </AnimoText>
              </View>
            </View>

            <View style={styles.insightGrid}>
              <View style={styles.insightBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Pinakasikat na Uri
                </AnimoText>
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.insightVarietyValue}>
                  {insights.topVariety}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.insightShareText}>
                  {insights.topVarietyShare}
                </AnimoText>
              </View>

              <View style={styles.insightBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Average na Presyo
                </AnimoText>
                <View style={styles.priceRowHighlight}>
                  <AnimoText variant="h1" color={AnimoColors.accentPrimary} style={styles.insightPriceValue}>
                    ₱{insights.averagePricePerKg.toFixed(2)}
                  </AnimoText>
                  <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.perKgText}>
                    / kg
                  </AnimoText>
                </View>
                <View style={styles.trendRow}>
                  <TrendingUp size={13} color={AnimoColors.accentPrimary} />
                  <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                    Matatag na presyo
                  </AnimoText>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.actions}>
          <QuickAction
            icon={<ShoppingBag size={22} color={AnimoColors.green} />}
            label="Palengke at Direktoryo"
            hint="Mag-browse ng palay at mga magsasaka"
            onPress={() => router.push('/(buyer)/palengke')}
          />
          <QuickAction
            icon={<ReceiptText size={22} color={AnimoColors.green} />}
            label="Transaksyon"
            hint="Bantayan ang mga order"
            onPress={() => router.push('/(buyer)/transaksyon')}
          />
        </View>

        {/* Patok na Uri ng Palay (Trending Rice Varieties) */}
        <View style={styles.varietiesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Sparkles size={18} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h2" color={AnimoColors.black}>
                Patok na Uri ng Palay
              </AnimoText>
            </View>
            <Pressable
              onPress={() => router.push('/(buyer)/palengke')}
              hitSlop={10}
              style={styles.seeAllButton}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                Lahat
              </AnimoText>
              <ChevronRight size={15} color={AnimoColors.green} />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.varietiesCarousel}>
            {POPULAR_VARIETIES.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Tingnan ang mga listing ng ${item.name}`}
                onPress={() => router.push('/(buyer)/palengke')}
                style={styles.varietyCard}>
                <View style={styles.varietyIconWrap}>
                  <Wheat size={22} color={AnimoColors.accentPrimary} />
                </View>

                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.varietyName}>
                  {item.name}
                </AnimoText>

                <View style={styles.varietyTagBadge}>
                  <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.varietyTagText}>
                    {item.tag}
                  </AnimoText>
                </View>

                <View style={styles.varietyPriceBlock}>
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    Karaniwang Presyo
                  </AnimoText>
                  <View style={styles.varietyPriceRow}>
                    <AnimoText variant="h2" color={AnimoColors.accentPrimary} style={styles.varietyPriceLarge}>
                      ₱{item.avgPrice.toFixed(2)}
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.varietyPerKgText}>
                      /kg
                    </AnimoText>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Mga Rekomendasyon Section */}
        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Wheat size={18} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h2" color={AnimoColors.black}>
                Mga Rekomendasyon
              </AnimoText>
            </View>
            <Pressable
              onPress={() => router.push('/(buyer)/palengke')}
              hitSlop={10}
              style={styles.seeAllButton}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                Lahat
              </AnimoText>
              <ChevronRight size={15} color={AnimoColors.green} />
            </Pressable>
          </View>

          <View style={styles.featured}>
            {featured.map(({ listing }) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                onPress={() => router.push(`/(buyer)/palengke/${listing.id}`)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
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
        <AnimoText variant="caption" color={AnimoColors.muted}>
          {hint}
        </AnimoText>
      </View>
      <ChevronRight size={18} color={AnimoColors.muted} />
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
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xxl,
    gap: AnimoSpacing.xl,
  },
  hero: {
    gap: AnimoSpacing.sm,
  },
  insightCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    gap: AnimoSpacing.md,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightGrid: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  insightBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 3,
    justifyContent: 'space-between',
  },
  priceRowHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 1,
  },
  insightPriceValue: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 32,
  },
  insightVarietyValue: {
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 24,
    marginVertical: 1,
  },
  perKgText: {
    fontSize: 14,
    color: AnimoColors.textMediumEmphasis,
  },
  insightShareText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
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
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
  },
  pressed: {
    opacity: 0.95,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 180,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    padding: AnimoSpacing.md,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  varietyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  varietyName: {
    fontSize: 16.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  varietyTagBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  varietyTagText: {
    fontSize: 11.5,
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
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 24,
  },
  varietyPerKgText: {
    fontSize: 13,
    color: AnimoColors.textMediumEmphasis,
  },
  featured: {
    gap: AnimoSpacing.lg,
  },
});
