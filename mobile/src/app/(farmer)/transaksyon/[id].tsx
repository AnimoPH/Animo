import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, Info, Phone, Star, User, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FARMER_STAGE_PILL, FarmerStagePill, stageIcon } from '@/components/animo/farmer/farmer-stage';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { Timeline, type TimelineStep, type TimelineStepState } from '@/components/animo/ui/timeline';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, AnimoV2Status } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import type { TranslationKey } from '@/i18n/translations';
import { isOnlineNow, isSignalError, saveFarmerConfirmOffline } from '@/lib/outbox/enqueue-actions';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  cancelTransaction,
  confirmPaymentReceived,
  fetchTransaction,
  fetchTransactionCounterpart,
  markDelivered,
} from '@/services/transaction-service';
import { listingTitle, type CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';
import {
  PAYMENT_MODE_LABELS,
  buildProgressSteps,
  deriveDisplayStage,
  formatReferenceId,
  getDisplayStageLabel,
  type DisplayStage,
  type ProgressStepKey,
  type PurchaseOutcome,
  type TransactionCounterpart,
  type TransactionWithPayment,
} from '@/types/transaction';

type ConfirmKind = 'payment_received' | 'delivered' | null;
type ActionConfirmType = 'confirm_payment' | 'confirm_delivered' | null;

const STEP_LABEL_KEY: Record<ProgressStepKey, TranslationKey> = {
  kahilingan: 'ftx.stepRequest',
  tinanggap: 'ftx.stepAccepted',
  bayad: 'ftx.stepPayment',
  kumpleto: 'ftx.stepDone',
};

const STATE_LABEL_KEY: Record<TimelineStepState, TranslationKey> = {
  done: 'ftx.stDone',
  current: 'ftx.stCurrent',
  upcoming: 'ftx.stUpcoming',
  failed: 'ftx.stFailed',
};

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
  const { t, language } = useLanguage();

  const [transaction, setTransaction] = useState<TransactionWithPayment | null>(null);
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [buyer, setBuyer] = useState<TransactionCounterpart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [actionConfirmType, setActionConfirmType] = useState<ActionConfirmType>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const { account } = useSession();
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
      setError(e instanceof Error ? e.message : t('ftx.loadTxError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
    const saveOffline = async () => {
      if (!account || !transaction.payment) return false;
      await saveFarmerConfirmOffline(account.id, transaction.payment.id);
      setSavedOffline(true);
      return true;
    };
    try {
      if (type === 'confirm_payment' && transaction.payment) {
        if (!(await isOnlineNow())) {
          await saveOffline();
          return;
        }
        await confirmPaymentReceived(transaction.payment.id);
        setConfirm('payment_received');
      } else if (type === 'confirm_delivered') {
        await markDelivered(transaction.id);
        setConfirm('delivered');
      }
      await load();
    } catch (e) {
      // The signal dropped before the confirm reached the server: keep it instead of losing it.
      if (type === 'confirm_payment' && isSignalError(e) && (await saveOffline().catch(() => false))) return;
      setActionError(e instanceof Error ? e.message : t('ftx.actionFailed'));
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
      setActionError(e instanceof Error ? e.message : t('ftx.cancelFailed'));
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <V2BackHeader title={t('ftx.detailTitle')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </View>
    );
  }

  if (!transaction || !request || error) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <V2BackHeader title={t('ftx.detailTitle')} backLabel={t('ftx.back')} onBack={() => router.back()} />
        <View style={styles.missing}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {error ?? t('ftx.txNotFound')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const outcome: PurchaseOutcome = { kind: 'matched', request, transaction };
  const stage = deriveDisplayStage(outcome);
  // Cancelling stops the moment the buyer marks the payment as sent. 'Payment sent' is not a
  // status of its own - the row stays Pending_Payment and only the payment's buyerConfirmedAt
  // is set - so testing the status alone cannot tell 'not paid yet' from 'says they paid'.
  const canCancel = stage === 'awaiting_payment';
  const steps: TimelineStep[] = buildProgressSteps(outcome, 'farmer', language).map((step) => ({
    key: step.key,
    label: t(STEP_LABEL_KEY[step.key]),
    detail: [step.timestamp, step.detail].filter(Boolean).join(' · ') || undefined,
    state: step.state,
  }));
  const showP2pNote = stage === 'awaiting_payment' || stage === 'payment_sent';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <V2BackHeader title={headerTitle(stage, t)} backLabel={t('ftx.back')} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <StageBanner stage={stage} label={getDisplayStageLabel(stage, language)} t={t} />

        {listing ? (
          <DepthCard>
            <View style={styles.cardBody}>
              <View style={styles.rowBetween}>
                <AnimoText variant="subheading" style={styles.flex} numberOfLines={2}>
                  {listingTitle(listing)}
                </AnimoText>
                <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
                  {formatReferenceId(request.id, 'PR')}
                </AnimoText>
              </View>
              <View style={styles.rowBetween}>
                <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.flex}>
                  {t('ftx.kgAtPrice', {
                    kg: transaction.quantityKg,
                    price: formatPeso(transaction.agreedPricePerKg),
                  })}
                </AnimoText>
                <AnimoText variant="priceV2" color={AnimoV2Colors.textBrand}>
                  {formatPeso(transaction.totalAmount)}
                </AnimoText>
              </View>
            </View>
          </DepthCard>
        ) : null}

        <DepthCard depth="flat">
          <View style={styles.cardBody}>
            <AnimoText variant="subheading">{t('ftx.timelineTitle')}</AnimoText>
            <Timeline
              steps={steps}
              stateLabel={(s) => t(STATE_LABEL_KEY[s])}
              stepLabel={(n) => t('ftx.stepN', { n })}
            />
          </View>
        </DepthCard>

        {showP2pNote ? (
          <View style={styles.note}>
            <IconTile icon={Info} tone="warning" size={36} />
            <AnimoText variant="captionV2" color={AnimoV2Colors.warningFg} style={styles.flex}>
              {t('ftx.p2pNote')}
            </AnimoText>
          </View>
        ) : null}

        {buyer ? (
          <BuyerPartyCard
            buyer={buyer}
            quantityKg={transaction.quantityKg}
            total={transaction.totalAmount}
            t={t}
            onCall={() => handleCallBuyer(buyer.phone)}
          />
        ) : null}

        {transaction.payment ? (
          <PaymentCard
            paidAmount={transaction.payment.amount}
            agreedAmount={transaction.totalAmount}
            mode={transaction.payment.paymentMode}
            reference={transaction.payment.gcashReferenceNumber}
            t={t}
          />
        ) : null}

        {actionError ? (
          <View style={styles.errorRow}>
            <X size={18} color={AnimoV2Colors.dangerFg} strokeWidth={3} />
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.flex}>
              {actionError}
            </AnimoText>
          </View>
        ) : null}
      </ScrollView>

      <StickyFooter>
        <FooterActions
          stage={stage}
          canCancel={canCancel}
          t={t}
          onConfirmPayment={() => setActionConfirmType('confirm_payment')}
          onConfirmDelivered={() => setActionConfirmType('confirm_delivered')}
          onCancel={() => setShowCancelModal(true)}
          onViewReceipt={() =>
            router.push({ pathname: '/(farmer)/resibo', params: { id: transaction.id } } as Href)
          }
          onRate={() => router.push({ pathname: '/(farmer)/review', params: { id: transaction.id } })}
          onBackToMarket={() => router.push('/(farmer)/(tabs)/palengke' as Href)}
        />
      </StickyFooter>

      <V2Dialog
        visible={actionConfirmType !== null}
        onClose={() => setActionConfirmType(null)}
        icon={Check}
        iconTone="success"
        title={actionConfirmType === 'confirm_payment' ? t('ftx.dlgPayTitle') : t('ftx.dlgDeliverTitle')}
        message={actionConfirmType === 'confirm_payment' ? t('ftx.dlgPayMsg') : t('ftx.dlgDeliverMsg')}
        actions={
          <>
            <ChunkyButton
              label={actionConfirmType === 'confirm_payment' ? t('ftx.dlgPayYes') : t('ftx.dlgDeliverYes')}
              onPress={handleExecuteAction}
            />
            <ChunkyButton label={t('ftx.notNow')} variant="secondary" onPress={() => setActionConfirmType(null)} />
          </>
        }
      />

      <V2Dialog
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        icon={X}
        iconTone="danger"
        title={t('ftx.dlgCancelTitle')}
        message={t('ftx.dlgCancelMsg')}
        actions={
          <>
            <ChunkyButton label={t('ftx.cancelTx')} variant="danger" onPress={handleConfirmCancel} />
            <ChunkyButton label={t('ftx.back')} variant="secondary" onPress={() => setShowCancelModal(false)} />
          </>
        }
      />

      <V2Dialog
        visible={savedOffline}
        onClose={() => {
          setSavedOffline(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
        icon={Info}
        iconTone="warning"
        title={t('ftx.offlineTitle')}
        message={t('ftx.offlineMsg')}
        dismissable={false}
        actions={
          <ChunkyButton
            label={t('ftx.ok')}
            onPress={() => {
              setSavedOffline(false);
              router.replace('/(farmer)/(tabs)/transaksyon');
            }}
          />
        }
      />

      <V2Dialog
        visible={showCancelSuccessModal}
        onClose={() => {
          setShowCancelSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
        icon={X}
        iconTone="danger"
        title={t('ftx.cancelledTitle')}
        message={t('ftx.cancelledMsg')}
        dismissable={false}
        actions={
          <ChunkyButton
            label={t('ftx.ok')}
            onPress={() => {
              setShowCancelSuccessModal(false);
              router.replace('/(farmer)/(tabs)/transaksyon');
            }}
          />
        }
      />

      <V2Dialog
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        icon={Check}
        iconTone="success"
        title={confirm === 'delivered' ? t('ftx.doneTitle') : t('ftx.payConfTitle')}
        message={confirm === 'delivered' ? t('ftx.doneMsg') : t('ftx.payConfMsg')}
        actions={<ChunkyButton label={t('ftx.ok')} onPress={() => setConfirm(null)} />}
      />
    </View>
  );
}

type Translate = (key: TranslationKey, params?: Record<string, string | number>) => string;

function StageBanner({ stage, label, t }: { stage: DisplayStage; label: string; t: Translate }) {
  const copy = (() => {
    switch (stage) {
      case 'awaiting_payment':
        return { title: t('ftx.bnAwaitingTitle'), caption: t('ftx.bnAwaitingCap') };
      case 'payment_sent':
        return { title: t('ftx.bnSentTitle'), caption: t('ftx.bnSentCap') };
      case 'payment_confirmed':
        return { title: t('ftx.bnConfirmedTitle'), caption: t('ftx.bnConfirmedCap') };
      case 'completed':
        return { title: t('ftx.bnDoneTitle'), caption: t('ftx.bnDoneCap') };
      default:
        return { title: t('ftx.bnCancelledTitle'), caption: t('ftx.bnCancelledCap') };
    }
  })();
  const { tone } = FARMER_STAGE_PILL[stage];
  const palette = AnimoV2Status[tone];

  return (
    <DepthCard depth="flat" backgroundColor={palette.bg} borderColor={palette.solid}>
      <View style={[styles.cardBody, styles.bannerRow]}>
        <IconTile icon={stageIcon(stage)} tone={tone} size={56} solid />
        <View style={styles.flex}>
          <AnimoText variant="subheading" color={palette.fg}>
            {copy.title}
          </AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {copy.caption}
          </AnimoText>
          <View style={styles.pillGap}>
            <FarmerStagePill stage={stage} label={label} />
          </View>
        </View>
      </View>
    </DepthCard>
  );
}

function BuyerPartyCard({
  buyer,
  quantityKg,
  total,
  t,
  onCall,
}: {
  buyer: TransactionCounterpart;
  quantityKg: number;
  total: number;
  t: Translate;
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
    <DepthCard depth="flat">
      <View style={styles.cardBody}>
        <View style={styles.partyRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ftx.viewBuyer', { name: buyer.name })}
            onPress={openBuyerProfile}
            style={styles.partyInfo}>
            <IconTile icon={User} tone="success" />
            <View style={styles.flex}>
              <AnimoText variant="subheading" numberOfLines={1}>
                {buyer.name}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('ftx.buyer')}
              </AnimoText>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ftx.callBuyer', { name: buyer.name })}
            onPress={onCall}
            style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
            <Phone size={20} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand}>
              {t('ftx.call')}
            </AnimoText>
          </Pressable>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('ftx.contactNumber')}
          </AnimoText>
          <AnimoText variant="bodyStrong" style={styles.rightText}>
            {buyer.phone}
          </AnimoText>
        </View>
      </View>
    </DepthCard>
  );
}

/** Amount paid vs agreed total, plus how it was paid (GCash reference when there is one). */
function PaymentCard({
  paidAmount,
  agreedAmount,
  mode,
  reference,
  t,
}: {
  paidAmount: number;
  agreedAmount: number;
  mode: keyof typeof PAYMENT_MODE_LABELS;
  reference?: string | null;
  t: Translate;
}) {
  const difference = paidAmount - agreedAmount;
  const isMatch = Math.abs(difference) < 0.01;

  return (
    <DepthCard depth="flat">
      <View style={styles.cardBody}>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
          {t('ftx.amountPaid')}
        </AnimoText>
        <AnimoText variant="heading" color={AnimoV2Colors.textBrand}>
          {formatPeso(paidAmount)}
        </AnimoText>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('ftx.agreedPrice')}
          </AnimoText>
          <AnimoText variant="bodyStrong">{formatPeso(agreedAmount)}</AnimoText>
        </View>
        <View style={styles.rowBetween}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('ftx.difference')}
          </AnimoText>
          <View style={styles.matchRow}>
            {isMatch ? <Check size={18} color={AnimoV2Colors.successFg} strokeWidth={3} /> : null}
            <AnimoText variant="bodyStrong" color={isMatch ? AnimoV2Colors.successFg : AnimoV2Colors.textPrimary}>
              {isMatch ? `${formatPeso(0)} (${t('ftx.match')})` : formatPeso(Math.abs(difference))}
            </AnimoText>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
            {t('ftx.payMethod')}
          </AnimoText>
          <View style={styles.rightCol}>
            <AnimoText variant="bodyStrong">{PAYMENT_MODE_LABELS[mode]}</AnimoText>
            {mode === 'GCash' && reference ? (
              <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
                {t('ftx.refShort', { ref: reference })}
              </AnimoText>
            ) : null}
          </View>
        </View>
      </View>
    </DepthCard>
  );
}

function FooterActions({
  stage,
  canCancel,
  t,
  onConfirmPayment,
  onConfirmDelivered,
  onCancel,
  onViewReceipt,
  onRate,
  onBackToMarket,
}: {
  stage: DisplayStage;
  canCancel: boolean;
  t: Translate;
  onConfirmPayment: () => void;
  onConfirmDelivered: () => void;
  onCancel: () => void;
  onViewReceipt: () => void;
  onRate: () => void;
  onBackToMarket: () => void;
}) {
  const cancelButton = canCancel ? (
    <ChunkyButton
      label={t('ftx.cancelTx')}
      variant="secondary"
      icon={X}
      textColor={AnimoV2Colors.dangerFg}
      borderColor={AnimoV2Colors.dangerSolid}
      onPress={onCancel}
    />
  ) : null;

  if (stage === 'payment_sent') {
    return <ChunkyButton label={t('ftx.confirmPaymentBtn')} icon={Check} onPress={onConfirmPayment} />;
  }

  if (stage === 'awaiting_payment') {
    return cancelButton;
  }

  if (stage === 'payment_confirmed') {
    return <ChunkyButton label={t('ftx.confirmDelivery')} icon={Check} onPress={onConfirmDelivered} />;
  }

  if (stage === 'completed') {
    return (
      <>
        <ChunkyButton label={t('ftx.viewReceipt')} onPress={onViewReceipt} />
        <ChunkyButton label={t('ftx.leaveRating')} variant="secondary" icon={Star} onPress={onRate} />
        <ChunkyButton label={t('ftx.backToMarket')} variant="ghost" onPress={onBackToMarket} />
      </>
    );
  }

  return <ChunkyButton label={t('ftx.backToTx')} variant="secondary" onPress={() => router.back()} />;
}

function headerTitle(stage: DisplayStage, t: Translate): string {
  switch (stage) {
    case 'awaiting_payment':
    case 'payment_sent':
      return t('ftx.hdrPayment');
    case 'payment_confirmed':
      return t('ftx.hdrDelivery');
    case 'completed':
      return t('ftx.detailTitle');
    default:
      return t('ftx.hdrStatus');
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  scroll: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  flex: { flex: 1, minWidth: 0 },
  cardBody: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  bannerRow: { flexDirection: 'row', alignItems: 'center' },
  pillGap: { marginTop: AnimoV2Spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  rightText: { flexShrink: 1, textAlign: 'right' },
  rightCol: { alignItems: 'flex-end' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.borderDefault },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.warningSolid,
    backgroundColor: AnimoV2Colors.warningBg,
  },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md },
  partyInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md, minHeight: 48 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.xs,
    minHeight: 48,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.actionPrimary,
  },
  pressed: { opacity: 0.85 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
