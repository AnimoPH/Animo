import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Banknote, Check, CheckCircle2, Smartphone, Trash2, Upload, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { useSession } from '@/hooks/use-session';
import { isOnlineNow, isSignalError, newRequestId, saveBuyerPaymentOffline } from '@/lib/outbox/enqueue-actions';
import { PhotoSourceSheet } from '@/components/animo/photo-source-sheet';
import { TransactionSummaryCard } from '@/components/animo/transaction-cycle-cards';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import {
  BuyerCancelDialog,
  BuyerFeedbackDialog,
  InfoNote,
  TxnHeader,
} from '@/components/animo/buyer/txn-v2';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { OptionCard } from '@/components/animo/ui/option-card';
import { StickyFooter } from '@/components/animo/ui/screen-bits';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { formatPeso } from '@/constants/marketplace';
import { GCASH_REF_FORMAT_MESSAGE, GCASH_REF_LENGTH, isValidGcashReference } from '@/constants/payment';
import { fetchCropListing } from '@/services/crop-listing-service';
import { fetchPurchaseRequest } from '@/services/purchase-request-service';
import {
  cancelTransaction as cancelTransactionRpc,
  fetchTransactionByRequestId,
  recordPayment,
  recordPaymentFailureMessage,
} from '@/services/transaction-service';
import { useLanguage } from '@/hooks/use-language';
import type { CropListing } from '@/types/crop-listing';
import { buildProgressSteps, cancelPolicy, formatReferenceId, requestTotal, type PaymentMode, type PurchaseOutcome } from '@/types/transaction';

