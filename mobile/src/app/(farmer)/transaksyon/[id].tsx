import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  HelpCircle,
  Package,
  Phone,
  Scale,
  Star,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { BackHeader } from '@/components/animo/back-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  cancelTransaction,
  confirmPaymentReceived,
  fetchTransaction,
  fetchTransactionCounterpart,
  markDelivered,
} from '@/services/transaction-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
import {
  DISPLAY_STAGE_LABELS,
  DISPLAY_STAGE_TONE,
  buildProgressSteps,
  deriveDisplayStage,
  type DisplayStage,
  type PurchaseOutcome,
  type TransactionCounterpart,
  type TransactionWithPayment,
} from '@/types/transaction';

type ConfirmKind = 'payment_received' | 'delivered' | null;
type ActionConfirmType = 'confirm_payment' | 'confirm_delivered' | null;

/**
 * Farmer Transaction Detail Screen — reads a real `transactionmatch` (this
 * `id` is always a transaction_id; pending pre-match requests are triaged in
 * the listing's Orders tab, not here). Payment happens before delivery in
 * the real flow: "Kumpirmahin ang Paghahatid" only appears once the payment
 * is Confirmed, and is effectively the completion action (see
 * `transactionmatch_auto_complete`, migration 0001).
 */
export default function FarmerTransactionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [transaction, setTransaction] = useState<TransactionWithPayment | null>(null);
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [actionConfirmType, setActionConfirmType] = useState<ActionConfirmType>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const tx = await fetchTransaction(id);
      setTransaction(tx);
      if (tx) {
        const [listingResult, buyerResult, requestResult] = await Promise.all([
          fetchCropListing(tx.listingId),
          fetchTransactionCounterpart(tx.buyerId),
          fetchPurchaseRequest(tx.requestId),
        ]);
        setListing(listingResult);
        setBuyer(buyerResult);
        setRequest(requestResult);
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

  const handleCallBuyer = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
  };

  const handleExecuteAction = async () => {
    const type = actionConfirmType;
    setActionConfirmType(null);
    if (!transaction) return;
    setActionError(null);
    try {
      if (type === 'confirm_payment' && transaction.payment) {
        await confirmPaymentReceived(transaction.payment.id);
        setConfirm('payment_received');
      } else if (type === 'confirm_delivered') {
        await markDelivered(transaction.id);
        setConfirm('delivered');
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Hindi naisagawa ang aksyon.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!transaction) return;
    setActionError(null);
    try {
      await cancelTransaction(transaction.id);
      setShowCancelModal(false);
      setShowCancelSuccessModal(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Hindi makansela ang transaksyon.');
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title="Detalye ng Transaksyon" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction || !request || error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Detalye ng Transaksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {error ?? 'Hindi nahanap ang transaksyon na ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const outcome: PurchaseOutcome = { kind: 'matched', request, transaction };
  const stage = deriveDisplayStage(outcome);
  const isCancelled = stage === 'transaction_cancelled' || stage === 'payment_failed';
  const isCompleted = stage === 'completed';
  const canCancel = transaction.status === 'Pending_Payment';
  const steps = buildProgressSteps(outcome, 'farmer');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title={farmerHeaderTitle(stage)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StageBanner stage={stage} transaction={transaction} buyerName={buyer?.name} />

        {listing ? <ListingCard listing={listing} transaction={transaction} isCancelled={isCancelled} /> : null}

        <ProgressTracker title="Progreso ng Transaksyon" steps={steps} />

        <PaymentSummary
          rows={[
            { label: 'Dami ng Palay', amount: `${transaction.quantityKg} kg` },
            { label: 'Presyo bawat kilo', amount: formatPeso(transaction.agreedPricePerKg) },
            ...(transaction.payment ? [{ label: 'Paraan ng Pagbabayad', amount: transaction.payment.paymentMode }] : []),
          ]}
          total={{ label: 'Kabuuang Halaga ng Transaksyon', amount: transaction.totalAmount }}
        />

        {buyer ? (
          <BuyerPartyCard
            buyer={buyer}
            quantityKg={transaction.quantityKg}
            total={transaction.totalAmount}
            onCall={() => handleCallBuyer(buyer.phone)}
          />
        ) : null}

        {isCompleted ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/(farmer)/resibo', params: { id: transaction.id } } as Href)}
            style={({ pressed }) => [styles.receiptRow, pressed && styles.pressed]}>
            <View style={styles.receiptIcon}>
              <FileText size={20} color={AnimoColors.green} />
            </View>
            <View style={styles.flex}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                Digital na Resibo
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Naka-save sa iyong talaan
              </AnimoText>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        ) : null}

        {actionError ? (
          <AnimoText variant="caption" color={AnimoColors.danger}>
            {actionError}
          </AnimoText>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <FooterActions
          stage={stage}
          canCancel={canCancel}
          onConfirmPayment={() => setActionConfirmType('confirm_payment')}
          onConfirmDelivered={() => setActionConfirmType('confirm_delivered')}
          onCancel={() => setShowCancelModal(true)}
          onRate={() => router.push({ pathname: '/(farmer)/review', params: { id: transaction.id } })}
          onBackToMarket={() => router.push('/(farmer)/(tabs)/palengke' as Href)}
        />
      </View>

      <Modal visible={actionConfirmType !== null} transparent animationType="fade" onRequestClose={() => setActionConfirmType(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActionConfirmType(null)}>
          <Pressable style={styles.confirmModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmModalIconCircle}>
              <HelpCircle size={28} color={AnimoColors.accentPrimary} />
            </View>
            <View style={styles.confirmModalHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                {actionConfirmType === 'confirm_payment' ? 'Kumpirmahin ang Bayad?' : 'Kumpirmahin ang Paghahatid?'}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                {actionConfirmType === 'confirm_payment'
                  ? 'Sigurado ka bang natanggap mo na ang buong bayad sa GCash o Cash?'
                  : 'Sigurado ka bang naihatid mo na ang palay sa mamimili? Ito ang huling hakbang bago makumpleto ang transaksyon.'}
              </AnimoText>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleExecuteAction}
                style={({ pressed }) => [styles.confirmActionBtn, pressed && styles.pressed]}>
                <Check size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  {actionConfirmType === 'confirm_payment' ? 'Oo, Nakumpirma ang Bayad' : 'Oo, Naihatid Na'}
                </AnimoText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setActionConfirmType(null)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Huwag Muna
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCancelModal(false)}>
          <Pressable style={styles.confirmModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.confirmModalIconCircle, styles.dangerIconCircle]}>
              <XCircle size={28} color={AnimoColors.danger} />
            </View>
            <View style={styles.confirmModalHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                Kanselahin ang Transaksyon?
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                Wala pang naitalang bayad sa transaksyong ito. Muling magiging available ang dami ng palay.
              </AnimoText>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmCancel}
                style={({ pressed }) => [styles.confirmRejectBtn, pressed && styles.pressed]}>
                <X size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  Kanselahin ang Transaksyon
                </AnimoText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowCancelModal(false)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Bumalik
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <FeedbackModal
        visible={showCancelSuccessModal}
        tone="danger"
        title="Matagumpay na Nakansela"
        message="Nakansela na ang transaksyong ito."
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
      />

      <FeedbackModal
        visible={confirm !== null}
        tone="success"
        title={confirm === 'delivered' ? 'Kumpleto na ang Transaksyon' : 'Nakumpirma ang Bayad'}
        message={
          confirm === 'delivered'
            ? 'Naitala ang paghahatid at natapos na ang transaksyon. Maaari mo nang tingnan ang digital na resibo.'
            : 'Nakumpirma ang bayad. Kapag naihatid mo na ang palay, kumpirmahin din ang paghahatid.'
        }
        confirmLabel="Sige"
        onConfirm={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

function StageBanner({
  stage,
  transaction,
  buyerName,
}: {
  stage: DisplayStage;
  transaction: TransactionWithPayment;
  buyerName?: string;
}) {
  const header = (() => {
    switch (stage) {
      case 'awaiting_payment':
        return {
          icon: <Clock size={20} color="#B4791A" />,
          iconBg: '#FBF0D9',
          title: 'Tinanggap ang Kahilingan',
          caption: 'Naghihintay ng bayad mula sa mamimili.',
        };
      case 'payment_sent':
        return {
          icon: <Package size={20} color="#D97706" />,
          iconBg: '#FEF3C7',
          title: 'Naipadala na ang Bayad',
          caption: 'Kumpirmahin kapag natanggap na ang buong bayad.',
        };
      case 'payment_confirmed':
        return {
          icon: <CheckCircle2 size={20} color={AnimoColors.accentPrimary} />,
          iconBg: AnimoColors.accentPrimaryLight,
          title: 'Nakumpirma ang Bayad',
          caption: 'Kumpirmahin kapag naihatid mo na ang palay.',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 size={20} color={AnimoColors.accentPrimary} />,
          iconBg: AnimoColors.accentPrimaryLight,
          title: 'Kumpleto na ang Transaksyon',
          caption: 'Naihatid na ang palay at naisara na ang transaksyon.',
        };
      default:
        return {
          icon: <XCircle size={20} color={AnimoColors.danger} />,
          iconBg: AnimoColors.dangerTint,
          title: 'Nakansela ang Transaksyon',
          caption: 'Hindi na itutuloy ang transaksyong ito.',
        };
    }
  })();

  return (
    <View style={styles.bannerCard}>
      <View style={styles.bannerRow}>
        <View style={[styles.bannerIcon, { backgroundColor: header.iconBg }]}>{header.icon}</View>
        <View style={styles.bannerText}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {header.title}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {header.caption}
          </AnimoText>
        </View>
      </View>

      <View style={styles.bannerMeta}>
        <StatusBadge label={DISPLAY_STAGE_LABELS[stage]} tone={DISPLAY_STAGE_TONE[stage]} />
      </View>

      <View style={styles.divider} />
      {buyerName ? <MetaRow label="Mamimili" value={buyerName} /> : null}
      {transaction.payment ? <MetaRow label="Paraan ng Bayad" value={transaction.payment.paymentMode} /> : null}
    </View>
  );
}

function ListingCard({
  listing,
  transaction,
  isCancelled,
}: {
  listing: CropListing;
  transaction: TransactionWithPayment;
  isCancelled: boolean;
}) {
  return (
    <View style={[styles.listingCard, isCancelled && styles.listingCardMuted]}>
      <View style={styles.listingHeader}>
        <View style={styles.listingTitleGroup}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {varietyLabel(listing)}
          </AnimoText>
        </View>
        <AnimoText variant="price" color={AnimoColors.accentPrimary} style={styles.listingPriceText}>
          {formatPeso(transaction.totalAmount)}
        </AnimoText>
      </View>

      <View style={styles.specsRow}>
        <View style={styles.specItem}>
          <Scale size={14} color={AnimoColors.accentPrimary} />
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {transaction.quantityKg} kg
          </AnimoText>
        </View>
        <View style={styles.specItem}>
          <Droplets size={14} color={AnimoColors.textMediumEmphasis} />
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {listing.declaredMoisture}
          </AnimoText>
        </View>
        <View style={styles.specItem}>
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            {formatPeso(transaction.agreedPricePerKg)} / kg
          </AnimoText>
        </View>
      </View>
    </View>
  );
}

function BuyerPartyCard({
  buyer,
  quantityKg,
  total,
  onCall,
}: {
  buyer: TransactionCounterpart;
  quantityKg: number;
  total: number;
  onCall: () => void;
}) {
  const openBuyerProfile = () => {
    router.push({
      pathname: '/(farmer)/mamimili/[id]',
      params: {
        id: buyer.id,
        quantityKg: String(quantityKg),
        total: String(total),
      },
    });
  };

  return (
    <View style={styles.partyCard}>
      <View style={styles.partyHeaderRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tingnan ang profile ng mamimili"
          hitSlop={8}
          onPress={openBuyerProfile}
          style={({ pressed }) => [styles.partyAvatar, pressed && styles.pressed]}>
          <User size={20} color={AnimoColors.accentPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tingnan ang profile ni ${buyer.name}`}
          hitSlop={8}
          onPress={openBuyerProfile}
          style={styles.flex}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {buyer.name}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Mamimili
          </AnimoText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tawagan si ${buyer.name}`}
          onPress={onCall}
          style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
          <Phone size={15} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.callBtnText}>
            Tawagan
          </AnimoText>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.partyContactRow}>
        <Phone size={15} color={AnimoColors.textMediumEmphasis} />
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
          {buyer.phone}
        </AnimoText>
      </View>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.metaLabel}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.metaValue}>
        {value}
      </AnimoText>
    </View>
  );
}

function FooterActions({
  stage,
  canCancel,
  onConfirmPayment,
  onConfirmDelivered,
  onCancel,
  onRate,
  onBackToMarket,
}: {
  stage: DisplayStage;
  canCancel: boolean;
  onConfirmPayment: () => void;
  onConfirmDelivered: () => void;
  onCancel: () => void;
  onRate: () => void;
  onBackToMarket: () => void;
}) {
  if (stage === 'payment_sent') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton label="Natanggap ko na ang Bayad" icon={Check} onPress={onConfirmPayment} />
        {canCancel ? <AnimoButton label="Kanselahin ang Transaksyon" variant="dangerOutline" icon={X} onPress={onCancel} /> : null}
      </View>
    );
  }

  if (stage === 'awaiting_payment') {
    return (
      <View style={styles.footerStack}>
        {canCancel ? <AnimoButton label="Kanselahin ang Transaksyon" variant="dangerOutline" icon={X} onPress={onCancel} /> : null}
      </View>
    );
  }

  if (stage === 'payment_confirmed') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton label="Kumpirmahin ang Paghahatid" icon={Check} onPress={onConfirmDelivered} />
      </View>
    );
  }

  if (stage === 'completed') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton label="Magbigay ng Rating" variant="secondary" icon={Star} onPress={onRate} />
        <AnimoButton label="Bumalik sa Palengke" icon={Check} onPress={onBackToMarket} />
      </View>
    );
  }

  return (
    <View style={styles.footerStack}>
      <AnimoButton label="Bumalik sa Transaksyon" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function farmerHeaderTitle(stage: DisplayStage): string {
  switch (stage) {
    case 'awaiting_payment':
    case 'payment_sent':
      return 'Pagbabayad';
    case 'payment_confirmed':
      return 'Paghahatid';
    case 'completed':
      return 'Detalye ng Transaksyon';
    default:
      return 'Katayuan ng Transaksyon';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.appBackground },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoSpacing.xl },
  scroll: { paddingHorizontal: AnimoSpacing.lg, paddingTop: AnimoSpacing.sm, paddingBottom: AnimoSpacing.xl, gap: AnimoSpacing.lg },
  flex: { flex: 1 },
  bannerCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  bannerRow: { flexDirection: 'row', gap: AnimoSpacing.md },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bannerText: { flex: 1, gap: 2 },
  bannerMeta: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.sm },
  divider: { height: 1, backgroundColor: AnimoColors.borderLowEmphasis, marginVertical: AnimoSpacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoSpacing.md },
  metaLabel: { flex: 1 },
  metaValue: { textAlign: 'right', flexShrink: 0 },
  listingCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.sm,
  },
  listingCardMuted: { opacity: 0.7 },
  listingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: AnimoSpacing.md },
  listingTitleGroup: { flex: 1, gap: 2 },
  listingPriceText: { textAlign: 'right', flexShrink: 0 },
  specsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoSpacing.md, marginTop: 4 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partyCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.sm,
  },
  partyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoSpacing.md },
  partyAvatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
  },
  callBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  partyContactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
  },
  receiptIcon: { width: 40, height: 40, borderRadius: AnimoRadius.md, backgroundColor: AnimoColors.greenTint, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
    backgroundColor: AnimoColors.appBackground,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
  footerStack: { gap: AnimoSpacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: AnimoSpacing.lg },
  confirmModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmModalIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: AnimoColors.accentPrimaryLight, alignItems: 'center', justifyContent: 'center' },
  dangerIconCircle: { backgroundColor: AnimoColors.dangerTint },
  confirmModalHeaderGroup: { alignItems: 'center', gap: AnimoSpacing.xs },
  confirmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
  },
  textCenter: { textAlign: 'center' },
  modalActions: { width: '100%', gap: AnimoSpacing.sm, marginTop: 6 },
  confirmRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.danger,
  },
  cancelDismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pressed: { opacity: 0.85 },
});
