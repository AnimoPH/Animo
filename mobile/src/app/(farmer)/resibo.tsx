import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, Download, ExternalLink, Star } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { BackHeader } from '@/components/animo/back-header';
import { AnimoColors, AnimoType, AnimoSpacing, AnimoRadius } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  fetchReceipt,
  fetchTransaction,
  fetchTransactionCounterpart,
  recordBlockchainReceipt,
  type Receipt,
} from '@/services/transaction-service';
import { useLanguage } from '@/hooks/use-language';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import { formatReferenceId, formatDate, shortenTxHash, type TransactionCounterpart, type TransactionWithPayment } from '@/types/transaction';

const SCREEN_PADDING = AnimoSpacing.lg;
const POLYGONSCAN_TX_URL = 'https://amoy.polygonscan.com/tx/';

/**
 * Digital na Resibo (farmer side) — reads the real completed transaction,
 * plus its on-chain receipt once `record-blockchain-receipt` has recorded
 * one (relayer-paid, see that Edge Function). If it hasn't landed yet by
 * the time this screen loads, `ensureReceipt` below records it on the spot
 * — the Edge Function is idempotent, so this is a safe retry, not a
 * duplicate write.
 */
export default function FarmerReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isTagalog } = useLanguage();

  const [transaction, setTransaction] = useState<TransactionWithPayment | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
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
      const tx = await fetchTransaction(id);
      setTransaction(tx);
      if (tx) {
        const [listingResult, buyerResult] = await Promise.all([
          fetchCropListing(tx.listingId),
          fetchTransactionCounterpart(tx.buyerId),
        ]);
        setListing(listingResult);
        setBuyer(buyerResult);
        if (tx.status === 'Completed') ensureReceipt(tx.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : (isTagalog ? 'Hindi ma-load ang resibo.' : 'Failed to load receipt.'));
    } finally {
      setLoading(false);
    }
  }, [id, ensureReceipt, isTagalog]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <BackHeader title={isTagalog ? 'Digital na Resibo' : 'Digital Receipt'} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title={isTagalog ? 'Digital na Resibo' : 'Digital Receipt'} />
        <View style={styles.missing}>
          <Text style={styles.missingText}>{error ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction not found.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const payment = transaction.payment;
  const detailRows: { label: string; value: string }[] = [
    { label: 'Transaction ID', value: formatReferenceId(transaction.id, 'TXN') },
    { label: isTagalog ? 'Uri ng Palay' : 'Rice Variety', value: listing ? varietyLabel(listing) : 'Palay' },
    { label: isTagalog ? 'Dami' : 'Quantity', value: `${transaction.quantityKg} kg` },
    { label: isTagalog ? 'Presyo bawat kilo' : 'Price per kg', value: `${formatPeso(transaction.agreedPricePerKg)}/kg` },
    { label: isTagalog ? 'Paraan ng Bayad' : 'Payment Method', value: payment?.paymentMode ?? '—' },
    ...(payment?.gcashReferenceNumber ? [{ label: 'Reference No.', value: payment.gcashReferenceNumber }] : []),
    { label: isTagalog ? 'Mamimili' : 'Buyer', value: buyer?.name ?? (isTagalog ? 'Mamimili' : 'Buyer') },
    { label: isTagalog ? 'Petsa' : 'Date', value: transaction.dateCompleted ? formatDate(transaction.dateCompleted) : '—' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title={isTagalog ? 'Digital na Resibo' : 'Digital Receipt'} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <CheckCircle size={40} color={AnimoColors.white} />
          </View>
          <Text style={styles.heroTitle}>{isTagalog ? 'Kumpleto ang Transaksyon!' : 'Transaction Completed!'}</Text>
          <Text style={styles.heroSubtitle}>{isTagalog ? 'Nakumpirma ang buong bayad.' : 'Full payment has been confirmed.'}</Text>
        </View>

        <View style={styles.receiptCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{isTagalog ? 'Kumpleto' : 'Completed'}</Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{formatPeso(payment?.amount ?? transaction.totalAmount)}</Text>

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
              <Text style={styles.detailLabel}>{isTagalog ? 'Katibayan' : 'On-Chain Proof'}</Text>
              <View style={styles.blockchainValueGroup}>
                <Text style={styles.detailValue}>{shortenTxHash(receipt.txHash)}</Text>
                <ExternalLink size={14} color={AnimoColors.accentPrimary} />
              </View>
            </Pressable>
          ) : receiptPending ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{isTagalog ? 'Katibayan' : 'On-Chain Proof'}</Text>
              <ActivityIndicator size="small" color={AnimoColors.accentPrimary} />
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <AnimoButton
            label={isTagalog ? 'Suriin ang Mamimili' : 'Review Buyer'}
            icon={Star}
            onPress={() => router.push({ pathname: '/(farmer)/review', params: { id: transaction.id } } as Href)}
          />
          <AnimoButton
            label={isTagalog ? 'I-download ang Resibo' : 'Download Receipt'}
            variant="secondary"
            icon={Download}
            onPress={() => setShowDownloadModal(true)}
          />
          <AnimoButton
            label={isTagalog ? 'Bumalik sa Transaksyon' : 'Back to Transactions'}
            variant="neutralOutline"
            onPress={() => router.replace('/(farmer)/(tabs)/transaksyon' as Href)}
          />
        </View>
      </ScrollView>

      <FeedbackModal
        visible={showDownloadModal}
        tone="success"
        title={isTagalog ? 'Na-save ang Resibo!' : 'Receipt Saved!'}
        message={isTagalog ? 'Matagumpay na nai-save ang digital na resibo sa iyong device.' : 'The digital receipt was successfully saved to your device.'}
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
  scrollContent: { paddingBottom: AnimoSpacing.xl },
  hero: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: AnimoSpacing.xxl,
    paddingBottom: 56,
    alignItems: 'center',
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
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statusRow: { alignItems: 'center', marginBottom: AnimoSpacing.md },
  statusBadge: { backgroundColor: AnimoColors.accentPrimaryLight, borderRadius: AnimoRadius.pill, paddingHorizontal: AnimoSpacing.md, paddingVertical: AnimoSpacing.xs },
  statusBadgeText: { ...AnimoType.tag, color: AnimoColors.accentPrimary },
  totalAmount: { fontSize: 36, lineHeight: 44, fontFamily: 'PlusJakartaSans_700Bold', color: AnimoColors.accentPrimary, textAlign: 'center' },
  dashedDivider: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: AnimoColors.borderLowEmphasis, marginVertical: AnimoSpacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: AnimoSpacing.sm },
  detailLabel: { ...AnimoType.body, color: AnimoColors.textLowEmphasis },
  detailValue: { ...AnimoType.bodyEmphasis, color: AnimoColors.textHighEmphasis },
  rowDivider: { height: 1, backgroundColor: AnimoColors.surfaceTertiary },
  blockchainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: AnimoSpacing.sm },
  blockchainValueGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { marginHorizontal: SCREEN_PADDING, marginTop: AnimoSpacing.xxl, gap: AnimoSpacing.sm },
});
