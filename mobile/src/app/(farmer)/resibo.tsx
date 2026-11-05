import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Download, ExternalLink, ShieldCheck, Star } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { Mascot } from '@/components/animo/ui/mascot';
import { V2BackHeader } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { fetchCropListing } from '@/services/crop-listing-service';
import {
  fetchReceipt,
  fetchTransaction,
  fetchTransactionCounterpart,
  recordBlockchainReceipt,
  type Receipt,
} from '@/services/transaction-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import {
  formatDate,
  formatReferenceId,
  shortenTxHash,
  type TransactionCounterpart,
  type TransactionWithPayment,
} from '@/types/transaction';

const SCREEN_PADDING = AnimoV2Spacing.lg;
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
  const { t, language } = useLanguage();

  const [transaction, setTransaction] = useState<TransactionWithPayment | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptPending, setReceiptPending] = useState(false);
  const [receiptFailed, setReceiptFailed] = useState(false);
  const receiptInFlight = useRef(false);

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
      setError(e instanceof Error ? e.message : t('frb.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, ensureReceipt, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <V2BackHeader title={t('frb.title')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  if (!transaction || error) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <V2BackHeader title={t('frb.title')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        <View style={styles.missing}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {error ?? t('ftx.txNotFound')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const payment = transaction.payment;
  const detailRows: { label: string; value: string }[] = [
    { label: t('frb.txId'), value: formatReferenceId(transaction.id, 'TXN') },
    { label: t('frb.variety'), value: listing ? varietyLabel(listing) : 'Palay' },
    { label: t('frb.quantity'), value: `${transaction.quantityKg} kg` },
    { label: t('frb.pricePerKg'), value: `${formatPeso(transaction.agreedPricePerKg)}/kg` },
    { label: t('frb.payMode'), value: payment?.paymentMode ?? '—' },
    ...(payment?.gcashReferenceNumber ? [{ label: t('frb.refNo'), value: payment.gcashReferenceNumber }] : []),
    { label: t('frb.buyer'), value: buyer?.name ?? t('ftx.buyerFallback') },
    {
      label: t('frb.date'),
      value: transaction.dateCompleted ? formatDate(transaction.dateCompleted, language) : '—',
    },
  ];

  const openProof = () => {
    if (!receipt) return;
    Linking.openURL(`${POLYGONSCAN_TX_URL}${receipt.txHash}`).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <V2BackHeader title={t('frb.title')} backLabel={t('ftx.back')} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Mascot size={96} />
          <AnimoText variant="title" style={styles.centerText} accessibilityRole="header">
            {t('frb.doneTitle')}
          </AnimoText>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {t('frb.doneSub')}
          </AnimoText>
        </View>

        <DepthCard>
          <View style={styles.cardBody}>
            <View style={styles.totalBlock}>
              <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary}>
                {t('frb.total')}
              </AnimoText>
              <AnimoText variant="priceHero" color={AnimoV2Colors.textBrand}>
                {formatPeso(payment?.amount ?? transaction.totalAmount)}
              </AnimoText>
            </View>

            {detailRows.map((row) => (
              <View key={row.label} style={styles.gap}>
                <View style={styles.divider} />
                <View style={styles.rowBetween}>
                  <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.rowLabel}>
                    {row.label}
                  </AnimoText>
                  <AnimoText variant="bodyStrong" style={styles.rowValue}>
                    {row.value}
                  </AnimoText>
                </View>
              </View>
            ))}
          </View>
        </DepthCard>

        <DepthCard depth="flat" backgroundColor={AnimoV2Colors.surfaceBrandSubtle} borderColor={AnimoV2Colors.brandLight}>
          <View style={styles.cardBody}>
            <View style={styles.noteRow}>
              <IconTile icon={ShieldCheck} tone="success" size={36} />
              <View style={styles.flex}>
                <AnimoText variant="bodyStrong">{t('frb.noteTitle')}</AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                  {t('frb.noteBody')}
                </AnimoText>
              </View>
            </View>

            <View style={styles.divider} />
            {receipt ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('frb.proofOpen')}
                onPress={openProof}
                style={styles.proofRow}>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.rowLabel}>
                  {t('frb.proof')}
                </AnimoText>
                <View style={styles.proofValue}>
                  <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                    {shortenTxHash(receipt.txHash)}
                  </AnimoText>
                  <ExternalLink size={18} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
                </View>
              </Pressable>
            ) : receiptPending ? (
              <View style={styles.proofRow}>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                  {t('frb.proof')}
                </AnimoText>
                <ActivityIndicator size="small" color={AnimoV2Colors.actionPrimary} />
              </View>
            ) : (
              <View style={styles.proofRow}>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                  {t('frb.proof')}
                </AnimoText>
                <AnimoText variant="bodyStrong" color={AnimoV2Colors.textTertiary} style={styles.rowValue}>
                  {receiptFailed ? t('frb.proofFailed') : t('frb.proofNone')}
                </AnimoText>
              </View>
            )}
          </View>
        </DepthCard>

        <View style={styles.actions}>
          {transaction.status === 'Completed' && !receipt ? (
            <>
              {receiptFailed ? (
                <AnimoText variant="captionV2" color={AnimoV2Colors.dangerFg} accessibilityRole="alert">
                  {t('frb.retryMsg')}
                </AnimoText>
              ) : null}
              <ChunkyButton
                label={receiptPending ? t('frb.retrieving') : t('frb.retry')}
                variant="secondary"
                disabled={receiptPending}
                onPress={() => ensureReceipt(transaction.id)}
              />
            </>
          ) : null}
          <ChunkyButton
            label={t('frb.rateBuyer')}
            icon={Star}
            onPress={() => router.push({ pathname: '/(farmer)/review', params: { id: transaction.id } } as Href)}
          />
          <ChunkyButton
            label={t('frb.download')}
            variant="secondary"
            icon={Download}
            onPress={() => setShowDownloadModal(true)}
          />
          <ChunkyButton
            label={t('ftx.backToTx')}
            variant="ghost"
            onPress={() => router.replace('/(farmer)/(tabs)/transaksyon' as Href)}
          />
        </View>
      </ScrollView>

      <V2Dialog
        visible={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        icon={Check}
        iconTone="success"
        title={t('frb.savedTitle')}
        message={t('frb.savedMsg')}
        actions={<ChunkyButton label={t('ftx.ok')} onPress={() => setShowDownloadModal(false)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: SCREEN_PADDING, paddingBottom: AnimoV2Spacing.xxl, gap: AnimoV2Spacing.lg },
  hero: { alignItems: 'center', gap: AnimoV2Spacing.sm, paddingTop: AnimoV2Spacing.sm },
  cardBody: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  totalBlock: { alignItems: 'center' },
  gap: { gap: AnimoV2Spacing.md },
  divider: { height: 2, borderRadius: AnimoV2Radius.full, backgroundColor: AnimoV2Colors.borderDefault },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  rowLabel: { flexShrink: 0 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoV2Spacing.md,
    minHeight: 48,
  },
  proofValue: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  actions: { gap: AnimoV2Spacing.md, marginTop: AnimoV2Spacing.sm },
});
