import {
  Award,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  Scale,
  Sprout,
  Star,
  ThumbsUp,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { FarmerPublicProfile } from '@/services/farmer-public-profile';

export type FarmerPublicStatsCardProps = {
  profile: FarmerPublicProfile;
};

export function FarmerPublicStatsCard({ profile }: FarmerPublicStatsCardProps) {
  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.card}>
      {/* Header with avatar & name */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
            {initials || 'M'}
          </AnimoText>
        </View>

        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} numberOfLines={1}>
              {profile.name}
            </AnimoText>
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color={AnimoColors.accentPrimary} />
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              {profile.location}
            </AnimoText>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Award size={18} color={AnimoColors.accentPrimary} />
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
          Talaan ng Transaksyon at Rekord
        </AnimoText>
      </View>

      {/* Key Metric Grid */}
      <View style={styles.metricsGrid}>
        {/* Metric 1: Total Palay Sold */}
        <View style={styles.metricBox}>
          <View style={styles.metricIconWrap}>
            <Scale size={18} color={AnimoColors.accentPrimary} />
          </View>
          <View style={styles.metricTextWrap}>
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              Kabuuang Naibenta
            </AnimoText>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              {profile.totalSoldKg.toLocaleString()} kg
            </AnimoText>
          </View>
        </View>

        {/* Metric 2: Completed Transactions */}
        <View style={styles.metricBox}>
          <View style={styles.metricIconWrap}>
            <PackageCheck size={18} color={AnimoColors.accentPrimary} />
          </View>
          <View style={styles.metricTextWrap}>
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
              Nakumpletong Transaksyon
            </AnimoText>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              {profile.completedTransactionsCount} transaksyon
            </AnimoText>
          </View>
        </View>
      </View>

      {/* Metric 3: Commonly Sold Varieties */}
      <View style={styles.varietySection}>
        <View style={styles.varietyHeader}>
          <Sprout size={18} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Karaniwang Uri ng Palay na Ibinebenta:
          </AnimoText>
        </View>
        <View style={styles.varietyChips}>
          {profile.commonlySoldVarieties.map((variety) => (
            <View key={variety} style={styles.varietyChip}>
              <AnimoText variant="caption" color={AnimoColors.textHighEmphasis}>
                {variety}
              </AnimoText>
            </View>
          ))}
        </View>
      </View>

      {/* Metric 4: Prominent & Bigger Reviews Section */}
      <View style={styles.reviewContainer}>
        <View style={styles.reviewHeaderRow}>
          <View style={styles.bigRatingBadge}>
            <Star size={26} color="#F59E0B" fill="#F59E0B" />
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.ratingNumber}>
              {profile.averageRating}
            </AnimoText>
          </View>

          <View style={styles.ratingSummaryTextWrap}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  color="#F59E0B"
                  fill={star <= Math.round(profile.averageRating) ? '#F59E0B' : 'transparent'}
                />
              ))}
            </View>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              {profile.totalReviews} mga review ng mamimili
            </AnimoText>
            <View style={styles.satisfactionRow}>
              <ThumbsUp size={12} color={AnimoColors.accentPrimary} />
              <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                98% Positibong Feedback
              </AnimoText>
            </View>
          </View>
        </View>

        {/* Sample Buyer Testimonials */}
        <View style={styles.testimonialList}>
          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <MessageSquareQuote size={14} color={AnimoColors.accentPrimary} />
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Mamimili · Na-verify
              </AnimoText>
            </View>
            <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.testimonialQuote}>
              &quot;Napakaganda ng kalidad ng palay, malinis at eksakto ang timbang sa pickup. Maayos kausap ang magsasaka.&quot;
            </AnimoText>
          </View>

          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <MessageSquareQuote size={14} color={AnimoColors.accentPrimary} />
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Mamimili · Na-verify
              </AnimoText>
            </View>
            <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.testimonialQuote}>
              &quot;Mabilis at walang aberya ang transaksyon. Tugma ang moisture sa nakasaad sa listing.&quot;
            </AnimoText>
          </View>
        </View>
      </View>

      {/* Privacy note */}
      <View style={styles.privacyNote}>
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          Ligtas na Transaksyon: Ibibigay ang kumpletong contact number at saktong lokasyon
          ng pickup kapag tinanggap ng magsasaka ang iyong kahilingan.
        </AnimoText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextWrap: {
    gap: 2,
  },
  varietySection: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  varietyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  varietyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  varietyChip: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 4,
  },
  reviewContainer: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.lg,
  },
  bigRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.md,
  },
  ratingNumber: {
    fontSize: 28,
    lineHeight: 32,
  },
  ratingSummaryTextWrap: {
    flex: 1,
    gap: 3,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  satisfactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  testimonialList: {
    gap: AnimoSpacing.sm,
  },
  testimonialCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.sm,
    padding: AnimoSpacing.sm,
    gap: 4,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  testimonialQuote: {
    fontStyle: 'italic',
    fontSize: 13,
    lineHeight: 18,
  },
  privacyNote: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
  },
});
