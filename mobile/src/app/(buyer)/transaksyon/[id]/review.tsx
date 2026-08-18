import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Lock, Star, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ScreenHeader } from '@/components/animo/screen-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import { fetchOwnRatingForTransaction, submitRating } from '@/services/rating-service';
import { fetchTransactionByRequestId, fetchTransactionCounterpart } from '@/services/transaction-service';
import type { Rating } from '@/types/rating';
import type { PurchaseOutcome, TransactionCounterpart } from '@/types/transaction';

const RATING_MOODS: Record<number, string> = {
  5: 'Napakahusay!',
  4: 'Magaling!',
  3: 'Katamtaman',
  2: 'Kulang pa',
  1: 'Hindi maganda',
  0: 'Pumili ng marka',
};

const STAR_GOLD = '#F5A623';

/**
 * Suriin ang Magsasaka. Persists one 1–5 `score` plus optional comment on
 * `rating` (0001 + 0017). Detail-star rows below are UX only.
 */
export default function ReviewFarmerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(5);
  const [qualityRating, setQualityRating] = useState(5);
  const [weightRating, setWeightRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [timelinessRating, setTimelinessRating] = useState(5);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState<Rating | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang transaksyon.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Suriin ang Magsasaka" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Suriin ang Magsasaka" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {error ?? 'Hindi nahanap ang transaksyon na ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const farmerName = counterpart?.name ?? 'Magsasaka';

  const handleSubmit = async () => {
    if (existing || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitRating({
        transactionId: outcome.transaction.id,
        ratedId: outcome.transaction.farmerId,
        score: overallRating,
        comment,
      });
      setShowSuccessModal(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Hindi naisumite ang review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(buyer)/transaksyon');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Suriin ang Magsasaka" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.farmerRow}>
              <View style={styles.avatar}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                  {farmerName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase() ?? '')
                    .join('')}
                </AnimoText>
              </View>
              <View style={styles.farmerText}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  {farmerName}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Magsasaka
                </AnimoText>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.centerCard]}>
            <AnimoText variant="caption" color={AnimoColors.muted} style={styles.textCenter}>
              Pangkalahatang Marka
            </AnimoText>
            <AnimoText variant="h1" color={AnimoColors.black} style={styles.textCenter}>
              {RATING_MOODS[overallRating]}
            </AnimoText>

            <View style={styles.starRowBig}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} hitSlop={8} onPress={() => !existing && setOverallRating(star)} style={styles.starTouch}>
                  <Star size={36} color={star <= overallRating ? STAR_GOLD : AnimoColors.border} fill={star <= overallRating ? STAR_GOLD : 'transparent'} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalyadong Marka
            </AnimoText>
            <StarCriterionRow label="Kalidad ng palay" value={qualityRating} onChange={setQualityRating} disabled={!!existing} />
            <StarCriterionRow label="Tugma ang timbang" value={weightRating} onChange={setWeightRating} disabled={!!existing} />
            <StarCriterionRow label="Komunikasyon" value={communicationRating} onChange={setCommunicationRating} disabled={!!existing} />
            <StarCriterionRow label="Pagiging maagap" value={timelinessRating} onChange={setTimelinessRating} disabled={!!existing} />
          </View>

          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Magdagdag ng komento (opsyonal)
            </AnimoText>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Ikwento ang iyong karanasan sa magsasaka..."
                placeholderTextColor={AnimoColors.muted}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={comment}
                onChangeText={setComment}
                editable={!existing}
              />
              <AnimoText variant="tag" color={AnimoColors.muted} style={styles.counter}>
                {comment.length}/500
              </AnimoText>
            </View>
          </View>

          <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
            {existing
              ? 'Naisumite mo na ang review para sa transaksyong ito.'
              : 'Makikita ng ibang mamimili ang review na ito sa profile ng magsasaka.'}
          </NoticeBanner>
        </ScrollView>

        <View style={styles.footerStack}>
          {submitError ? (
            <AnimoText variant="caption" color={AnimoColors.danger}>
              {submitError}
            </AnimoText>
          ) : null}
          {existing ? (
            <AnimoButton label="Bumalik sa Transaksyon" icon={Check} onPress={handleSkip} />
          ) : (
            <>
              <AnimoButton
                label="Isumite ang Review"
                icon={Check}
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
              />
              <AnimoButton label="Laktawan Muna" variant="secondary" icon={X} onPress={handleSkip} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <FeedbackModal
        visible={showSuccessModal}
        tone="success"
        title="Salamat sa Review!"
        message={`Matagumpay na naitala ang iyong marka at komento para kay ${farmerName}.`}
        confirmLabel="Bumalik sa Transaksyon"
        onConfirm={() => {
          setShowSuccessModal(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />
    </SafeAreaView>
  );
}

function StarCriterionRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.criterionRow}>
      <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.flex}>
        {label}
      </AnimoText>
      <View style={styles.starRowMedium}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => !disabled && onChange(star)} hitSlop={8} style={styles.starMediumTouch}>
            <Star size={24} color={star <= value ? STAR_GOLD : AnimoColors.border} fill={star <= value ? STAR_GOLD : 'transparent'} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.background },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoSpacing.xl },
  content: { paddingHorizontal: AnimoSpacing.xl, paddingBottom: AnimoSpacing.xl, gap: AnimoSpacing.lg },
  card: { borderWidth: 1, borderColor: AnimoColors.border, borderRadius: AnimoRadius.lg, padding: AnimoSpacing.lg, gap: AnimoSpacing.sm, backgroundColor: AnimoColors.white },
  centerCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: AnimoSpacing.xl, gap: AnimoSpacing.md },
  textCenter: { textAlign: 'center' },
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: AnimoColors.greenTint, alignItems: 'center', justifyContent: 'center' },
  farmerText: { flex: 1, gap: 2 },
  starRowBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: AnimoSpacing.sm, paddingVertical: AnimoSpacing.xs },
  starTouch: { padding: 3 },
  criterionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: AnimoSpacing.sm },
  starRowMedium: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starMediumTouch: { padding: 2 },
  textareaContainer: { borderWidth: 1, borderColor: AnimoColors.border, borderRadius: AnimoRadius.md, padding: AnimoSpacing.md, backgroundColor: AnimoColors.surface, marginTop: AnimoSpacing.xs, gap: AnimoSpacing.xs },
  textarea: { fontSize: 16, color: AnimoColors.black, minHeight: 90 },
  counter: { alignSelf: 'flex-end' },
  footerStack: { paddingHorizontal: AnimoSpacing.xl, paddingTop: AnimoSpacing.md, paddingBottom: AnimoSpacing.md, gap: AnimoSpacing.sm, backgroundColor: AnimoColors.background },
});
