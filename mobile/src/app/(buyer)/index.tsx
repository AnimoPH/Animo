import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Award,
  ChevronRight,
  Flame,
  MapPin,
  ReceiptText,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { ListingCard } from '@/components/animo/listing-card';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { LISTINGS } from '@/constants/marketplace';
import {
  fetchMarketPopularityInsights,
  fetchTopRankedFarmers,
  type MarketPopularityInsight,
  type RankedFarmer,
} from '@/services/farmer-public-profile';

/** Tahanan — buyer home: welcome, market analytics, top ranked farmers, and recommendations. */
export default function BuyerHomeScreen() {
  const featured = LISTINGS.slice(0, 2);
  const [topFarmers, setTopFarmers] = useState<RankedFarmer[]>([]);
  const [insights, setInsights] = useState<MarketPopularityInsight | null>(null);

  useEffect(() => {
    fetchTopRankedFarmers().then(setTopFarmers).catch(() => {});
    fetchMarketPopularityInsights().then(setInsights).catch(() => {});
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
            Maghanap ng de-kalidad na palay mula sa mga nangungunang lokal na magsasaka sa patas na presyo.
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
                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.insightValue}>
                  {insights.topVariety}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                  {insights.topVarietyShare}
                </AnimoText>
              </View>

              <View style={styles.insightBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Average na Presyo
                </AnimoText>
                <AnimoText variant="h3" color={AnimoColors.accentPrimary} style={styles.insightValue}>
                  ₱{insights.averagePricePerKg.toFixed(2)} / kg
                </AnimoText>
                <View style={styles.trendRow}>
                  <TrendingUp size={12} color={AnimoColors.accentPrimary} />
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
            hint="Mag-browse ng palay at magsasaka"
            onPress={() => router.push('/(buyer)/palengke')}
          />
          <QuickAction
            icon={<ReceiptText size={22} color={AnimoColors.green} />}
            label="Transaksyon"
            hint="Bantayan ang mga order"
            onPress={() => router.push('/(buyer)/transaksyon')}
          />
        </View>

        {/* Top Ranked Farmers Section */}
        {topFarmers.length > 0 ? (
          <View style={styles.farmersSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Award size={20} color={AnimoColors.accentPrimary} />
                <AnimoText variant="h2" color={AnimoColors.black}>
                  Nangungunang Magsasaka
                </AnimoText>
              </View>
              <Pressable
                onPress={() => router.push('/(buyer)/palengke')}
                hitSlop={8}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                  Lahat
                </AnimoText>
              </Pressable>
            </View>

            {/* Horizontal Farmer Cards Carousel */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.farmersCarousel}>
              {topFarmers.map((farmer) => (
                <Pressable
                  key={farmer.farmerId}
                  accessibilityRole="button"
                  accessibilityLabel={`Tingnan ang profile ni ${farmer.name}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(buyer)/palengke/magsasaka/[id]',
                      params: { id: featured[0]?.id || '1' },
                    })
                  }
                  style={styles.farmerCardItem}>
                  <View style={styles.farmerCardAvatar}>
                    <Store size={26} color={AnimoColors.accentPrimary} />
                  </View>

                  <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.farmerCardName} numberOfLines={1}>
                    {farmer.name}
                  </AnimoText>

                  <View style={styles.farmerCardLoc}>
                    <MapPin size={12} color={AnimoColors.textMediumEmphasis} />
                    <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} numberOfLines={1}>
                      {farmer.location}
                    </AnimoText>
                  </View>

                  {/* Volume and Rating numbers row */}
                  <View style={styles.farmerCardStats}>
                    <View style={styles.farmerRatingPill}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <AnimoText variant="caption" color={AnimoColors.textHighEmphasis} style={styles.farmerRatingBold}>
                        {farmer.averageRating}
                      </AnimoText>
                    </View>
                    <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                      {(farmer.totalSoldKg / 1000).toFixed(1)}k kg
                    </AnimoText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Featured Listings Section */}
        <View style={styles.sectionHeader}>
          <AnimoText variant="h2" color={AnimoColors.black}>
            Mga Rekomendasyon
          </AnimoText>
          <Pressable onPress={() => router.push('/(buyer)/palengke')} hitSlop={8}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
              Lahat
            </AnimoText>
          </Pressable>
        </View>

        <View style={styles.featured}>
          {featured.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={() => router.push(`/(buyer)/palengke/${listing.id}`)}
            />
          ))}
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
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
    gap: 2,
  },
  insightValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
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
  farmersSection: {
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
  farmersCarousel: {
    gap: AnimoSpacing.md,
    paddingRight: AnimoSpacing.md,
  },
  farmerCardItem: {
    width: 170,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    padding: AnimoSpacing.md,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  farmerCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  farmerCardName: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
  },
  farmerCardLoc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  farmerCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  farmerRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  farmerRatingBold: {
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  featured: {
    gap: AnimoSpacing.lg,
    marginTop: -AnimoSpacing.sm,
  },
});
