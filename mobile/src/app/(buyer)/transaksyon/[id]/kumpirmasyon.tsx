import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Banknote, CheckCircle2, Info, Smartphone, TriangleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { useSession } from '@/hooks/use-session';
import { isOnlineNow, isSignalError, saveBuyerConfirmOffline } from '@/lib/outbox/enqueue-actions';
import {
  BuyerFeedbackDialog,
  DetailRow,
  Divider,
  InfoNote,
  TxnHeader,
} from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import { confirmPaymentSent, fetchTransactionByRequestId } from '@/services/transaction-service';
import { TransactionSummaryCard } from '@/components/animo/transaction-cycle-cards';
import type { CropListing } from '@/types/crop-listing';
import { useLanguage } from '@/hooks/use-language';
import { formatReferenceId, requestTotal, type PurchaseOutcome } from '@/types/transaction';

type DiscrepancyReason = string;

const REASON_OPTIONS_TL = [
  'Mas mababa/mataas ang timbang',
  'Magkaiba ang grade',
  'Iba ang variant',
  'Iba pa',
];

const REASON_OPTIONS_EN = [
  'Weight is higher/lower',
  'Different grade',
  'Different variety',
  'Other',
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
  const { language, isTagalog } = useLanguage();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReason, setSelectedReason] = useState<DiscrepancyReason | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const { account } = useSession();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const reasons = isTagalog ? REASON_OPTIONS_TL : REASON_OPTIONS_EN;

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
      setListing(await fetchCropListing(request.listingId));
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : isTagalog
            ? 'Hindi ma-load ang transaksyon.'
            : 'Failed to load transaction.',
      );
    } finally {
      setLoading(false);
    }
  }, [id, isTagalog]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={isTagalog ? 'Kumpirmasyon ng Bayad' : 'Payment Confirmation'} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const payment = outcome?.kind === 'matched' ? outcome.transaction.payment : null;

  if (!outcome || outcome.kind !== 'matched' || !payment || loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={isTagalog ? 'Kumpirmasyon ng Bayad' : 'Payment Confirmation'} />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoV2Colors.textSecondary}>
            {loadError ?? (isTagalog ? 'Wala pang naitalang bayad para sa transaksyong ito.' : 'No payment recorded yet for this transaction.')}
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
    const saveOffline = async () => {
      if (!account) return false;
      await saveBuyerConfirmOffline(account.id, payment.id);
      setSavedOffline(true);
      return true;
    };
    try {
      if (!(await isOnlineNow())) {
        await saveOffline();
        return;
      }
      await confirmPaymentSent(payment.id);
      setShowConfirmModal(true);
    } catch (e) {
      // The signal dropped before the confirm reached the server: keep it instead of losing it.
      if (isSignalError(e) && (await saveOffline().catch(() => false))) return;
      setSubmitError(
        e instanceof Error
          ? e.message
          : isTagalog
            ? 'Hindi makumpirma ang bayad.'
            : 'Failed to confirm payment.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title={isTagalog ? 'Kumpirmasyon ng Bayad' : 'Payment Confirmation'} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {listing ? (
            <TransactionSummaryCard
              listing={listing}
              quantityKg={outcome.transaction.quantityKg}
              pricePerKg={outcome.transaction.agreedPricePerKg}
              totalAmount={agreedTotal}
              referenceId={formatReferenceId(outcome.request.id, 'PR')}
              language={language}
            />
          ) : null}
          {isMatch ? (
            <>
              <DepthCard depth="flat" radius="xl" style={styles.card}>
                <StatusPill tone="success" label={isTagalog ? 'Naitala' : 'Recorded'} />
                <View style={styles.bannerRow}>
                  <IconTile icon={CheckCircle2} tone="success" />
                  <View style={styles.bannerText}>
                    <AnimoText variant="subheading">{isTagalog ? 'Tugma ang Halaga' : 'Amount Matches'}</AnimoText>
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                      {isTagalog ? 'Naitala ang bayad na binigay' : 'Payment recorded accurately'}
                    </AnimoText>
                  </View>
                </View>
              </DepthCard>

              <PaidAmountCard actualAmount={actualAmount} agreedTotal={agreedTotal} isTagalog={isTagalog} />

              <DepthCard depth="flat" radius="xl" style={styles.card}>
                <AnimoText variant="subheading">{isTagalog ? 'Paraan ng Bayad' : 'Payment Mode'}</AnimoText>
                <View style={styles.bannerRow}>
                  <IconTile icon={payment.paymentMode === 'GCash' ? Smartphone : Banknote} tone="success" size={40} />
                  <View style={styles.bannerText}>
                    <AnimoText variant="bodyStrong">
                      {payment.paymentMode === 'GCash' ? 'GCash Transfer' : 'Cash'}
                    </AnimoText>
                    {payment.gcashReferenceNumber ? (
                      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                        Ref: {payment.gcashReferenceNumber}
                      </AnimoText>
                    ) : null}
                  </View>
                </View>
              </DepthCard>

              <InfoNote tone="neutral" icon={Info}>
                {isTagalog
                  ? 'Tugma ang halaga kaya hindi na kailangan ng paliwanag.'
                  : 'Amount matches; no explanation needed.'}
              </InfoNote>
            </>
          ) : (
            <>
              <DepthCard depth="flat" radius="xl" backgroundColor={AnimoV2Colors.warningBg} borderColor={AnimoV2Colors.warningSolid} style={styles.card}>
                <View style={styles.bannerRow}>
                  <IconTile icon={TriangleAlert} tone="warning" solid />
                  <View style={styles.bannerText}>
                    <AnimoText variant="subheading">{isTagalog ? 'Hindi Tugma ang Halaga' : 'Amount Mismatch'}</AnimoText>
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                      {difference > 0
                        ? isTagalog
                          ? 'Mas mataas ang binayaran kaysa napagkasunduang presyo'
                          : 'Amount paid is higher than agreed price'
                        : isTagalog
                          ? 'Mas mababa ang binayaran kaysa napagkasunduang presyo'
                          : 'Amount paid is lower than agreed price'}
                    </AnimoText>
                  </View>
                </View>
              </DepthCard>

              <PaidAmountCard actualAmount={actualAmount} agreedTotal={agreedTotal} isTagalog={isTagalog} />

              <DepthCard depth="flat" radius="xl" style={styles.card}>
                <AnimoText variant="subheading">
                  {isTagalog
                    ? 'Tandaan ang Pagkakaiba (para sa iyo lang)'
                    : 'Note Discrepancy (for your reference)'}
                </AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {isTagalog
                    ? 'Opsyonal lang ang talang ito. Hindi ito sine-save o ipinapadala at mawawala kapag umalis ka sa pahinang ito.'
                    : 'This optional note is not saved or sent to anyone and will be lost when you leave this screen.'}
                </AnimoText>

                <View style={styles.chipGroup}>
                  {reasons.map((reason) => (
                    <FilterChip
                      key={reason}
                      compact
                      label={reason}
                      selected={selectedReason === reason}
                      onPress={() => setSelectedReason(reason)}
                    />
                  ))}
                </View>

                <TextField
                  label={isTagalog ? 'Tala' : 'Note'}
                  placeholder={isTagalog ? 'Isulat ang tala dito...' : 'Write note here...'}
                  multiline
                  maxLength={300}
                  value={explanation}
                  onChangeText={setExplanation}
                  hint={`${explanation.length}/300`}
                />
              </DepthCard>
            </>
          )}

          {submitError ? (
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
              {submitError}
            </AnimoText>
          ) : null}
        </ScrollView>

        <StickyFooter>
          <ChunkyButton
            label={
              submitting
                ? isTagalog
                  ? 'Ipinapadala…'
                  : 'Submitting…'
                : isMatch
                  ? isTagalog
                    ? 'Kumpirmahin ang Bayad'
                    : 'Confirm Payment'
                  : isTagalog
                    ? 'Kumpirmahin Pa Rin'
                    : 'Confirm Anyway'
            }
            onPress={handleConfirm}
            disabled={submitting}
          />
        </StickyFooter>
      </KeyboardAvoidingView>

      <BuyerFeedbackDialog
        visible={savedOffline}
        tone="info"
        title={isTagalog ? 'Na-save sa phone' : 'Saved on this phone'}
        message={
          isTagalog
            ? 'Walang signal kaya naka-save ang kumpirmasyon sa phone. Ipapadala ito isang beses pagbalik ng signal.'
            : 'There is no signal, so the confirmation is saved on this phone. It is sent once when the signal returns.'
        }
        confirmLabel={isTagalog ? 'Sige' : 'OK'}
        onConfirm={() => {
          setSavedOffline(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />

      <BuyerFeedbackDialog
        visible={showConfirmModal}
        tone="success"
        title={isTagalog ? 'Naipadala ang Kumpirmasyon' : 'Confirmation Sent'}
        message={
          isTagalog
            ? `Naghihintay na ngayon ng kumpirmasyon ng magsasaka na natanggap ang bayad na ${formatPeso(actualAmount)}.`
            : `Now awaiting confirmation from the farmer that the payment of ${formatPeso(actualAmount)} was received.`
        }
        confirmLabel={isTagalog ? 'Tingnan ang Resibo' : 'View Receipt'}
        onConfirm={() => {
          setShowConfirmModal(false);
          router.replace(`/(buyer)/transaksyon/${outcome.request.id}/resibo`);
        }}
      />
    </SafeAreaView>
  );
}

/** Large figure is the amount the buyer entered. Agreed price and the gap sit under it. */
function PaidAmountCard({
  actualAmount,
  agreedTotal,
  isTagalog,
}: {
  actualAmount: number;
  agreedTotal: number;
  isTagalog: boolean;
}) {
  const difference = actualAmount - agreedTotal;
  const isMatch = Math.abs(difference) < 0.01;

  return (
    <DepthCard depth="flat" radius="xl" style={styles.card}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
        {isTagalog ? 'Halagang Binayaran' : 'Amount Paid'}
      </AnimoText>
      <AnimoText variant="display">{formatPeso(actualAmount)}</AnimoText>

      <Divider />

      <DetailRow label={isTagalog ? 'Napagkasunduang presyo' : 'Agreed Price'} value={formatPeso(agreedTotal)} />
      <DetailRow
        label={isTagalog ? 'Pagkakaiba' : 'Difference'}
        value={
          isMatch
            ? `₱0.00 (${isTagalog ? 'Tugma' : 'Match'})`
            : `${difference > 0 ? '+' : '-'}${formatPeso(Math.abs(difference))}`
        }
        brand={isMatch}
      />
    </DepthCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  bannerText: { flex: 1, minWidth: 0, gap: 2 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
});
