import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Info, Lock, Star, User } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';
import { fetchOwnRatingForTransaction, submitRating } from '@/services/rating-service';
import { fetchTransaction, fetchTransactionCounterpart } from '@/services/transaction-service';
import type { Rating } from '@/types/rating';
import type { TransactionCounterpart, TransactionMatch } from '@/types/transaction';

const MOOD_KEY: Record<number, TranslationKey> = {
  5: 'frv.mood5',
  4: 'frv.mood4',
  3: 'frv.mood3',
  2: 'frv.mood2',
  1: 'frv.mood1',
  0: 'frv.mood0',
};

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Suriin ang Mamimili. Persists one 1–5 `score` plus optional comment on
 * `rating` (0001 + 0017). The star score is required (nothing is preselected),
 * the comment is optional and screened for flagged words on the server.
 */
export default function ReviewBuyerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();

  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
  const [transaction, setTransaction] = useState<TransactionMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overallRating, setOverallRating] = useState(0);
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
      setError(e instanceof Error ? e.message : t('frv.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <V2BackHeader title={t('frv.title')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        <View style={styles.centerState}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  const buyerName = buyer?.name ?? t('ftx.buyerFallback');

  const handleSubmit = async () => {
    if (!transaction || existing || submitting || overallRating < 1) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const saved = await submitRating({
        transactionId: transaction.id,
        ratedId: transaction.buyerId,
        score: overallRating,
        comment,
      });
      setReviewFlagged(saved.flaggedWordHit);
      setShowSuccessModal(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('frv.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(farmer)/(tabs)/transaksyon');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <V2BackHeader title={t('frv.title')} backLabel={t('ftx.back')} onBack={() => router.back()} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {error ? (
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
              {error}
            </AnimoText>
          ) : null}

          <DepthCard depth="flat">
            <View style={styles.buyerRow}>
              <IconTile icon={User} tone="success" />
              <View style={styles.flex}>
                <AnimoText variant="subheading" numberOfLines={1}>
                  {buyerName}
                </AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('ftx.buyer')}
                </AnimoText>
              </View>
            </View>
          </DepthCard>

          <View style={styles.ratingBlock}>
            <AnimoText variant="heading" style={styles.centerText}>
              {t('frv.heading')}
            </AnimoText>
            <View style={styles.stars} accessibilityRole="radiogroup">
              {STARS.map((star) => {
                const on = star <= overallRating;
                return (
                  <Pressable
                    key={star}
                    accessibilityRole="radio"
                    accessibilityLabel={t('frv.starLabel', { n: star })}
                    accessibilityState={{ selected: star === overallRating, checked: star === overallRating, disabled: !!existing }}
                    disabled={!!existing}
                    hitSlop={4}
                    onPress={() => setOverallRating(star)}
                    style={styles.starBtn}>
                    <Star
                      size={44}
                      strokeWidth={2.25}
                      color={on ? AnimoV2Colors.warningSolid : AnimoV2Colors.edgeSoft}
                      fill={on ? AnimoV2Colors.warningSolid : 'transparent'}
                    />
                  </Pressable>
                );
              })}
            </View>
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
              {overallRating > 0 ? `${overallRating}/5  ·  ` : ''}
              {t(MOOD_KEY[overallRating])}
            </AnimoText>
          </View>

          <View>
            <TextField
              label={t('frv.commentLabel')}
              placeholder={t('frv.commentPlaceholder')}
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              editable={!existing}
              hint={`${comment.length}/500`}
            />
          </View>

          <View style={styles.note}>
            <IconTile icon={existing ? Check : Lock} tone="success" size={36} />
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
              {existing ? t('frv.already') : t('frv.visibleNote')}
            </AnimoText>
          </View>
        </ScrollView>

        <StickyFooter>
          {submitError ? (
            <View style={styles.errorRow}>
              <Info size={18} color={AnimoV2Colors.dangerFg} strokeWidth={3} />
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.flex}>
                {submitError}
              </AnimoText>
            </View>
          ) : null}
          {existing ? (
            <ChunkyButton label={t('ftx.backToTx')} icon={Check} onPress={handleSkip} />
          ) : (
            <>
              <ChunkyButton
                label={t('frv.submit')}
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting || !transaction || overallRating < 1}
              />
              <ChunkyButton label={t('frv.skip')} variant="ghost" onPress={handleSkip} />
            </>
          )}
        </StickyFooter>
      </KeyboardAvoidingView>

      <V2Dialog
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
        icon={Check}
        iconTone="success"
        title={t('frv.thanksTitle')}
        message={t('frv.thanksMsg', { name: buyerName }) + (reviewFlagged ? t('frv.flagged') : '')}
        dismissable={false}
        actions={
          <ChunkyButton
            label={t('ftx.backToTx')}
            onPress={() => {
              setShowSuccessModal(false);
              router.replace('/(farmer)/(tabs)/transaksyon');
            }}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, minWidth: 0 },
  centerText: { textAlign: 'center' },
  content: { paddingHorizontal: AnimoV2Spacing.lg, paddingBottom: AnimoV2Spacing.xl, gap: AnimoV2Spacing.lg },
  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md, padding: AnimoV2Spacing.lg },
  ratingBlock: { alignItems: 'center', gap: AnimoV2Spacing.md },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: AnimoV2Spacing.xs },
  starBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    borderWidth: 2,
    borderColor: AnimoV2Colors.brandLight,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
