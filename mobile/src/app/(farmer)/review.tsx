import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Lock, Star, User, X } from 'lucide-react-native';
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
import { fetchOwnRatingForTransaction, submitRating } from '@/services/rating-service';
import { fetchTransaction, fetchTransactionCounterpart } from '@/services/transaction-service';
import type { Rating } from '@/types/rating';
import type { TransactionCounterpart, TransactionMatch } from '@/types/transaction';

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
 * Suriin ang Mamimili. Persists one 1–5 `score` plus optional comment on
 * `rating` (0001 + 0017). Detail-star rows below are UX only.
 */
export default function ReviewBuyerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
  const [transaction, setTransaction] = useState<TransactionMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(5);
  const [paymentRating, setPaymentRating] = useState(5);
  const [communicationRating, setCommunicationRating] = useState(5);
  const [punctualityRating, setPunctualityRating] = useState(5);
  const [conductRating, setConductRating] = useState(5);
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
      const tx = await fetchTransaction(id);
      if (!tx) {
        setBuyer(null);
        setTransaction(null);
        return;
      }
      setTransaction(tx);
      setBuyer(await fetchTransactionCounterpart(tx.buyerId));
      const already = await fetchOwnRatingForTransaction(tx.id);
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
        <ScreenHeader title="Suriin ang Mamimili" />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const buyerName = buyer?.name ?? 'Mamimili';

  const handleSubmit = async () => {
    if (!transaction || existing || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitRating({
        transactionId: transaction.id,
        ratedId: transaction.buyerId,
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
    router.replace('/(farmer)/(tabs)/transaksyon');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Suriin ang Mamimili" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {error ? (
            <AnimoText variant="caption" color={AnimoColors.danger}>
              {error}
            </AnimoText>
          ) : null}

          <View style={styles.card}>
            <View style={styles.buyerRow}>
              <View style={styles.avatar}>
                <User size={22} color={AnimoColors.accentPrimary} />
              </View>
              <View style={styles.buyerText}>
                <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
                  {buyerName}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                  Mamimili
                </AnimoText>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.centerCard]}>
            <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
              Pangkalahatang Marka
            </AnimoText>
            <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
              {RATING_MOODS[overallRating]}
            </AnimoText>

            <View style={styles.starRowBig}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} hitSlop={8} onPress={() => !existing && setOverallRating(star)} style={styles.starTouch}>
                  <Star size={36} color={star <= overallRating ? STAR_GOLD : AnimoColors.borderLowEmphasis} fill={star <= overallRating ? STAR_GOLD : 'transparent'} />
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Detalyadong Marka
            </AnimoText>
            <StarCriterionRow label="Pagbabayad sa tamang oras" value={paymentRating} onChange={setPaymentRating} disabled={!!existing} />
            <StarCriterionRow label="Komunikasyon" value={communicationRating} onChange={setCommunicationRating} disabled={!!existing} />
            <StarCriterionRow label="Pagsunod sa oras" value={punctualityRating} onChange={setPunctualityRating} disabled={!!existing} />
            <StarCriterionRow label="Pakikitungo sa transaksyon" value={conductRating} onChange={setConductRating} disabled={!!existing} />
          </View>

          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
              Magdagdag ng komento (opsyonal)
            </AnimoText>
            <View style={styles.textareaContainer}>
              <TextInput
                style={styles.textarea}
                placeholder="Ikwento ang iyong karanasan sa mamimili..."
                placeholderTextColor={AnimoColors.textLowEmphasis}
                multiline
                numberOfLines={4}
                maxLength={500}
                value={comment}
                onChangeText={setComment}
                editable={!existing}
                textAlignVertical="top"
              />
              <AnimoText variant="tag" color={AnimoColors.textLowEmphasis} style={styles.counter}>
                {comment.length}/500
              </AnimoText>
            </View>
          </View>

          <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
            {existing
              ? 'Naisumite mo na ang review para sa transaksyong ito.'
              : 'Makikita ng ibang magsasaka ang review na ito sa profile ng mamimili.'}
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
                disabled={submitting || !transaction}
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
        message={`Matagumpay na naitala ang iyong marka at komento para kay ${buyerName}.`}
        confirmLabel="Bumalik sa Transaksyon"
        onConfirm={() => {
          setShowSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
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
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.flex}>
        {label}
      </AnimoText>
      <View style={styles.starRowMedium}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} onPress={() => !disabled && onChange(star)} hitSlop={8} style={styles.starMediumTouch}>
            <Star size={24} color={star <= value ? STAR_GOLD : AnimoColors.borderLowEmphasis} fill={star <= value ? STAR_GOLD : 'transparent'} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  content: { paddingHorizontal: AnimoSpacing.lg, paddingBottom: AnimoSpacing.xl, gap: AnimoSpacing.lg },
  card: { borderWidth: 1, borderColor: AnimoColors.borderLowEmphasis, borderRadius: AnimoRadius.lg, padding: AnimoSpacing.lg, gap: AnimoSpacing.sm, backgroundColor: AnimoColors.surfacePrimary },
  centerCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: AnimoSpacing.xl, gap: AnimoSpacing.md },
  textCenter: { textAlign: 'center' },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: AnimoColors.accentPrimaryLight, alignItems: 'center', justifyContent: 'center' },
  buyerText: { flex: 1, gap: 2 },
  starRowBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: AnimoSpacing.sm, paddingVertical: AnimoSpacing.xs },
  starTouch: { padding: 3 },
  criterionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: AnimoSpacing.sm },
  starRowMedium: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  starMediumTouch: { padding: 2 },
  textareaContainer: { borderWidth: 1, borderColor: AnimoColors.borderLowEmphasis, borderRadius: AnimoRadius.md, padding: AnimoSpacing.md, backgroundColor: AnimoColors.surfaceSecondary, marginTop: AnimoSpacing.xs, gap: AnimoSpacing.xs },
  textarea: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular', color: AnimoColors.textHighEmphasis, minHeight: 90 },
  counter: { alignSelf: 'flex-end' },
  footerStack: { paddingHorizontal: AnimoSpacing.lg, paddingTop: AnimoSpacing.md, paddingBottom: AnimoSpacing.md, gap: AnimoSpacing.sm, backgroundColor: AnimoColors.appBackground, borderTopWidth: 1, borderTopColor: AnimoColors.borderLowEmphasis },
});
