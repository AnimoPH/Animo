import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Banknote, Check, CheckCircle2, Lock, TriangleAlert } from 'lucide-react-native';
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
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import { confirmPaymentSent, fetchTransactionByRequestId } from '@/services/transaction-service';
import { requestTotal, type PurchaseOutcome } from '@/types/transaction';

type DiscrepancyReason = 'Mas mababa/mataas ang timbang' | 'Magkaiba ang grade' | 'Iba ang variant' | 'Iba pa';

const REASON_OPTIONS: DiscrepancyReason[] = [
  'Mas mababa/mataas ang timbang',
  'Magkaiba ang grade',
  'Iba ang variant',
  'Iba pa',
];

/**
 * Kumpirmasyon ng Bayad — reads the real recorded payment and calls
 * `buyer_confirm_payment_sent`. There is no separate discrepancy-record RPC
 * in this schema: both the match and mismatch paths end up calling the same
 * confirm-sent action, so a discrepancy reason is a client-only note for the
 * buyer's own clarity, never actually delivered to the farmer or an LGU.
 */
export default function PaymentConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReason, setSelectedReason] = useState<DiscrepancyReason | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const request = await fetchPurchaseRequest(id);
      const transaction = request ? await fetchTransactionByRequestId(id) : null;
      if (!request || !transaction) {
        setOutcome(null);
        return;
      }
      setOutcome({ kind: 'matched', request, transaction });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Hindi ma-load ang transaksyon.');
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
        <ScreenHeader title="Kumpirmasyon ng Bayad" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  const payment = outcome?.kind === 'matched' ? outcome.transaction.payment : null;

  if (!outcome || outcome.kind !== 'matched' || !payment || loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Kumpirmasyon ng Bayad" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {loadError ?? 'Wala pang naitalang bayad para sa transaksyong ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const agreedTotal = requestTotal(outcome);
  const actualAmount = payment.amount;
  const difference = actualAmount - agreedTotal;
  const isMatch = Math.abs(difference) < 0.01;

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await confirmPaymentSent(payment.id);
      setShowConfirmModal(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Hindi makumpirma ang bayad.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Kumpirmasyon ng Bayad" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {isMatch ? (
            <>
              <View style={styles.card}>
                <View style={styles.bannerRow}>
                  <View style={[styles.bannerIcon, styles.bannerIconSuccess]}>
                    <CheckCircle2 size={22} color={AnimoColors.green} />
                  </View>
                  <View style={styles.bannerText}>
                    <AnimoText variant="h3" color={AnimoColors.black}>
                      Tugma ang Halaga
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted}>
                      Naitala ang bayad na binigay
                    </AnimoText>
                  </View>
                </View>
                <View style={styles.bannerMeta}>
                  <StatusBadge label="Naitala" tone="success" />
                </View>
              </View>

              <View style={styles.card}>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Halagang Binayaran
                </AnimoText>
                <AnimoText variant="h1" color={AnimoColors.black}>
                  {formatPeso(actualAmount)}
                </AnimoText>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Napagkasunduang presyo
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(agreedTotal)}
                  </AnimoText>
                </View>
                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Pagkakaiba
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    ₱0.00 · Tugma
                  </AnimoText>
                </View>
              </View>

              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Paraan ng Bayad
                </AnimoText>
                <View style={styles.methodInfoBox}>
                  <View style={styles.methodRow}>
                    {payment.paymentMode === 'GCash' ? (
                      <View style={styles.gcashLogo}>
                        <AnimoText variant="tag" color={AnimoColors.white}>
                          GCash
                        </AnimoText>
                      </View>
                    ) : (
                      <View style={styles.cashLogo}>
                        <Banknote size={18} color={AnimoColors.green} />
                      </View>
                    )}
                    <View style={styles.methodTexts}>
                      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                        {payment.paymentMode === 'GCash' ? 'GCash Transfer' : 'Cash'}
                      </AnimoText>
                      {payment.gcashReferenceNumber ? (
                        <AnimoText variant="caption" color={AnimoColors.muted}>
                          Ref: {payment.gcashReferenceNumber}
                        </AnimoText>
                      ) : null}
                    </View>
                    <Check size={18} color={AnimoColors.green} strokeWidth={3} />
                  </View>
                </View>
              </View>

              <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
                Tugma ang halaga kaya hindi na kailangan ng paliwanag.
              </NoticeBanner>
            </>
          ) : (
            <>
              <View style={[styles.card, styles.warningCard]}>
                <View style={styles.bannerRow}>
                  <View style={[styles.bannerIcon, styles.bannerIconWarning]}>
                    <TriangleAlert size={22} color="#B4791A" />
                  </View>
                  <View style={styles.bannerText}>
                    <AnimoText variant="h3" color={AnimoColors.black}>
                      Hindi Tugma ang Halaga
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.blackSecondary}>
                      {difference > 0
                        ? 'Mas mataas ang binayaran kaysa napagkasunduang presyo'
                        : 'Mas mababa ang binayaran kaysa napagkasunduang presyo'}
                    </AnimoText>
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Halagang Binayaran
                </AnimoText>
                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Napagkasunduang presyo
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(agreedTotal)}
                  </AnimoText>
                </View>
                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Halagang binayaran
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(actualAmount)}
                  </AnimoText>
                </View>
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Pagkakaiba
                  </AnimoText>
                  <AnimoText variant="price" color={difference > 0 ? '#B4791A' : AnimoColors.danger}>
                    {difference > 0 ? `+${formatPeso(difference)}` : `-${formatPeso(Math.abs(difference))}`}
                  </AnimoText>
                </View>
              </View>

              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Tandaan ang Pagkakaiba (para sa iyo lang)
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Hindi ito ipinapadala kaninuman — sanggunian mo lang ito bago magpatuloy.
                </AnimoText>

                <View style={styles.chipGroup}>
                  {REASON_OPTIONS.map((reason) => (
                    <Pressable
                      key={reason}
                      style={[styles.chip, selectedReason === reason && styles.chipActive]}
                      onPress={() => setSelectedReason(reason)}>
                      <AnimoText variant="caption" color={selectedReason === reason ? AnimoColors.green : AnimoColors.black}>
                        {reason}
                      </AnimoText>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.textareaContainer}>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Isulat ang tala dito..."
                    placeholderTextColor={AnimoColors.muted}
                    multiline
                    numberOfLines={4}
                    maxLength={300}
                    value={explanation}
                    onChangeText={setExplanation}
                    textAlignVertical="top"
                  />
                  <AnimoText variant="tag" color={AnimoColors.muted} style={styles.counter}>
                    {explanation.length}/300
                  </AnimoText>
                </View>
              </View>
            </>
          )}

          {submitError ? (
            <AnimoText variant="caption" color={AnimoColors.danger}>
              {submitError}
            </AnimoText>
          ) : null}
        </ScrollView>

        <View style={styles.footerStack}>
          <AnimoButton
            label={submitting ? 'Ipinapadala…' : isMatch ? 'Kumpirmahin ang Bayad' : 'Kumpirmahin Pa Rin'}
            onPress={handleConfirm}
            disabled={submitting || (!isMatch && !selectedReason)}
          />
        </View>
      </KeyboardAvoidingView>

      <FeedbackModal
        visible={showConfirmModal}
        tone="success"
        title="Naipadala ang Kumpirmasyon"
        message={`Naghihintay na ngayon ng kumpirmasyon ng magsasaka na natanggap ang bayad na ${formatPeso(actualAmount)}.`}
        confirmLabel="Tingnan ang Resibo"
        onConfirm={() => {
          setShowConfirmModal(false);
          router.replace(`/(buyer)/transaksyon/${outcome.request.id}/resibo`);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.background },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoSpacing.xl },
  content: { paddingHorizontal: AnimoSpacing.xl, paddingBottom: AnimoSpacing.xl, gap: AnimoSpacing.lg },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  warningCard: { borderColor: '#F0D79A', backgroundColor: '#FDF6E4' },
  bannerRow: { flexDirection: 'row', gap: AnimoSpacing.md, alignItems: 'center' },
  bannerIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  bannerIconSuccess: { backgroundColor: AnimoColors.greenTint },
  bannerIconWarning: { backgroundColor: '#FBF0D9' },
  bannerText: { flex: 1, gap: 2 },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.sm, marginTop: AnimoSpacing.xs },
  divider: { height: 1, backgroundColor: AnimoColors.border, marginVertical: AnimoSpacing.xs },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: AnimoSpacing.sm },
  methodInfoBox: {
    borderWidth: 1,
    borderColor: AnimoColors.green,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.greenTint,
  },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.md },
  gcashLogo: { backgroundColor: '#0B76D1', borderRadius: AnimoRadius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  cashLogo: { backgroundColor: AnimoColors.white, borderRadius: AnimoRadius.sm, padding: 6 },
  methodTexts: { flex: 1, gap: 1 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoSpacing.sm, marginTop: AnimoSpacing.xs },
  chip: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.surface,
  },
  chipActive: { borderColor: AnimoColors.green, backgroundColor: AnimoColors.greenTint },
  textareaContainer: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    marginTop: AnimoSpacing.xs,
    gap: AnimoSpacing.xs,
  },
  textarea: { fontSize: 16, color: AnimoColors.black, minHeight: 80 },
  counter: { alignSelf: 'flex-end' },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
});
