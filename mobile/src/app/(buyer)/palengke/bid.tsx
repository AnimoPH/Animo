import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BidConfirmationModal } from '@/components/animo/bid-confirmation-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import { ListingImage } from '@/components/animo/listing-image';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { cancelPurchaseRequest, submitPurchaseRequest } from '@/services/purchase-request-service';
import { fetchMarketplaceListing } from '@/services/marketplace-service';
import { varietyLabel, type CropListing } from '@/types/crop-listing';
import type { PurchaseRequest } from '@/types/purchase-request';

/** Bumili ng Palay — purchase request screen with quantity, system-locked pricing, and a real cancel-window confirmation modal. */
export default function BuyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [listing, setListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState('200');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<PurchaseRequest | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await fetchMarketplaceListing(id);
        if (!cancelled) setListing(result);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Hindi ma-load ang listing.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Bumili ng Palay" />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoColors.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!listing || loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Bumili ng Palay" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            {loadError ?? 'Hindi na available ang pagbili para sa listing na ito.'}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const pricePerKg = listing.pricePerKg ?? 0;
  const qtyNum = parseInt(quantity || '0', 10) || 0;
  const overRemaining = qtyNum > listing.remainingQuantityKg;
  const underMinimum = qtyNum > 0 && qtyNum < listing.minimumRequestKg;
  const total = qtyNum * pricePerKg;
  const canConfirm = qtyNum > 0 && !overRemaining && !underMinimum && !submitting;

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const request = await submitPurchaseRequest({
        listingId: listing.id,
        requestedQuantityKg: qtyNum,
      });
      setSubmittedRequest(request);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Hindi maipadala ang request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Bumili ng Palay" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Listing summary */}
          <View style={styles.summaryCard}>
            <ListingImage height={64} borderRadius={AnimoRadius.md} style={styles.thumb} />
            <View style={styles.flex}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                {varietyLabel(listing)}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                {formatPeso(pricePerKg)} bawat kilo
              </AnimoText>
            </View>
          </View>

          {/* Quantity details */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalye ng Pagbili
            </AnimoText>
            <LabeledInput
              label="Dami na nais bilhin"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={(t) => setQuantity(t.replace(/\D/g, ''))}
              suffixText="kilo/kg"
              error={overRemaining || underMinimum}
              hint={
                overRemaining
                  ? `Hindi maaaring lumampas sa ${listing.remainingQuantityKg} kg na natitirang stock.`
                  : underMinimum
                    ? `Kailangan ng hindi bababa sa ${listing.minimumRequestKg} kg.`
                    : `${listing.minimumRequestKg}–${listing.remainingQuantityKg} kg ang maaaring hilingin.`
              }
              hintTone={overRemaining || underMinimum ? 'danger' : 'muted'}
            />
          </View>

          {/* Locked price / total */}
          <View style={styles.lockedCard}>
            <View style={styles.lockedHeader}>
              <View style={styles.lockedTitle}>
                <Lock size={16} color={AnimoColors.blackSecondary} />
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  Nakatakda ng sistema
                </AnimoText>
              </View>
              <StatusBadge label="Hindi mababago" tone="neutral" />
            </View>

            <View style={styles.rowBetween}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Presyo bawat kilo
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {formatPeso(pricePerKg)}
              </AnimoText>
            </View>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Kinomputa ng ANIMO para sa patas na presyo batay sa pamantayan.
            </AnimoText>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.rowLabel}>
                Kabuuang halaga
              </AnimoText>
              <AnimoText variant="price" color={AnimoColors.green} style={styles.rowValue}>
                {formatPeso(total)}
              </AnimoText>
            </View>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Awtomatikong kinakalkula: {formatPeso(pricePerKg)} × {qtyNum} kg
            </AnimoText>
          </View>

          {submitError ? (
            <AnimoText variant="caption" color={AnimoColors.danger}>
              {submitError}
            </AnimoText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <AnimoButton
            label={submitting ? 'Ipinapadala…' : 'Kumpirmahin ang Pagbili'}
            onPress={handleConfirm}
            disabled={!canConfirm}
          />
        </View>
      </KeyboardAvoidingView>

      <BidConfirmationModal
        visible={submittedRequest !== null}
        summary={`${varietyLabel(listing)} · ${qtyNum} kg`}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  flex: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.white,
  },
  thumb: {
    width: 64,
  },
  badgeWrap: {
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.lg,
    backgroundColor: AnimoColors.white,
  },
  lockedCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surface,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  rowLabel: {
    flex: 1,
    flexShrink: 1,
  },
  rowValue: {
    textAlign: 'right',
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    backgroundColor: AnimoColors.background,
  },
});
