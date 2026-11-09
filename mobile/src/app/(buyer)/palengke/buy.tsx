import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Banknote, Clock, Lock, Smartphone, Wheat } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { BidConfirmationModal } from '@/components/animo/bid-confirmation-modal';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { QuantityStepper } from '@/components/animo/ui/stepper';
import { StatusPill } from '@/components/animo/ui/status-pill';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing, type StatusTone } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { cancelPurchaseRequest, submitPurchaseRequest } from '@/services/purchase-request-service';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { isOnlineNow, isSignalError, newRequestId, savePurchaseRequestOffline } from '@/lib/outbox/enqueue-actions';
import { minimumPurchaseKg, varietyLabel, type CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';

/** Size of one stepper tap, in kg (DESIGN_SPEC section 6b). */
const STEP_KG = 50;

function NoteCard({
  icon,
  tone,
  title,
  body,
}: {
  icon: typeof Clock;
  tone: StatusTone;
  title: string;
  body: string;
}) {
  const bgs: Record<StatusTone, string> = {
    success: AnimoV2Colors.successBg,
    warning: AnimoV2Colors.warningBg,
    danger: AnimoV2Colors.dangerBg,
    caution: AnimoV2Colors.cautionBg,
    neutral: AnimoV2Colors.surfaceMuted,
  };
  return (
    <View style={[styles.note, { backgroundColor: bgs[tone] }]}>
      <IconTile icon={icon} tone={tone} size={40} solid />
      <View style={styles.noteCopy}>
        <AnimoText variant="bodyStrong">{title}</AnimoText>
        <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
          {body}
        </AnimoText>
      </View>
    </View>
  );
}

/** Bumili ng Palay — purchase request screen with quantity, system-locked pricing, and a real cancel-window confirmation modal. */
export default function BuyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, isTagalog } = useLanguage();
  const insets = useSafeAreaInsets();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<PurchaseRequest | null>(null);
  const [savedOffline, setSavedOffline] = useState(false);
  const { account } = useSession();
  const [requestId, setRequestId] = useState(newRequestId);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await fetchMarketplaceListing(id);
        if (!cancelled) {
          setListing(result);
          setQuantity((current) => current || (result ? String(minimumPurchaseKg(result)) : ''));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : isTagalog
                ? 'Hindi ma-load ang listing.'
                : 'Failed to load listing.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isTagalog]);

  const header = <V2BackHeader title={t('buyReqV2.title')} backLabel={t('common.back')} onBack={() => router.back()} />;

  if (loading) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} accessibilityLabel={t('common.loading')} />
        </View>
      </View>
    );
  }

  if (!listing || loadError) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.missing}>
          <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
            {loadError ?? t('buyReqV2.unavailable')}
          </AnimoText>
        </View>
      </View>
    );
  }

  const pricePerKg = listing.pricePerKg ?? 0;
  const minimumKg = minimumPurchaseKg(listing);
  const qtyNum = Number(quantity);
  const overRemaining = qtyNum > listing.remainingQuantityKg;
  const underMinimum = qtyNum > 0 && qtyNum < minimumKg;
  const total = qtyNum * pricePerKg;
  const canConfirm = Number.isFinite(qtyNum) && qtyNum > 0 && !overRemaining && !underMinimum && pricePerKg > 0 && listing.status === 'Available' && !submitting;

  // Stepper bounds: steps of 50 kg between the minimum and the remaining stock.
  const stepperValue = Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : minimumKg;
  const canDecrement = stepperValue > minimumKg;
  const canIncrement = stepperValue < listing.remainingQuantityKg;
  const halfKg = Math.min(listing.remainingQuantityKg, Math.max(minimumKg, Math.round(listing.remainingQuantityKg / 2)));
  const quantityError = overRemaining
    ? t('buyReqV2.overRemaining', { kg: listing.remainingQuantityKg })
    : underMinimum
      ? t('buyReqV2.underMinimum', { kg: minimumKg })
      : null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setSubmitError(null);
    const saveOffline = async () => {
      if (!account) return false;
      await savePurchaseRequestOffline(account.id, { listingId: listing.id, requestedQuantityKg: qtyNum }, requestId);
      setSavedOffline(true);
      return true;
    };
    try {
      if (!(await isOnlineNow())) {
        await saveOffline();
        return;
      }
      const request = await submitPurchaseRequest(
        { listingId: listing.id, requestedQuantityKg: qtyNum },
        requestId,
      );
      setSubmittedRequest(request);
      setRequestId(newRequestId());
    } catch (error) {
      // The signal dropped before the request reached the server: keep it instead of losing it.
      if (isSignalError(error) && (await saveOffline().catch(() => false))) return;
      setSubmitError(
        error instanceof Error
          ? error.message
          : isTagalog
            ? 'Hindi maipadala ang request.'
            : 'Failed to send request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {header}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Mini listing summary */}
          <DepthCard depth="flat" radius="lg" style={styles.summaryCard}>
            <IconTile icon={Wheat} tone="success" size={56} solid shape="rounded" />
            <View style={styles.flex}>
              <AnimoText variant="subheading" numberOfLines={2}>
                {varietyLabel(listing, language)}
              </AnimoText>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {formatPeso(pricePerKg)} {t('detailV2.perKg')}
              </AnimoText>
            </View>
          </DepthCard>

          {/* Quantity */}
          <DepthCard depth="flat" style={styles.cardPad}>
            <AnimoText variant="subheading" accessibilityRole="header">
              {t('buyReqV2.quantityTitle')}
            </AnimoText>
            <QuantityStepper
              value={stepperValue}
              decrementLabel={t('buyReqV2.decrease', { kg: STEP_KG })}
              incrementLabel={t('buyReqV2.increase', { kg: STEP_KG })}
              decrementDisabled={!canDecrement}
              incrementDisabled={!canIncrement}
              onDecrement={() => setQuantity(String(Math.max(minimumKg, stepperValue - STEP_KG)))}
              onIncrement={() => setQuantity(String(Math.min(listing.remainingQuantityKg, stepperValue + STEP_KG)))}
            />
            <View style={styles.shortcutRow}>
              <FilterChip
                label={t('buyReqV2.half')}
                selected={stepperValue === halfKg && stepperValue !== listing.remainingQuantityKg}
                onPress={() => setQuantity(String(halfKg))}
              />
              <FilterChip
                label={t('buyReqV2.all')}
                selected={stepperValue === listing.remainingQuantityKg}
                onPress={() => setQuantity(String(listing.remainingQuantityKg))}
              />
            </View>
            {quantityError ? (
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
                {quantityError}
              </AnimoText>
            ) : (
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('buyReqV2.range', { min: minimumKg, max: listing.remainingQuantityKg })}
              </AnimoText>
            )}
            {listing.remainingQuantityKg > 0 && listing.remainingQuantityKg < listing.minimumRequestKg ? (
              <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
                {t('buyReqV2.belowMinimum')}
              </AnimoText>
            ) : null}
          </DepthCard>

          {/* Locked price and live total */}
          <DepthCard
            depth="flat"
            backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
            borderColor={AnimoV2Colors.actionPrimary}
            style={styles.cardPad}>
            <View style={styles.lockedHead}>
              <Lock size={20} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
              <AnimoText variant="bodyStrong" style={styles.flex}>
                {t('buyReqV2.lockedTitle')}
              </AnimoText>
              <StatusPill tone="success" label={t('buyReqV2.lockedBadge')} icon={Lock} />
            </View>
            <View style={styles.rowBetween}>
              <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary}>
                {t('buyReqV2.pricePerKg')}
              </AnimoText>
              <AnimoText variant="bodyStrong">{formatPeso(pricePerKg)}</AnimoText>
            </View>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyReqV2.lockedNote')}
            </AnimoText>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <AnimoText variant="bodyStrong" style={styles.flex}>
                {t('buyReqV2.total')}
              </AnimoText>
              <AnimoText variant="priceHero" color={AnimoV2Colors.textBrand} style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatPeso(total)}
              </AnimoText>
            </View>
            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('buyReqV2.calc', { price: formatPeso(pricePerKg), qty: Number.isFinite(qtyNum) ? qtyNum : 0 })}
            </AnimoText>
          </DepthCard>

          {/* Notes */}
          <NoteCard icon={Clock} tone="warning" title={t('buyReqV2.cancelNoteTitle')} body={t('buyReqV2.cancelNoteBody')} />
          <NoteCard icon={Banknote} tone="success" title={t('buyReqV2.payNoteTitle')} body={t('buyReqV2.payNoteBody')} />
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t('buyReqV2.allocationNote')}
          </AnimoText>

          {submitError ? (
            <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg}>
              {submitError}
            </AnimoText>
          ) : null}
        </ScrollView>

        <StickyFooter>
          <ChunkyButton
            label={submitting ? t('buyReqV2.sending') : t('buyReqV2.submit')}
            onPress={handleConfirm}
            disabled={!canConfirm}
          />
          <View style={{ height: insets.bottom }} />
        </StickyFooter>
      </KeyboardAvoidingView>

      <V2Dialog
        visible={savedOffline}
        onClose={() => {}}
        dismissable={false}
        icon={Smartphone}
        iconTone="warning"
        title={t('buyReqV2.offlineTitle')}
        message={t('buyReqV2.offlineBody')}
        actions={
          <ChunkyButton
            label={t('detailV2.ok')}
            onPress={() => {
              setSavedOffline(false);
              router.replace('/(buyer)/transaksyon');
            }}
          />
        }
      />

      <BidConfirmationModal
        visible={submittedRequest !== null}
        summary={`${varietyLabel(listing, language)} · ${qtyNum} kg`}
        total={total}
        cancelDeadline={submittedRequest?.cancelDeadline ?? null}
        onCancel={async () => {
          if (!submittedRequest) return;
          await cancelPurchaseRequest(submittedRequest.id);
          setSubmittedRequest(null);
        }}
        onComplete={() => {
          setSubmittedRequest(null);
          router.replace('/(buyer)/transaksyon');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  centerText: { textAlign: 'center' },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.md, padding: AnimoV2Spacing.md },
  cardPad: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  shortcutRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  lockedHead: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: AnimoV2Spacing.md },
  divider: { height: 2, borderRadius: 2, backgroundColor: AnimoV2Colors.brandLight },
  totalValue: { flexShrink: 1, textAlign: 'right' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoV2Spacing.md,
    padding: AnimoV2Spacing.md,
    borderRadius: AnimoV2Radius.lg,
  },
  noteCopy: { flex: 1, gap: 2 },
});