/** Paraan ng Pagbabayad — buyer records the payment here via `record_payment`. */
export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language, isTagalog } = useLanguage();

  const [outcome, setOutcome] = useState<PurchaseOutcome | null>(null);
  const [listing, setListing] = useState<CropListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actualAmountText, setActualAmountText] = useState('');
  const [method, setMethod] = useState<PaymentMode>('GCash');
  const [gcashReference, setGcashReference] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [savedOffline, setSavedOffline] = useState(false);
  const [requestId] = useState(newRequestId);
  const { account } = useSession();

  const [cancelling, setCancelling] = useState(false);
  const [showCancelledSuccessModal, setShowCancelledSuccessModal] = useState(false);

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
      setActualAmountText(String(transaction.totalAmount));
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
        <TxnHeader title={isTagalog ? 'Paraan ng Pagbabayad' : 'Payment Method'} />
        <View style={styles.missing}>
          <ActivityIndicator color={AnimoV2Colors.actionPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!outcome || outcome.kind !== 'matched' || loadError) {
    return (
      <SafeAreaView style={styles.safeArea} edges={[]}>
        <TxnHeader title={isTagalog ? 'Paraan ng Pagbabayad' : 'Payment Method'} />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoV2Colors.textSecondary}>
            {loadError ?? (isTagalog ? 'Hindi nahanap ang transaksyon na ito.' : 'Transaction could not be found.')}
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  // Double-submit guard: a payment already exists for this transaction (any
  // status) — record_payment can't be called again, so hand off instead of
  // letting the buyer try.
  if (outcome.transaction.payment) {
    return <Redirect href={`/(buyer)/transaksyon/${outcome.request.id}/resibo`} />;
  }

  const { transaction } = outcome;
  const agreedTotal = requestTotal(outcome);
  const policy = cancelPolicy(outcome, undefined, language);
  const actualAmountNum = parseFloat(actualAmountText.replace(/,/g, '')) || 0;

  const handlePickSource = async (source: 'camera' | 'gallery') => {
    setPhotoSheetVisible(false);
    setUploadError(undefined);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setUploadError(
        isTagalog
          ? 'Kailangan ng pahintulot para mag-attach ng resibo.'
          : 'Permission required to attach receipt.',
      );
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.[0]) return;
    setReceiptUri(result.assets[0].uri);
  };

  const isGcashValid = method !== 'GCash' || isValidGcashReference(gcashReference);
  const showGcashError = method === 'GCash' && gcashReference.length > 0 && !isValidGcashReference(gcashReference);
  const canContinue = actualAmountNum > 0 && isGcashValid && !submitting;

  const handleContinue = async () => {
    if (!isGcashValid) {
      setSubmitError(GCASH_REF_FORMAT_MESSAGE);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const saveOffline = async () => {
      if (!account) return false;
      await saveBuyerPaymentOffline(
        account.id,
        {
          transactionId: transaction.id,
          mode: method,
          amount: actualAmountNum,
          gcashReference: method === 'GCash' ? gcashReference : undefined,
        },
        requestId,
      );
      setSavedOffline(true);
      return true;
    };
    try {
      if (!(await isOnlineNow())) {
        await saveOffline();
        return;
      }
      const paymentId = await recordPayment(
        transaction.id,
        method,
        actualAmountNum,
        method === 'GCash' ? gcashReference : undefined,
        requestId,
      );
      router.push({
        pathname: `/(buyer)/transaksyon/${outcome.request.id}/kumpirmasyon` as any,
        params: { paymentId },
      });
    } catch (e) {
      // The signal dropped before the payment reached the server: keep it instead of losing it.
      if (isSignalError(e) && (await saveOffline().catch(() => false))) return;
      setSubmitError(recordPaymentFailureMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    await cancelTransactionRpc(transaction.id);
    setCancelling(false);
    setShowCancelledSuccessModal(true);
  };

  const amountDiffers = actualAmountNum !== agreedTotal;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar style="dark" />
      <TxnHeader title={isTagalog ? 'Paraan ng Pagbabayad' : 'Payment Method'} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {listing ? (
            <TransactionSummaryCard
              listing={listing}
              quantityKg={transaction.quantityKg}
              pricePerKg={transaction.agreedPricePerKg}
              totalAmount={agreedTotal}
              referenceId={formatReferenceId(outcome.request.id, 'PR')}
              language={language}
            />
          ) : null}

          <DepthCard depth="flat" radius="xl" style={styles.card}>
            <TextField
              label={isTagalog ? 'Halagang Aktwal na Binayaran' : 'Actual Amount Paid'}
              keyboardType="numeric"
              value={actualAmountText}
              onChangeText={(text) => setActualAmountText(text.replace(/[^0-9.]/g, ''))}
              prefix="₱"
              hint={amountDiffers ? undefined : isTagalog ? 'Tugma sa napagkasunduang presyo ng sistema.' : 'Matches agreed system price.'}
            />
            {amountDiffers ? (
              <InfoNote tone="warning" icon={AlertTriangle}>
                {actualAmountNum > agreedTotal
                  ? isTagalog
                    ? `Mas mataas ng ${formatPeso(actualAmountNum - agreedTotal)} kaysa sa presyo ng sistema.`
                    : `${formatPeso(actualAmountNum - agreedTotal)} higher than system price.`
                  : isTagalog
                    ? `Mas mababa ng ${formatPeso(agreedTotal - actualAmountNum)} kaysa sa presyo ng sistema.`
                    : `${formatPeso(agreedTotal - actualAmountNum)} lower than system price.`}
              </InfoNote>
            ) : null}
          </DepthCard>

          {/* Payment Method Selector */}
          <View style={styles.section}>
            <AnimoText variant="subheading">
              {isTagalog ? 'Piliin ang Paraan ng Pagbabayad' : 'Select Payment Method'}
            </AnimoText>
            <OptionCard
              label="GCash"
              description={isTagalog ? 'Bayad gamit ang GCash transfer' : 'Paid via GCash transfer'}
              selected={method === 'GCash'}
              onPress={() => setMethod('GCash')}>
              <IconTile icon={Smartphone} tone="success" size={40} />
            </OptionCard>
            <OptionCard
              label="Cash"
              description={isTagalog ? 'Bayad na cash sa oras ng pickup' : 'Paid in cash upon pickup'}
              selected={method === 'Cash'}
              onPress={() => setMethod('Cash')}>
              <IconTile icon={Banknote} tone="success" size={40} />
            </OptionCard>
          </View>

          {/* GCash Details Card (Reference No. & Receipt) */}
          {method === 'GCash' ? (
            <DepthCard depth="flat" radius="xl" style={styles.card}>
              <AnimoText variant="subheading">
                {isTagalog ? 'Impormasyon ng GCash Transfer' : 'GCash Transfer Details'}
              </AnimoText>

              <TextField
                label="GCash Reference Number"
                placeholder={isTagalog ? 'Hal. 1002938471829' : 'Ex. 1002938471829'}
                keyboardType="number-pad"
                maxLength={GCASH_REF_LENGTH}
                value={gcashReference}
                onChangeText={(text) => setGcashReference(text.replace(/[^0-9]/g, ''))}
                suffix={`${gcashReference.length}/${GCASH_REF_LENGTH}`}
                error={showGcashError ? GCASH_REF_FORMAT_MESSAGE : undefined}
                hint={
                  isTagalog
                    ? 'Ilagay ang reference number mula sa natanggap na resibo ng GCash.'
                    : 'Enter the reference number from the GCash transaction receipt.'
                }
              />

              <View style={styles.uploadSection}>
                <AnimoText variant="bodyStrong">
                  {isTagalog
                    ? 'Resibo ng GCash (Panatilihin bilang sanggunian — hindi ito ini-upload)'
                    : 'GCash Receipt (Kept locally for reference)'}
                </AnimoText>

                {receiptUri ? (
                  <View style={styles.receiptPreview}>
                    <Image source={{ uri: receiptUri }} style={styles.receiptImage} contentFit="cover" />
                    <View style={styles.receiptInfo}>
                      <View style={styles.receiptAttachedRow}>
                        <CheckCircle2 size={20} color={AnimoV2Colors.textBrand} strokeWidth={2.75} />
                        <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand}>
                          {isTagalog ? 'Naka-attach (lokal lang)' : 'Attached (local only)'}
                        </AnimoText>
                      </View>
                      <View style={styles.receiptActions}>
                        <ChunkyButton
                          size="sm"
                          flat
                          variant="secondary"
                          borderColor={AnimoV2Colors.actionPrimary}
                          label={isTagalog ? 'Palitan' : 'Change'}
                          onPress={() => setPhotoSheetVisible(true)}
                          style={styles.receiptBtn}
                        />
                        <ChunkyButton
                          size="sm"
                          flat
                          variant="secondary"
                          borderColor={AnimoV2Colors.dangerSolid}
                          textColor={AnimoV2Colors.dangerFg}
                          icon={Trash2}
                          label={isTagalog ? 'Alisin' : 'Remove'}
                          onPress={() => setReceiptUri(null)}
                          style={styles.receiptBtn}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isTagalog ? 'Mag-attach ng resibo' : 'Attach receipt'}
                    onPress={() => setPhotoSheetVisible(true)}
                    style={styles.uploadBox}>
                    <IconTile icon={Upload} tone="success" size={48} />
                    <AnimoText variant="bodyStrong" color={AnimoV2Colors.textBrand} style={styles.centerText}>
                      {isTagalog ? 'Pindutin para mag-attach ng resibo' : 'Tap to attach receipt'}
                    </AnimoText>
                    <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary} style={styles.centerText}>
                      {isTagalog ? 'Kunan ng litrato o pumili mula sa Gallery' : 'Take a photo or choose from Gallery'}
                    </AnimoText>
                  </Pressable>
                )}

                {uploadError ? (
                  <AnimoText variant="captionV2" color={AnimoV2Colors.dangerFg}>
                    {uploadError}
                  </AnimoText>
                ) : null}
              </View>
            </DepthCard>
          ) : null}

          <ProgressTracker
            title={isTagalog ? 'Progreso ng Transaksyon' : 'Transaction Progress'}
            steps={buildProgressSteps(outcome, 'buyer', language)}
          />

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
                : isTagalog
                  ? 'Magpatuloy sa Bayad'
                  : 'Confirm Payment'
            }
            icon={Check}
            onPress={handleContinue}
            disabled={!canContinue}
          />
          {policy.triggerLabel ? (
            <ChunkyButton
              label={policy.triggerLabel}
              variant="secondary"
              icon={X}
              textColor={AnimoV2Colors.dangerFg}
              borderColor={AnimoV2Colors.dangerSolid}
              onPress={() => setCancelling(true)}
            />
          ) : null}
        </StickyFooter>
      </KeyboardAvoidingView>

      <PhotoSourceSheet
        visible={photoSheetVisible}
        onPickCamera={() => handlePickSource('camera')}
        onPickGallery={() => handlePickSource('gallery')}
        onClose={() => setPhotoSheetVisible(false)}
      />

      <BuyerCancelDialog
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={handleConfirmCancel}
      />

      <BuyerFeedbackDialog
        visible={savedOffline}
        tone="info"
        title={isTagalog ? 'Na-save sa phone' : 'Saved on this phone'}
        message={
          isTagalog
            ? 'Walang signal kaya naka-save ang bayad sa phone. Itatala at ikukumpirma ito isang beses pagbalik ng signal.'
            : 'There is no signal, so the payment is saved on this phone. It is recorded and confirmed once when the signal returns.'
        }
        confirmLabel={isTagalog ? 'Sige' : 'OK'}
        onConfirm={() => {
          setSavedOffline(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />

      <BuyerFeedbackDialog
        visible={showCancelledSuccessModal}
        tone="danger"
        title={isTagalog ? 'Matagumpay na Nakansela' : 'Successfully Cancelled'}
        message={isTagalog ? 'Nakansela na ang transaksyong ito.' : 'This transaction has been cancelled.'}
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelledSuccessModal(false);
          router.replace('/(buyer)/transaksyon');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: AnimoV2Spacing.xl },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.md },
  section: { gap: AnimoV2Spacing.sm },
  uploadSection: { gap: AnimoV2Spacing.sm },
  uploadBox: {
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: AnimoV2Colors.actionPrimary,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    padding: AnimoV2Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoV2Spacing.sm,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    padding: AnimoV2Spacing.sm,
    gap: AnimoV2Spacing.md,
  },
  receiptImage: { width: 72, height: 72, borderRadius: AnimoV2Radius.sm, backgroundColor: AnimoV2Colors.borderDefault },
  receiptInfo: { flex: 1, minWidth: 0, gap: AnimoV2Spacing.sm },
  receiptAttachedRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.xs },
  receiptActions: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  receiptBtn: { flex: 1 },
});
