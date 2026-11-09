import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Info, Star, UserRound, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BuyerFeedbackDialog, InfoNote, TxnHeader } from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { buyerTransactionsHref } from '@/lib/buyer-transactions-nav';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import { fetchOwnRatingForTransaction, submitRating } from '@/services/rating-service';
import { fetchTransactionByRequestId, fetchTransactionCounterpart } from '@/services/transaction-service';
import type { Rating } from '@/types/rating';
import type { PurchaseOutcome, TransactionCounterpart } from '@/types/transaction';

const RATING_MOODS_TL: Record<number, string> = {
  5: 'Napakahusay!',
  4: 'Magaling!',
  3: 'Katamtaman',
  2: 'Kulang pa',
  1: 'Hindi maganda',
  0: 'Pumili ng marka',
};

const RATING_MOODS_EN: Record<number, string> = {
  5: 'Outstanding!',
  4: 'Great!',
  3: 'Average',
  2: 'Needs Improvement',
  1: 'Poor',
  0: 'Select a rating',
};

/**
 * Suriin ang Magsasaka. Persists one 1–5 `score` plus optional comment on
 * `rating` (0001 + 0017). Detail-star rows below are UX only.
 */
export default function ReviewFarmerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isTagalog } = useLanguage();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(5);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState<Rating | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reviewFlagged, setReviewFlagged] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const request = await fetchPurchaseRequest(id);
      const transaction = request ? await fetchTransactionByRequestId(id) : null;
      if (!request || !transaction) {
        setOutcome(null);
        return;
      }
      setOutcome({ kind: 'matched', request, transaction });
      setCounterpart(await fetchTransactionCounterpart(transaction.farmerId));
      const already = await fetchOwnRatingForTransaction(transaction.id);
      setExisting(already);
      if (already) {
        setOverallRating(already.score);
        setComment(already.comment ?? '');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (isTagalog ? 'Hindi ma-load ang transaksyon.' : 'Failed to load transaction.'));
    } finally {
      setLoading(false);
    }
  }, [id, isTagalog]);

  useEffect(() => {
    load();
  }, [load]);

  const screenTitle = isTagalog ? 'Suriin ang Magsasaka' : 'Review Farmer';
  const ratingMoods = isTagalog ? RATING_MOODS_TL : RATING_MOODS_EN;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={screenTitle} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={screenTitle} />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoV2Colors.textSecondary}>
            {error ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction not found.')}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const farmerName = counterpart?.name ?? (isTagalog ? 'Magsasaka' : 'Farmer');

  const handleSubmit = async () => {
    if (existing || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await submitRating({
        transactionId: outcome.transaction.id,
        ratedId: outcome.transaction.farmerId,
        score: overallRating,
        comment,
      });
      setReviewFlagged(saved.flaggedWordHit);
      setShowSuccessModal(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : (isTagalog ? 'Hindi naisumite ang review.' : 'Failed to submit review.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.dismissTo(buyerTransactionsHref('tapos'));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title={screenTitle} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <DepthCard depth="flat" radius="xl" style={styles.farmerCard}>
            <IconTile icon={UserRound} tone="success" />
            <View style={styles.farmerText}>
              <AnimoText variant="subheading" numberOfLines={2}>
                {farmerName}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {isTagalog ? 'Magsasaka' : 'Farmer'}
              </AnimoText>
            </View>
          </DepthCard>

          <DepthCard radius="xl" style={styles.ratingCard}>
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
              {isTagalog ? 'I-rate ang magsasaka' : 'Rate the farmer'}
            </AnimoText>
            <AnimoText variant="heading" style={styles.centerText}>
              {ratingMoods[overallRating]}
            </AnimoText>

            <View style={styles.starRow} accessibilityRole="radiogroup">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: star === overallRating, disabled: !!existing }}
                  accessibilityLabel={isTagalog ? `${star} bituin` : `${star} star${star > 1 ? 's' : ''}`}
                  hitSlop={4}
                  onPress={() => !existing && setOverallRating(star)}
                  style={styles.starTouch}>
                  <Star
                    size={40}
                    strokeWidth={2.5}
                    color={star <= overallRating ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
                    fill={star <= overallRating ? AnimoV2Colors.warningSolid : 'transparent'}
                  />
                </Pressable>
              ))}
            </View>
          </DepthCard>

          <TextField
            label={isTagalog ? 'Magdagdag ng komento (opsyonal)' : 'Add a comment (optional)'}
            placeholder={isTagalog ? 'Ikwento ang iyong karanasan sa magsasaka...' : 'Share your experience with the farmer...'}
            multiline
            maxLength={500}
            value={comment}
            onChangeText={setComment}
            editable={!existing}
            hint={`${comment.length}/500`}
          />

          <InfoNote tone="neutral" icon={Info}>
            {existing
              ? (isTagalog ? 'Naisumite mo na ang review para sa transaksyong ito.' : 'You have already submitted a review for this transaction.')
              : (isTagalog ? 'Makikita ng ibang mamimili ang review na ito sa profile ng magsasaka.' : 'Other buyers will see this review on the farmer\'s profile.')}
          </InfoNote>
        </ScrollView>

        <StickyFooter>
          {submitError ? (
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
              {submitError}
            </AnimoText>
          ) : null}
          {existing ? (
            <ChunkyButton label={isTagalog ? 'Bumalik sa Transaksyon' : 'Back to Transactions'} icon={Check} onPress={handleSkip} />
          ) : (
            <>
              <ChunkyButton
                label={isTagalog ? 'Isumite ang Review' : 'Submit Review'}
                icon={Check}
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
              />
              <ChunkyButton label={isTagalog ? 'Laktawan Muna' : 'Skip for Now'} variant="secondary" icon={X} onPress={handleSkip} />
            </>
          )}
        </StickyFooter>
      </KeyboardAvoidingView>

      <BuyerFeedbackDialog
        visible={showSuccessModal}
        tone="success"
        title={isTagalog ? 'Salamat sa Review!' : 'Thank You for the Review!'}
        message={
          (isTagalog
            ? `Matagumpay na naitala ang iyong marka at komento para kay ${farmerName}.`
            : `Your rating and comment for ${farmerName} have been recorded successfully.`) +
          (reviewFlagged
            ? isTagalog
              ? ' Na-flag ang komento para sa LGU dahil sa ginamit na salita.'
              : ' The comment was flagged for the LGU because of a word it used.'
            : '')
        }
        confirmLabel={isTagalog ? 'Bumalik sa Transaksyon' : 'Back to Transactions'}
        onConfirm={() => {
          setShowSuccessModal(false);
          router.dismissTo(buyerTransactionsHref('tapos'));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.lg,
  },
  farmerText: { flex: 1, minWidth: 0, gap: 2 },
  ratingCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.sm, alignItems: 'center' },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: AnimoV2Spacing.xs },
  starTouch: { padding: AnimoV2Spacing.xs },
});
