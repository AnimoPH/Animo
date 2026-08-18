import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle2,
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
  ThumbsUp,
  UserRound,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  getBuyerPublicProfile,
  type BuyerPublicProfile,
} from '@/constants/buyer-public-profile';

export default function BuyerProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const profile = useMemo(
    () => (id ? getBuyerPublicProfile(id) : undefined),
    [id],
  );

  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  if (!id) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Profile ng Mamimili" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Profile ng Mamimili" />
        <View style={styles.centerState}>
          <AnimoText
            variant="body"
            color={AnimoColors.textMediumEmphasis}
            style={styles.centerText}>
            Hindi nahanap ang profile ng mamimili.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title="Profile ng Mamimili" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.greenBanner}>
          <View style={styles.avatarCircle}>
            <UserRound size={44} color={AnimoColors.accentPrimary} />
          </View>

          <AnimoText variant="h1" color={AnimoColors.white} style={styles.bannerBuyerName}>
            {profile.name}
          </AnimoText>

          <View style={styles.locationPill}>
            <MapPin size={15} color={AnimoColors.white} />
            <AnimoText
              variant="bodyEmphasis"
              color={AnimoColors.white}
              style={styles.locationPillText}>
              {profile.location}
            </AnimoText>
          </View>

          <AnimoText
            variant="body"
            color="rgba(255, 255, 255, 0.9)"
            style={styles.memberSubtitle}>
            Miyembro mula {profile.memberSince}
          </AnimoText>
        </View>

        <View style={styles.floatingStatsRow}>
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

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang buod ng mga review"
            onPress={() => setShowFeedbackModal(true)}
            style={styles.statCard}>
            <View style={styles.ratingNumberRow}>
              <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
                {profile.averageRating}
              </AnimoText>
              <Star size={18} color="#F59E0B" fill="#F59E0B" style={styles.statStar} />
            </View>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              {profile.totalReviews} reviews
            </AnimoText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tingnan ang buod ng mga transaksyon"
            onPress={() => setShowTransactionsModal(true)}
            style={styles.statCard}>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.statNumber}>
              {(profile.totalBoughtKg / 1000).toFixed(1)}k
            </AnimoText>
            <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.statLabel}>
              Kilo na Nabili
            </AnimoText>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <ShieldCheck size={22} color={AnimoColors.accentPrimary} />
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
              Kredibilidad
            </AnimoText>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Maasahang Mamimili
              </AnimoText>
              <View style={styles.greenBadge}>
                <AnimoText variant="bodyEmphasis" color="#166534" style={styles.greenBadgeText}>
                  {profile.reliabilityPct}%
                </AnimoText>
              </View>
            </View>

            <View style={styles.rowDivider} />

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
                    {profile.averageRating} / 5.0
                  </AnimoText>
                  <View style={styles.miniStarsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        color="#F59E0B"
                        fill={star <= Math.round(profile.averageRating) ? '#F59E0B' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                <ChevronRight size={18} color={AnimoColors.textMediumEmphasis} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <ShoppingBag size={22} color={AnimoColors.accentPrimary} />
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
              Impormasyon sa Pagbili
            </AnimoText>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Karaniwang dami ng order
              </AnimoText>
              <AnimoText
                variant="bodyEmphasis"
                color={AnimoColors.textHighEmphasis}
                style={styles.rowValue}>
                ~{profile.typicalOrderKg.toLocaleString()} kg
              </AnimoText>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Uri ng palay na madalas bilhin
              </AnimoText>
              <AnimoText
                variant="bodyEmphasis"
                color={AnimoColors.textHighEmphasis}
                style={styles.rowValue}>
                {profile.commonlyBoughtVarieties[0] || 'Inbred (RC 160)'}
              </AnimoText>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.tableColumnRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Iba pang uri na karaniwang binibili
              </AnimoText>
              <View style={styles.varietyChipsWrap}>
                {profile.commonlyBoughtVarieties.map((variety) => (
                  <View key={variety} style={styles.varietyPill}>
                    <Sprout size={14} color={AnimoColors.accentPrimary} />
                    <AnimoText
                      variant="caption"
                      color={AnimoColors.accentPrimary}
                      style={styles.varietyPillText}>
                      {variety}
                    </AnimoText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Paraan ng bayad
              </AnimoText>
              <View style={styles.greenBadge}>
                <AnimoText variant="bodyEmphasis" color="#166534" style={styles.greenBadgeText}>
                  {profile.preferredPayment}
                </AnimoText>
              </View>
            </View>

            <View style={styles.rowDivider} />

            <View style={styles.tableRow}>
              <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.rowLabel}>
                Kabuuang nabili
              </AnimoText>
              <AnimoText
                variant="bodyEmphasis"
                color={AnimoColors.textHighEmphasis}
                style={styles.rowValue}>
                ~{profile.totalBoughtKg.toLocaleString()} kg
              </AnimoText>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pindutin para bumalik at tingnan ang kasalukuyang kahilingan"
          onPress={() => router.back()}
          style={styles.listingCardOutline}>
          <View style={styles.listingHeaderRow}>
            <View style={styles.listingHeaderLeft}>
              <FileText size={20} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.cardHeaderTitle}>
                Kasalukuyang Kahilingan
              </AnimoText>
            </View>
            <View style={styles.viewListingPill}>
              <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.viewListingText}>
                Tingnan
              </AnimoText>
              <ChevronRight size={16} color={AnimoColors.accentPrimary} />
            </View>
          </View>

          <View style={styles.innerListingBoxOutline}>
            <View style={styles.listingMetricsRow}>
              <View style={styles.listingMetricCol}>
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Dami
                </AnimoText>
                <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.listingQuantity}>
                  {profile.currentRequest.quantity}
                </AnimoText>
              </View>

              <View style={styles.listingMetricColRight}>
                <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
                  Halaga
                </AnimoText>
                <AnimoText variant="h2" color={AnimoColors.accentPrimary} style={styles.listingQuantity}>
                  {profile.currentRequest.total}
                </AnimoText>
              </View>
            </View>

            <View style={styles.innerListingDivider} />

            <View style={styles.listingTimeRight}>
              <Clock size={14} color={AnimoColors.textMediumEmphasis} />
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Nakabinbing kahilingan sa listing na ito.
              </AnimoText>
            </View>
          </View>
        </Pressable>

        <View style={styles.privacyNoteBox}>
          <ShieldCheck size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.privacyNoteText}>
            Ligtas na Transaksyon: Ibibigay ang numero ng mamimili kapag tinanggap mo ang
            kahilingan.
          </AnimoText>
        </View>
      </ScrollView>

      <View style={styles.bottomFooter}>
        <AnimoButton
          label="Bumalik sa Listing"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>

      <TransactionsModal
        profile={profile}
        visible={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
      />
      <FeedbackModal
        profile={profile}
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </SafeAreaView>
  );
}

