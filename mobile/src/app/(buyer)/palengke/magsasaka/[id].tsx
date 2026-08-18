import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Store,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '@/components/animo/back-header';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import {
  fetchFarmerPublicProfile,
  type FarmerPublicProfile,
} from '@/services/farmer-public-profile';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import {
  moistureLabel,
  varietyLabel,
  type CropListing,
} from '@/types/crop-listing';

export default function FarmerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [profile, setProfile] = useState<FarmerPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  // Modals for Transactions & Feedback Summaries
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(undefined);

    fetchMarketplaceListing(id)
      .then(async (resListing) => {
        if (cancelled) return;
        setListing(resListing);
        const farmerData = await fetchFarmerPublicProfile(id, resListing);
        if (!cancelled) {
          setProfile(farmerData);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : 'Hindi ma-load ang profile ng magsasaka.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* <View style={styles.topNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bumalik"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backBtn}>
            <ChevronLeft size={26} color={AnimoColors.black} />
          </Pressable>
          <AnimoText variant="h2" color={AnimoColors.black} style={styles.topNavTitle}>
            Profile ng Magsasaka
          </AnimoText>
          <View style={styles.backBtnPlaceholder} />
        </View> */}
        <BackHeader title="Profile ng Magsasaka" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bumalik"
            hitSlop={12}
            onPress={() => router.back()}
            style={styles.backBtn}>
            <ChevronLeft size={26} color={AnimoColors.black} />
          </Pressable>
          <AnimoText variant="h2" color={AnimoColors.black} style={styles.topNavTitle}>
            Profile ng Magsasaka
          </AnimoText>
          <View style={styles.backBtnPlaceholder} />
        </View>
        <View style={styles.centerState}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.centerText}>
            {errorMessage ?? 'Hindi nahanap ang profile ng magsasaka.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const averagePerTransaction =
    profile.completedTransactionsCount > 0
      ? Math.round(profile.totalSoldKg / profile.completedTransactionsCount)
      : 0;
  const soldVolumeLabel =
    profile.totalSoldKg >= 1000
      ? `${(profile.totalSoldKg / 1000).toFixed(1)}k`
      : `${profile.totalSoldKg}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title="Profile ng Magsasaka" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Rich Green Curved Hero Banner */}
        <View style={styles.greenBanner}>
          <View style={styles.avatarCircle}>
            <Store size={44} color={AnimoColors.accentPrimary} />
          </View>

          <AnimoText variant="h1" color={AnimoColors.white} style={styles.bannerFarmerName}>
            {profile.name}
          </AnimoText>

          {profile.location ? (
            <View style={styles.locationPill}>
              <MapPin size={15} color={AnimoColors.white} />
              <AnimoText variant="bodyEmphasis" color={AnimoColors.white} style={styles.locationPillText}>
                {profile.location}
              </AnimoText>
            </View>
          ) : null}

          {profile.memberSince ? (
            <AnimoText variant="body" color="rgba(255, 255, 255, 0.9)" style={styles.memberSubtitle}>
              Miyembro mula {profile.memberSince}
            </AnimoText>
          ) : null}
        </View>

        {/* 3 Floating Stat Cards (Overlapping the green banner & Clickable) */}
        <View style={styles.floatingStatsRow}>
          {/* Stat 1: Transaksyon (Clickable to open summary modal) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang buod ng mga transaksyon"
            onPress={() => setShowTransactionsModal(true)}
            style={styles.statCard}>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
              {profile.completedTransactionsCount}
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              Transaksyon
            </AnimoText>
          </Pressable>

          {/* Stat 2: Rating & Reviews (Clickable to open feedback modal) */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang buod ng mga review"
            onPress={() => setShowFeedbackModal(true)}
            style={styles.statCard}>
            <View style={styles.ratingNumberRow}>
              <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
                {profile.totalReviews > 0 ? profile.averageRating : '—'}
              </AnimoText>
              <Star
                size={18}
                color="#F59E0B"
                fill={profile.totalReviews > 0 ? '#F59E0B' : 'transparent'}
                style={styles.statStar}
              />
            </View>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              {profile.totalReviews} reviews
            </AnimoText>
          </Pressable>

          {/* Stat 3: Total Sold Volume */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang buod ng mga transaksyon"
            onPress={() => setShowTransactionsModal(true)}
            style={styles.statCard}>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
              {soldVolumeLabel}
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              Kilo na Naibenta
            </AnimoText>
          </Pressable>
        </View>

        {/* Section 1: Kredibilidad Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <ShieldCheck size={22} color={AnimoColors.accentPrimary} />
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
              Kredibilidad
            </AnimoText>
          </View>

          <View style={styles.cardBody}>
            {/* Row 1: Nagbebenta ng Dekalidad */}
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Positibong Feedback
              </AnimoText>
              <View style={styles.greenBadge}>
                <AnimoText variant="bodyEmphasis" color="#166534" style={styles.greenBadgeText}>
                  {profile.positiveFeedbackPct != null ? `${profile.positiveFeedbackPct}%` : '—'}
                </AnimoText>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 2: Natapos na Transaksyon (Clickable) */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowTransactionsModal(true)}
              style={styles.tableRowClickable}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Natapos na Transaksyon
              </AnimoText>
              <View style={styles.rowValueRightGroup}>
                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.rowValue}>
                  {profile.completedTransactionsCount}
                </AnimoText>
                <ChevronRight size={18} color={AnimoColors.textMediumEmphasis} />
              </View>
            </Pressable>

            <View style={styles.rowDivider} />

            {/* Row 3: Average Rating (Clickable) */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowFeedbackModal(true)}
              style={styles.tableRowClickable}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Average Rating
              </AnimoText>
              <View style={styles.rowValueRightGroup}>
                <View style={styles.ratingStarsRight}>
                  <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.rowValue}>
                    {profile.totalReviews > 0 ? `${profile.averageRating} / 5.0` : '—'}
                  </AnimoText>
                  <View style={styles.miniStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        color="#F59E0B"
                        fill={
                          profile.totalReviews > 0 && star <= Math.round(profile.averageRating)
                            ? '#F59E0B'
                            : 'transparent'
                        }
                      />
                    ))}
                  </View>
                </View>
                <ChevronRight size={18} color={AnimoColors.textMediumEmphasis} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Section 2: Impormasyon sa Pagbebenta Card (Comprehensive) */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <ShoppingBag size={22} color={AnimoColors.accentPrimary} />
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
              Impormasyon sa Pagbebenta
            </AnimoText>
          </View>

          <View style={styles.cardBody}>
            {/* Row 1: Pangunahing uri ng palay */}
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Pangunahing uri ng palay
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.rowValue}>
                {profile.commonlySoldVarieties[0] || '—'}
              </AnimoText>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 2: Iba pang karaniwang uri na ibinebenta */}
            <View style={styles.tableColumnRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Iba pang uri na karaniwang ibinebenta
              </AnimoText>
              <View style={styles.varietyChipsWrap}>
                {profile.commonlySoldVarieties.length > 0 ? (
                  profile.commonlySoldVarieties.map((variety) => (
                    <View key={variety} style={styles.varietyPill}>
                      <Sprout size={14} color={AnimoColors.accentPrimary} />
                      <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.varietyPillText}>
                        {variety}
                      </AnimoText>
                    </View>
                  ))
                ) : (
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    Wala pang talaan
                  </AnimoText>
                )}
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 3: Kagustuhang moisture */}
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Kalidad ng moisture
              </AnimoText>
              <View style={styles.greenBadge}>
                <AnimoText variant="bodyEmphasis" color="#166534" style={styles.greenBadgeText}>
                  {listing ? moistureLabel(listing.declaredMoisture) : '—'}
                </AnimoText>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 4: Karaniwang dami bawat ani */}
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Karaniwang dami bawat ani
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.rowValue}>
                {profile.completedTransactionsCount > 0
                  ? `~${averagePerTransaction.toLocaleString()} kg`
                  : '—'}
              </AnimoText>
            </View>

            <View style={styles.rowDivider} />

            {/* Row 5: Kabuuang naibenta */}
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Kabuuang naibenta
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.rowValue}>
                ~{profile.totalSoldKg.toLocaleString()} kg
              </AnimoText>
            </View>
          </View>
        </View>

        {/* Section 3: Kasalukuyang Listing (Outline-only, no dark background, clickable to redirect) */}
        {listing ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pindutin para bumalik at tingnan ang buong detalye ng listing"
            onPress={() => router.back()}
            style={styles.listingCardOutline}>
            <View style={styles.listingHeaderRow}>
              <View style={styles.listingHeaderLeft}>
                <FileText size={20} color={AnimoColors.accentPrimary} />
                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
                  Kasalukuyang Listing
                </AnimoText>
              </View>
              <View style={styles.viewListingPill}>
                {/* <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.viewListingText}>
                  Tingnan
                </AnimoText> */}
                <ChevronRight size={18} color={AnimoColors.textMediumEmphasis} />
              </View>
            </View>

            {/* Inner Outline Box */}
            <View style={styles.innerListingBoxOutline}>
              <View style={styles.listingMetricsRow}>
                <View style={styles.listingMetricCol}>
                  <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                    Uri ng Palay
                  </AnimoText>
                  <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.listingVarietyName}>
                    {varietyLabel(listing)}
                  </AnimoText>
                </View>

                <View style={styles.listingMetricColRight}>
                  <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                    Dami Available
                  </AnimoText>
                  <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.listingQuantity}>
                    {listing.remainingQuantityKg} kg
                  </AnimoText>
                </View>
              </View>

              <View style={styles.innerListingDivider} />

              <View style={styles.listingPriceRow}>
                <View style={styles.priceLeft}>
                  <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                    Presyo
                  </AnimoText>
                  <AnimoText variant="price" color={AnimoColors.accentPrimary} style={styles.listingPriceText}>
                    {formatPeso(listing.pricePerKg ?? 0)}
                    <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                      {' '}/ kg
                    </AnimoText>
                  </AnimoText>
                </View>

                <View style={styles.listingTimeRight}>
                  <Clock size={14} color={AnimoColors.textMediumEmphasis} />
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    Aktibo Ngayon
                  </AnimoText>
                </View>
              </View>
            </View>
          </Pressable>
        ) : null}

        {/* Privacy Note */}
        <View style={styles.privacyNoteBox}>
          <ShieldCheck size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.privacyNoteText}>
            Ligtas na Transaksyon: Ibibigay ang kumpletong contact number at saktong lokasyon
            ng pickup kapag tinanggap ng magsasaka ang iyong kahilingan.
          </AnimoText>
        </View>
      </ScrollView>

      {/* Sticky Bottom Green Button with White Text */}
      <View style={styles.bottomFooter}>
        <AnimoButton
          label="Bumalik sa Listing"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>

      {/* 1. Buod ng mga Transaksyon Modal */}
      <Modal
        visible={showTransactionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransactionsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleGroup}>
                <PackageCheck size={22} color={AnimoColors.accentPrimary} />
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                  Buod ng Transaksyon
                </AnimoText>
              </View>
              <Pressable
                hitSlop={12}
                onPress={() => setShowTransactionsModal(false)}
                style={styles.modalCloseBtn}>
                <X size={22} color={AnimoColors.textMediumEmphasis} />
              </Pressable>
            </View>

            <View style={styles.modalSummaryGrid}>
              <View style={styles.modalSummaryBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Natapos na Transaksyon
                </AnimoText>
                <AnimoText variant="h1" color={AnimoColors.textHighEmphasis}>
                  {profile.completedTransactionsCount}
                </AnimoText>
              </View>
              <View style={styles.modalSummaryBox}>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Kabuuang Naibenta
                </AnimoText>
                <AnimoText variant="h1" color={AnimoColors.accentPrimary}>
                  {profile.totalSoldKg.toLocaleString()} kg
                </AnimoText>
              </View>
            </View>

            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.modalSubheading}>
              Mga Kamakailang Transaksyon
            </AnimoText>

            <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
              {profile.completedTransactionsCount === 0 ? (
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Wala pang naitalang transaksyon.
                </AnimoText>
              ) : (
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  {profile.completedTransactionsCount} naitala, kabuuang{' '}
                  {profile.totalSoldKg.toLocaleString()} kg.
                </AnimoText>
              )}
            </ScrollView>

            <AnimoButton
              label="Isara"
              variant="secondary"
              onPress={() => setShowTransactionsModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* 2. Buod ng Feedback at Reviews Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleGroup}>
                <Star size={22} color="#F59E0B" fill="#F59E0B" />
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                  Marka at Feedback
                </AnimoText>
              </View>
              <Pressable
                hitSlop={12}
                onPress={() => setShowFeedbackModal(false)}
                style={styles.modalCloseBtn}>
                <X size={22} color={AnimoColors.textMediumEmphasis} />
              </Pressable>
            </View>

            {/* Rating Big Badge */}
            <View style={styles.feedbackRatingHeader}>
              <View style={styles.feedbackRatingBig}>
                <Star size={32} color="#F59E0B" fill="#F59E0B" />
                <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.feedbackScoreText}>
                  {profile.totalReviews > 0 ? profile.averageRating : '—'}
                </AnimoText>
              </View>
              <View style={styles.feedbackRatingCol}>
                <View style={styles.miniStarsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      color="#F59E0B"
                      fill={
                        profile.totalReviews > 0 && star <= Math.round(profile.averageRating)
                          ? '#F59E0B'
                          : 'transparent'
                      }
                    />
                  ))}
                </View>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  {profile.totalReviews} mga review mula sa mamimili
                </AnimoText>
                {profile.positiveFeedbackPct != null ? (
                  <View style={styles.feedbackThumbsRow}>
                    <ThumbsUp size={13} color={AnimoColors.accentPrimary} />
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.thumbsText}>
                      {profile.positiveFeedbackPct}% Positibong Feedback
                    </AnimoText>
                  </View>
                ) : null}
              </View>
            </View>

            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.modalSubheading}>
              Mga Komento mula sa mga Mamimili
            </AnimoText>

            <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
              {profile.comments.length === 0 ? (
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Wala pang komento mula sa mga mamimili.
                </AnimoText>
              ) : (
                profile.comments.map((comment, index) => (
                  <View key={`${comment}-${index}`} style={styles.reviewCommentCard}>
                    <View style={styles.reviewCommentHeader}>
                      <MessageSquareQuote size={15} color={AnimoColors.accentPrimary} />
                      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                        Mamimili
                      </AnimoText>
                    </View>
                    <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.reviewQuoteText}>
                      &quot;{comment}&quot;
                    </AnimoText>
                  </View>
                ))
              )}
            </ScrollView>

            <AnimoButton
              label="Isara"
              variant="secondary"
              onPress={() => setShowFeedbackModal(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: '#FBF9F4',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topNavTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    textAlign: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  centerText: {
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
  },
  greenBanner: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: 48,
    paddingHorizontal: AnimoSpacing.xl,
    alignItems: 'center',
    gap: 8,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerFarmerName: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: AnimoColors.white,
    textAlign: 'center',
    marginTop: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: AnimoRadius.pill,
  },
  locationPillText: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  memberSubtitle: {
    fontSize: 14.5,
    marginTop: 2,
  },
  floatingStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: -30,
    paddingHorizontal: AnimoSpacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
    gap: 3,
  },
  statNumber: {
    fontSize: 26,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 30,
  },
  ratingNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statStar: {
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
    color: AnimoColors.textMediumEmphasis,
  },
  infoCard: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardHeaderTitle: {
    fontSize: 18.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  cardBody: {
    gap: AnimoSpacing.sm,
    paddingTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tableRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tableColumnRow: {
    gap: 8,
    paddingVertical: 4,
  },
  rowLabel: {
    fontSize: 16,
    color: AnimoColors.blackSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textAlign: 'right',
  },
  rowValueRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  greenBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AnimoRadius.pill,
  },
  greenBadgeText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  varietyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  varietyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderWidth: 1,
    borderColor: AnimoColors.accentPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: AnimoRadius.pill,
  },
  varietyPillText: {
    fontSize: 14.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  ratingStarsRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  miniStarsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  listingCardOutline: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  listingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewListingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    // backgroundColor: AnimoColors.accentPrimaryLight,
    // paddingHorizontal: 10,
    // paddingVertical: 4,
    borderRadius: AnimoRadius.pill,
  },
  viewListingText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14.5,
  },
  innerListingBoxOutline: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
  },
  listingMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listingMetricCol: {
    gap: 3,
    flex: 1,
  },
  listingMetricColRight: {
    gap: 3,
    alignItems: 'flex-end',
  },
  listingVarietyName: {
    fontSize: 19.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  listingQuantity: {
    fontSize: 19.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  innerListingDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  listingPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLeft: {
    gap: 2,
  },
  listingPriceText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  listingTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginHorizontal: AnimoSpacing.lg,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
  },
  bottomFooter: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    backgroundColor: '#FBF9F4',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: AnimoSpacing.lg,
  },
  modalContentCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
  },
  modalSummaryGrid: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  modalSummaryBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 2,
  },
  modalSubheading: {
    fontSize: 17.5,
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 4,
  },
  modalScrollList: {
    maxHeight: 220,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDetails: {
    flex: 1,
    gap: 2,
  },
  feedbackRatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.lg,
    backgroundColor: '#FEF3C7',
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
  },
  feedbackRatingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackScoreText: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  feedbackRatingCol: {
    flex: 1,
    gap: 3,
  },
  feedbackThumbsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  thumbsText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  reviewCommentCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: AnimoRadius.sm,
    padding: AnimoSpacing.md,
    gap: 4,
    marginBottom: AnimoSpacing.sm,
    backgroundColor: '#F9FAFB',
  },
  reviewCommentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewQuoteText: {
    fontStyle: 'italic',
    fontSize: 15.5,
    lineHeight: 22,
  },
});
