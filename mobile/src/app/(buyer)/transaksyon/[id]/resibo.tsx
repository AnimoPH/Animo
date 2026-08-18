import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, Clock, Download, ExternalLink, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { BackHeader } from '@/components/animo/back-header';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { AnimoColors, AnimoType, AnimoSpacing, AnimoRadius } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
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
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  deriveDisplayStage,
  formatDate,
  formatReferenceId,
  requestTotal,
  shortenTxHash,
  type PurchaseOutcome,
  type TransactionCounterpart,
} from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;
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

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [counterpart, setCounterpart] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptPending, setReceiptPending] = useState(false);

  const ensureReceipt = useCallback(async (transactionId: string) => {
    try {
      const existing = await fetchReceipt(transactionId);
      if (existing) {
        setReceipt(existing);
        return;
      }
      setReceiptPending(true);
      const recorded = await recordBlockchainReceipt(transactionId);
      setReceipt(recorded);
    } catch (e) {
      // Never surfaces as a screen error — the transaction itself is
      // already complete; the blockchain record can simply be retried the
      // next time this screen loads.
      console.warn('[resibo] blockchain receipt not yet available', e instanceof Error ? e.message : e);
    } finally {
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
      setError(e instanceof Error ? e.message : 'Hindi ma-load ang resibo.');
    } finally {
      setLoading(false);
    }
  }, [id, ensureReceipt]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackHeader title="Digital na Resibo" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Digital na Resibo" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{error ?? 'Hindi nahanap ang transaksyon na ito.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { transaction } = outcome;
  const payment = transaction.payment;
  const stage = deriveDisplayStage(outcome);
  const isCompleted = stage === 'completed';
  const total = requestTotal(outcome);

  const detailRows: { label: string; value: string }[] = [
    { label: 'Transaction ID', value: formatReferenceId(transaction.id, 'TXN') },
    { label: 'Uri ng Palay', value: listing ? varietyLabel(listing) : 'Palay' },
    { label: 'Dami', value: `${transaction.quantityKg} kg` },
    { label: 'Presyo bawat kilo', value: `${formatPeso(transaction.agreedPricePerKg)}/kg` },
    { label: 'Paraan ng Bayad', value: payment?.paymentMode ?? '—' },
    ...(payment?.gcashReferenceNumber ? [{ label: 'Reference No.', value: payment.gcashReferenceNumber }] : []),
    { label: 'Magsasaka', value: counterpart?.name ?? 'Magsasaka' },
    { label: 'Mamimili', value: account?.fullName ?? 'Ikaw' },
    { label: 'Petsa', value: formatDate(transaction.createdAt) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title="Digital na Resibo" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero — banner reflects real stage, not an assumed instant completion. */}
        <View style={[styles.hero, !isCompleted && styles.heroPending]}>
          <View style={styles.checkCircle}>
            {isCompleted ? <CheckCircle size={40} color={AnimoColors.white} /> : <Clock size={40} color={AnimoColors.white} />}
          </View>
          <Text style={styles.heroTitle}>
            {isCompleted ? 'Kumpleto ang Transaksyon!' : 'Naipadala ang Bayad'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isCompleted
              ? 'Nakumpirma ang buong bayad.'
              : 'Naghihintay ng kumpirmasyon ng magsasaka na natanggap ang bayad.'}
          </Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{isCompleted ? 'Kumpleto' : 'Naghihintay ng Kumpirmasyon'}</Text>
            </View>
          </View>

          <Text style={styles.totalAmount}>{formatPeso(payment?.amount ?? total)}</Text>

          <View style={styles.dashedDivider} />

          {detailRows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                <Text style={styles.detailValue}>{row.value}</Text>
              </View>
            </View>
          ))}

          {receipt || receiptPending ? <View style={styles.rowDivider} /> : null}
          {receipt ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`${POLYGONSCAN_TX_URL}${receipt.txHash}`).catch(() => {})}
              style={styles.blockchainRow}
            >
              <Text style={styles.detailLabel}>Katibayan</Text>
              <View style={styles.blockchainValueGroup}>
                <Text style={styles.detailValue}>{shortenTxHash(receipt.txHash)}</Text>
                <ExternalLink size={14} color={AnimoColors.accentPrimary} />
              </View>
            </Pressable>
          ) : receiptPending ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Katibayan</Text>
              <ActivityIndicator size="small" color={AnimoColors.accentPrimary} />
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          {isCompleted ? (
            <AnimoButton
              label="Suriin ang Magsasaka"
              icon={Star}
              onPress={() => router.push(`/(buyer)/transaksyon/${outcome.request.id}/review`)}
            />
          ) : null}
          <AnimoButton
            label="I-download ang Resibo"
            variant="secondary"
            icon={Download}
            onPress={() => setShowDownloadModal(true)}
          />
          <AnimoButton
            label="Bumalik sa Transaksyon"
            variant="neutralOutline"
            onPress={() => router.replace('/(buyer)/transaksyon')}
          />
        </View>
      </ScrollView>

      <FeedbackModal
        visible={showDownloadModal}
        tone="success"
        title="Na-save ang Resibo!"
        message="Matagumpay na nai-save ang digital na resibo sa iyong device."
        confirmLabel="OK"
        onConfirm={() => setShowDownloadModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoSpacing.xl },
  missingText: { ...AnimoType.body, color: AnimoColors.textMediumEmphasis },
  scroll: { flex: 1, backgroundColor: AnimoColors.appBackground },
  scrollContent: { paddingBottom: AnimoSpacing.xxl },
  hero: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: AnimoSpacing.xxl,
    paddingBottom: 56,
    alignItems: 'center',
  },
  heroPending: {
    backgroundColor: '#B4791A',
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: AnimoRadius.pill,
    borderWidth: 2.5,
    borderColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AnimoSpacing.lg,
  },
  heroTitle: { ...AnimoType.h1, color: AnimoColors.white, textAlign: 'center', fontWeight: 'bold' },
  heroSubtitle: { ...AnimoType.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: AnimoSpacing.xs },
  receiptCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: -32,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    elevation: 3,
  },
  statusRow: { alignItems: 'center', marginBottom: AnimoSpacing.md },
  statusBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.xs,
  },
  statusBadgeText: { ...AnimoType.tag, color: AnimoColors.accentPrimary },
  totalAmount: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: AnimoColors.accentPrimary,
    textAlign: 'center',
  },
  dashedDivider: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: AnimoColors.borderLowEmphasis, marginVertical: AnimoSpacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: AnimoSpacing.sm },
  detailLabel: { ...AnimoType.body, color: AnimoColors.textLowEmphasis },
  detailValue: { ...AnimoType.bodyEmphasis, color: AnimoColors.textHighEmphasis },
  rowDivider: { height: 1, backgroundColor: AnimoColors.surfaceTertiary },
  blockchainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: AnimoSpacing.sm },
  blockchainValueGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { marginHorizontal: SCREEN_PADDING, marginTop: AnimoSpacing.xl, gap: AnimoSpacing.sm },
});