function TransactionsModal({
  profile,
  visible,
  onClose,
}: {
  profile: BuyerPublicProfile;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContentCard}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <PackageCheck size={22} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                Buod ng Transaksyon
              </AnimoText>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.modalCloseBtn}>
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
                Kabuuang Nabili
              </AnimoText>
              <AnimoText variant="h1" color={AnimoColors.accentPrimary}>
                {profile.totalBoughtKg.toLocaleString()} kg
              </AnimoText>
            </View>
          </View>

          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.textHighEmphasis}
            style={styles.modalSubheading}>
            Mga Kamakailang Transaksyon
          </AnimoText>

          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {profile.recentPurchases.map((item) => (
              <View key={`${item.variety}-${item.quantityKg}`} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  <CheckCircle2 size={18} color={AnimoColors.accentPrimary} />
                </View>
                <View style={styles.historyDetails}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                    {item.quantityKg.toLocaleString()} kg · {item.variety}
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    {item.caption}
                  </AnimoText>
                </View>
              </View>
            ))}
          </ScrollView>

          <AnimoButton label="Isara" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

function FeedbackModal({
  profile,
  visible,
  onClose,
}: {
  profile: BuyerPublicProfile;
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContentCard}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleGroup}>
              <Star size={22} color="#F59E0B" fill="#F59E0B" />
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                Marka at Feedback
              </AnimoText>
            </View>
            <Pressable hitSlop={12} onPress={onClose} style={styles.modalCloseBtn}>
              <X size={22} color={AnimoColors.textMediumEmphasis} />
            </Pressable>
          </View>

          <View style={styles.feedbackRatingHeader}>
            <View style={styles.feedbackRatingBig}>
              <Star size={32} color="#F59E0B" fill="#F59E0B" />
              <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.feedbackScoreText}>
                {profile.averageRating}
              </AnimoText>
            </View>
            <View style={styles.feedbackRatingCol}>
              <View style={styles.miniStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    color="#F59E0B"
                    fill={star <= Math.round(profile.averageRating) ? '#F59E0B' : 'transparent'}
                  />
                ))}
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                {profile.totalReviews} mga review mula sa magsasaka
              </AnimoText>
              <View style={styles.feedbackThumbsRow}>
                <ThumbsUp size={13} color={AnimoColors.accentPrimary} />
                <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.thumbsText}>
                  {profile.reliabilityPct}% Positibong Feedback
                </AnimoText>
              </View>
            </View>
          </View>

          <AnimoText
            variant="bodyEmphasis"
            color={AnimoColors.textHighEmphasis}
            style={styles.modalSubheading}>
            Mga Komento mula sa mga Magsasaka
          </AnimoText>

          <ScrollView style={styles.modalScrollList} showsVerticalScrollIndicator={false}>
            {profile.farmerReviews.map((review) => (
              <View key={review.quote} style={styles.reviewCommentCard}>
                <View style={styles.reviewCommentHeader}>
                  <MessageSquareQuote size={15} color={AnimoColors.accentPrimary} />
                  <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                    Magsasaka · Na-verify na Transaksyon
                  </AnimoText>
                </View>
                <AnimoText
                  variant="body"
                  color={AnimoColors.textHighEmphasis}
                  style={styles.reviewQuoteText}>
                  &quot;{review.quote}&quot;
                </AnimoText>
              </View>
            ))}
          </ScrollView>

          <AnimoButton label="Isara" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF9F4',
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
  bannerBuyerName: {
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
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  listingQuantity: {
    fontSize: 19.5,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  innerListingDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
    paddingHorizontal: AnimoSpacing.xl,
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
