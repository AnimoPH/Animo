import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Clock, Download, ExternalLink, ShieldCheck, Star } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';

import { BuyerFeedbackDialog, DetailRow, Divider, TxnHeader } from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  fetchReceipt,
  fetchTransactionByRequestId,
  fetchTransactionCounterpart,
  recordBlockchainReceipt,
  type Receipt,
} from '@/services/transaction-service';
import {
  buyerTransactionsHref,
  type BuyerTransactionListFilter,
} from '@/lib/buyer-transactions-nav';
import { specificVarietyDisplay, varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  deriveDisplayStage,
  formatDate,
  formatReferenceId,
  requestTotal,
  shortenTxHash,
  type PurchaseOutcome,
  type TransactionCounterpart,
} from '@/types/transaction';

const POLYGONSCAN_TX_URL = 'https://amoy.polygonscan.com/tx/';

/**
 * Buyer Receipt Screen (Digital na Resibo) — reads the real transaction and
 * payment, plus its on-chain receipt once `record-blockchain-receipt` has
 * recorded one (relayer-paid, see that Edge Function). If it hasn't landed
 * yet by the time this screen loads, `ensureReceipt` below records it on
 * the spot — the Edge Function is idempotent, so this is a safe retry, not
 * a duplicate write.
 */
export default function BuyerReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useSession();
  const { language, isTagalog, t } = useLanguage();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptPending, setReceiptPending] = useState(false);
  const [receiptFailed, setReceiptFailed] = useState(false);
  const receiptInFlight = useRef(false);
  const navigation = useNavigation();
  /** Filter to open when leaving. Null until the transaction has loaded. */
  const exitFilterRef = useRef<BuyerTransactionListFilter | null>(null);
  const leavingToListRef = useRef(false);

  exitFilterRef.current =
    outcome?.kind === 'matched' && deriveDisplayStage(outcome) === 'completed' ? 'tapos' : outcome ? 'kasalukuyan' : null;

  const ensureReceipt = useCallback(async (transactionId: string) => {
    if (receiptInFlight.current) return;
    receiptInFlight.current = true;
    setReceiptPending(true);
    setReceiptFailed(false);
    try {
      const existing = await fetchReceipt(transactionId);
      if (existing) {
        setReceipt(existing);
        return;
      }
      const recorded = await recordBlockchainReceipt(transactionId);
      setReceipt(recorded);
    } catch (e) {
      // Never surfaces as a screen error — the transaction itself is
      // already complete; the blockchain record can simply be retried the
      // next time this screen loads.
      setReceiptFailed(true);
      console.warn('[resibo] blockchain receipt not yet available', e instanceof Error ? e.message : e);
    } finally {
      receiptInFlight.current = false;
      setReceiptPending(false);
    }
  }, []);

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
      const [listingResult, counterpartResult] = await Promise.all([
        fetchCropListing(request.listingId),
        fetchTransactionCounterpart(transaction.farmerId),
      ]);
      setListing(listingResult);
      setCounterpart(counterpartResult);
      if (transaction.status === 'Completed') ensureReceipt(transaction.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : (isTagalog ? 'Hindi ma-load ang resibo.' : 'Failed to load receipt.'));
    } finally {
      setLoading(false);
    }
  }, [id, ensureReceipt, isTagalog]);

  useEffect(() => {
    load();
  }, [load]);

  const leaveReceipt = useCallback((filter: BuyerTransactionListFilter | null) => {
    if (leavingToListRef.current) return;
    leavingToListRef.current = true;
    router.dismissTo(filter ? buyerTransactionsHref(filter) : buyerTransactionsHref());
  }, []);

  // Header, hardware, and gesture back must not reveal Paraan ng Pagbabayad,
  // which stays under this screen when payment was pushed onto the stack.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!navigation.isFocused()) return;
      const type = e.data.action.type;
      if (type !== 'GO_BACK' && type !== 'POP') return;
      if (leavingToListRef.current) return;
      e.preventDefault();
      leaveReceipt(exitFilterRef.current);
    });
    return unsubscribe;
  }, [navigation, leaveReceipt]);

  const screenTitle = isTagalog ? 'Digital na Resibo' : 'Digital Receipt';

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={screenTitle} onBack={() => leaveReceipt(exitFilterRef.current)} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar style="dark" />
        <TxnHeader title={screenTitle} onBack={() => leaveReceipt(exitFilterRef.current)} />
        <View style={styles.missing}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {error ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction not found.')}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { transaction } = outcome;
  const payment = transaction.payment;
  const stage = deriveDisplayStage(outcome);
  const isCompleted = stage === 'completed';
  const total = requestTotal(outcome);

  const specificVariety = listing ? specificVarietyDisplay(listing, language) : null;
  const detailRows: { label: string; value: string }[] = [
    { label: isTagalog ? 'Transaction ID' : 'Transaction ID', value: formatReferenceId(transaction.id, 'TXN') },
    { label: isTagalog ? 'Uri ng Palay' : 'Crop Variety', value: listing ? varietyLabel(listing, language) : (isTagalog ? 'Palay' : 'Paddy') },
    ...(specificVariety
      ? [{ label: isTagalog ? 'Tiyak na uri ng Palay' : 'Specific Variety', value: specificVariety }]
      : []),
    { label: isTagalog ? 'Dami' : 'Quantity', value: `${transaction.quantityKg} kg` },
    { label: isTagalog ? 'Presyo bawat kilo' : 'Price per kg', value: `${formatPeso(transaction.agreedPricePerKg)}/kg` },
    { label: isTagalog ? 'Paraan ng Bayad' : 'Payment Method', value: payment?.paymentMode ?? '—' },
    ...(payment?.gcashReferenceNumber ? [{ label: isTagalog ? 'Reference No.' : 'Reference No.', value: payment.gcashReferenceNumber }] : []),
    { label: isTagalog ? 'Magsasaka' : 'Farmer', value: counterpart?.name ?? (isTagalog ? 'Magsasaka' : 'Farmer') },
    { label: isTagalog ? 'Mamimili' : 'Buyer', value: account?.fullName ?? (isTagalog ? 'Ikaw' : 'You') },
    { label: isTagalog ? 'Petsa' : 'Date', value: formatDate(transaction.createdAt) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title={screenTitle} onBack={() => leaveReceipt(isCompleted ? 'tapos' : 'kasalukuyan')} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero: reflects the real stage, not an assumed instant completion. */}
        <View style={styles.hero}>
          {isCompleted ? <Mascot size={96} /> : <IconTile icon={Clock} tone="warning" size={96} solid />}
          <AnimoText variant="title" style={styles.centerText} accessibilityRole="header">
            {isCompleted
              ? (isTagalog ? 'Kumpleto ang Transaksyon!' : 'Transaction Completed!')
              : (isTagalog ? 'Naipadala ang Bayad' : 'Payment Sent')}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {isCompleted
              ? (isTagalog ? 'Nakumpirma ang buong bayad.' : 'Full payment confirmed.')
              : (isTagalog ? 'Naghihintay ng kumpirmasyon ng magsasaka na natanggap ang bayad.' : 'Awaiting confirmation from the farmer that payment was received.')}
          </AnimoText>
        </View>

        <DepthCard radius="xl" style={styles.receiptCard}>
          <StatusPill
            tone={isCompleted ? 'success' : 'warning'}
            label={isCompleted
              ? (isTagalog ? 'Kumpleto' : 'Completed')
              : (isTagalog ? 'Naghihintay ng Kumpirmasyon' : 'Awaiting Confirmation')}
          />

          <AnimoText variant="display" color={AnimoV2Colors.textBrand}>
            {formatPeso(payment?.amount ?? total)}
          </AnimoText>

          <View style={styles.dashedDivider} />

          {detailRows.map((row, index) => (
            <View key={row.label} style={styles.detailBlock}>
              {index > 0 ? <Divider /> : null}
              <DetailRow label={row.label} value={row.value} />
            </View>
          ))}

          <Divider />
          {receipt ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${isTagalog ? 'Katibayan' : 'Proof of Record'} ${shortenTxHash(receipt.txHash)}`}
              onPress={() => Linking.openURL(`${POLYGONSCAN_TX_URL}${receipt.txHash}`).catch(() => {})}
              style={styles.proofRow}>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {isTagalog ? 'Katibayan' : 'Proof of Record'}
              </AnimoText>
              <View style={styles.proofValue}>
                <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                  {shortenTxHash(receipt.txHash)}
                </AnimoText>
                <ExternalLink size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
              </View>
            </Pressable>
          ) : receiptPending ? (
            <View style={styles.proofRow}>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {isTagalog ? 'Katibayan' : 'Proof of Record'}
              </AnimoText>
              <ActivityIndicator size="small" color={AnimoV2Colors.actionPrimary} />
            </View>
          ) : isCompleted ? (
            <DetailRow
              label={isTagalog ? 'Katibayan' : 'Proof of Record'}
              value={
                receiptFailed
                  ? (isTagalog ? 'Hindi ma-load ang katibayan' : 'Could not load proof')
                  : (isTagalog ? 'Katibayan hindi pa available' : 'Proof not yet available')
              }
            />
          ) : null}
        </DepthCard>

        {isCompleted ? (
          <DepthCard
            depth="flat"
            radius="xl"
            backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
            borderColor={AnimoV2Colors.brandLight}
            style={styles.ledgerCard}>
            <IconTile icon={ShieldCheck} tone="success" size={40} />
            <View style={styles.ledgerText}>
              <AnimoText variant="bodyStrong">{t('buyRcptV2.ledgerTitle')}</AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('buyRcptV2.ledgerNote')}
              </AnimoText>
            </View>
          </DepthCard>
        ) : null}

        <View style={styles.actions}>
          {outcome.transaction.status === 'Completed' && !receipt ? (
            <>
              {receiptFailed ? (
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} accessibilityRole="alert">
                  {isTagalog
                    ? 'Kumpleto pa rin ang bentahan. Subukang muli upang makuha ang katibayan sa blockchain.'
                    : 'Your sale is still completed. Retry to retrieve its blockchain proof.'}
                </AnimoText>
              ) : null}
              <ChunkyButton
                label={receiptPending
                  ? (isTagalog ? 'Kinukuha ang Katibayan…' : 'Retrieving Proof…')
                  : (isTagalog ? 'Subukang Muli ang Katibayan' : 'Retry Blockchain Proof')}
                variant="secondary"
                disabled={receiptPending}
                onPress={() => ensureReceipt(outcome.transaction.id)}
              />
            </>
          ) : null}
          {isCompleted ? (
            <ChunkyButton
              label={isTagalog ? 'Suriin ang Magsasaka' : 'Review Farmer'}
              icon={Star}
              onPress={() => router.push(`/(buyer)/transaksyon/${outcome.request.id}/review`)}
            />
          ) : null}
          <ChunkyButton
            label={isTagalog ? 'I-download ang Resibo' : 'Download Receipt'}
            variant={isCompleted ? 'secondary' : 'primary'}
            icon={Download}
            onPress={() => setShowDownloadModal(true)}
          />
          <ChunkyButton
            label={isTagalog ? 'Bumalik sa Transaksyon' : 'Back to Transactions'}
            variant="ghost"
            onPress={() => leaveReceipt(isCompleted ? 'tapos' : 'kasalukuyan')}
          />
        </View>
      </ScrollView>

      <BuyerFeedbackDialog
        visible={showDownloadModal}
        tone="success"
        title={isTagalog ? 'Na-save ang Resibo!' : 'Receipt Saved!'}
        message={
          isTagalog
            ? 'Matagumpay na nai-save ang digital na resibo sa iyong device.'
            : 'The digital receipt was successfully saved to your device.'
        }
        confirmLabel="OK"
        onConfirm={() => setShowDownloadModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  scrollContent: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xxl,
    gap: AnimoV2Spacing.lg,
  },
  hero: { alignItems: 'center', gap: AnimoV2Spacing.md, paddingVertical: AnimoV2Spacing.sm },
  receiptCard: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  dashedDivider: {
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: AnimoV2Colors.edgeSoft,
  },
  detailBlock: { gap: AnimoV2Spacing.md },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
    minHeight: 44,
  },
  proofValue: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  ledgerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.xl,
  },
  ledgerText: { flex: 1, minWidth: 0, gap: 2 },
  actions: { gap: AnimoV2Spacing.md },
});
