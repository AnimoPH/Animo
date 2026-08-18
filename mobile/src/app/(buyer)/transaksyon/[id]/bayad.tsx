import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Banknote, Check, CheckCircle2, Trash2, Upload, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { LabeledInput } from '@/components/animo/labeled-input';
import { ListingImage } from '@/components/animo/listing-image';
import { PhotoSourceSheet } from '@/components/animo/photo-source-sheet';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  cancelPolicy,
  formatPeso,
  getPurchaseRequest,
  requestTotal,
  type PaymentMethod,
  type ProgressStep,
} from '@/constants/marketplace';

/**
 * Paraan ng Pagbabayad — Screen 2 in the revised flow.
 *
 * Buyer enters the actual amount paid, selects GCash (with reference number & receipt upload)
 * or Cash, and proceeds to payment confirmation.
 */
export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);

  const agreedTotal = request ? requestTotal(request) : 8000;

  // Actual amount paid input (default agreed total)
  const [actualAmountText, setActualAmountText] = useState(String(agreedTotal));
  const [method, setMethod] = useState<PaymentMethod>('gcash');

  // GCash specific fields
  const [gcashReference, setGcashReference] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [uploadError, setUploadError] = useState<string | undefined>();

  const [cancelling, setCancelling] = useState(false);
  const [showCancelledSuccessModal, setShowCancelledSuccessModal] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Paraan ng Pagbabayad" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { farmer } = request;
  const policy = cancelPolicy(request);
  const actualAmountNum = parseFloat(actualAmountText.replace(/,/g, '')) || 0;

  const handlePickSource = async (source: 'camera' | 'gallery') => {
    setPhotoSheetVisible(false);
    setUploadError(undefined);

    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setUploadError('Kailangan ng pahintulot para mag-upload ng resibo.');
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.8,
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (result.canceled || !result.assets?.[0]) return;
    setReceiptUri(result.assets[0].uri);
  };

  const paymentSteps: ProgressStep[] = [
    {
      key: 'sent',
      label: 'Request naipadala',
      detail: request.sentAt,
      state: 'done',
    },
    {
      key: 'accepted',
      label: 'Tinanggap ng magsasaka',
      detail: request.acceptedAt ?? 'Okt 12, 09:00 AM',
      state: 'done',
    },
    {
      key: 'pickup',
      label: 'Pickup at inspeksyon',
      detail: 'Tapos · Okt 18, 09:20 AM',
      state: 'done',
    },
    {
      key: 'payment',
      label: 'Bayad sa magsasaka',
      detail: 'Isinasagawa ngayon',
      state: 'current',
    },
    {
      key: 'review',
      label: 'Review sa magsasaka',
      detail: 'Huling hakbang',
      state: 'upcoming',
    },
  ];

  const isGcashValid =
    method !== 'gcash' || (gcashReference.trim().length >= 6 && receiptUri !== null);

  const canContinue = actualAmountNum > 0 && isGcashValid;

  const handleContinue = () => {
    router.push({
      pathname: `/(buyer)/transaksyon/${request.id}/kumpirmasyon` as any,
      params: {
        method,
        actualAmount: actualAmountNum.toString(),
        gcashReference: method === 'gcash' ? gcashReference.trim() : undefined,
        receiptUri: method === 'gcash' && receiptUri ? receiptUri : undefined,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Paraan ng Pagbabayad" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Listing Product Card */}
          <View style={styles.card}>
            <View style={styles.productRow}>
              <ListingImage height={64} borderRadius={AnimoRadius.md} style={styles.thumb} />
              <View style={styles.productInfo}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  {request.variety}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {farmer.name} · {farmer.addressDetail}
                </AnimoText>
                <AnimoText variant="price" color={AnimoColors.green}>
                  {formatPeso(request.pricePerKg)} bawat kilo
                </AnimoText>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Dami
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {request.quantityKg} kg
              </AnimoText>
            </View>

            <View style={styles.rowBetween}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Kabuuang halaga
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {formatPeso(agreedTotal)}
              </AnimoText>
            </View>
          </View>

          {/* Buod ng Bayad + Actual Amount Input */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Buod ng Bayad
            </AnimoText>

            <View style={styles.rowBetween}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Dami
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {request.quantityKg} kg
              </AnimoText>
            </View>

            <View style={styles.rowBetween}>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                Presyo bawat kilo
              </AnimoText>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {formatPeso(request.pricePerKg)}
              </AnimoText>
            </View>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.rowLabel}>
                Kabuuang babayaran (Sistema)
              </AnimoText>
              <AnimoText variant="price" color={AnimoColors.black} style={styles.rowValue}>
                {formatPeso(agreedTotal)}
              </AnimoText>
            </View>

            <View style={styles.inputSection}>
              <LabeledInput
                label="Halagang Aktwal na Binayaran (₱)"
                keyboardType="numeric"
                value={actualAmountText}
                onChangeText={(t) => setActualAmountText(t.replace(/[^0-9.]/g, ''))}
                prefixText="₱"
                hint={
                  actualAmountNum !== agreedTotal
                    ? actualAmountNum > agreedTotal
                      ? `Mas mataas ng ${formatPeso(actualAmountNum - agreedTotal)} kaysa sa presyo ng sistema.`
                      : `Mas mababa ng ${formatPeso(agreedTotal - actualAmountNum)} kaysa sa presyo ng sistema.`
                    : 'Tugma sa napagkasunduang presyo ng sistema.'
                }
                hintTone={actualAmountNum !== agreedTotal ? 'warning' : 'muted'}
              />
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Piliin ang Paraan ng Pagbabayad
            </AnimoText>

            {/* GCash Option */}
            <Pressable
              style={[
                styles.methodCard,
                method === 'gcash' && styles.methodCardActive,
              ]}
              onPress={() => setMethod('gcash')}>
              <View style={styles.methodLeft}>
                <View style={styles.gcashLogo}>
                  <AnimoText variant="tag" color={AnimoColors.white}>
                    GCash
                  </AnimoText>
                </View>
                <View style={styles.methodTexts}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    GCash
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Bayad gamit ang GCash transfer
                  </AnimoText>
                </View>
              </View>

              <View
                style={[
                  styles.radio,
                  method === 'gcash' && styles.radioActive,
                ]}>
                {method === 'gcash' && <View style={styles.radioCore} />}
              </View>
            </Pressable>

            {/* Cash Option */}
            <Pressable
              style={[
                styles.methodCard,
                method === 'cash' && styles.methodCardActive,
              ]}
              onPress={() => setMethod('cash')}>
              <View style={styles.methodLeft}>
                <View style={styles.cashLogo}>
                  <Banknote size={18} color={AnimoColors.green} />
                </View>
                <View style={styles.methodTexts}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Cash
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Bayad na cash sa oras ng pickup
                  </AnimoText>
                </View>
              </View>

              <View
                style={[
                  styles.radio,
                  method === 'cash' && styles.radioActive,
                ]}>
                {method === 'cash' && <View style={styles.radioCore} />}
              </View>
            </Pressable>
          </View>

          {/* GCash Details Card (Reference No. & Receipt Upload) */}
          {method === 'gcash' ? (
            <View style={styles.card}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Impormasyon ng GCash Transfer
              </AnimoText>

              {/* Reference Number Input */}
              <LabeledInput
                label="GCash Reference Number"
                placeholder="Hal. 1002 9384 7182 9"
                keyboardType="numeric"
                value={gcashReference}
                onChangeText={setGcashReference}
                hint="Ilagay ang reference number mula sa natanggap na resibo ng GCash."
              />

              {/* Receipt Upload Box */}
              <View style={styles.uploadSection}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                  Resibo ng GCash (Screenshot / Litrato)
                </AnimoText>

                {receiptUri ? (
                  <View style={styles.receiptPreviewCard}>
                    <Image source={{ uri: receiptUri }} style={styles.receiptImage} contentFit="cover" />
                    <View style={styles.receiptInfo}>
                      <View style={styles.receiptAttachedRow}>
                        <CheckCircle2 size={16} color={AnimoColors.accentPrimary} />
                        <AnimoText variant="bodyEmphasis" color={AnimoColors.accentPrimary}>
                          Naka-attach ang resibo
                        </AnimoText>
                      </View>
                      <View style={styles.receiptActions}>
                        <Pressable
                          onPress={() => setPhotoSheetVisible(true)}
                          style={styles.changeReceiptBtn}>
                          <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                            Palitan
                          </AnimoText>
                        </Pressable>
                        <Pressable
                          onPress={() => setReceiptUri(null)}
                          style={styles.removeReceiptBtn}>
                          <Trash2 size={14} color={AnimoColors.danger} />
                          <AnimoText variant="caption" color={AnimoColors.danger}>
                            Alisin
                          </AnimoText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPhotoSheetVisible(true)}
                    style={styles.uploadBox}>
                    <View style={styles.uploadIconCircle}>
                      <Upload size={22} color={AnimoColors.accentPrimary} />
                    </View>
                    <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                      Pindutin para mag-upload ng resibo
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
                      Kunan ng litrato o pumili mula sa Gallery
                    </AnimoText>
                  </Pressable>
                )}

                {uploadError ? (
                  <AnimoText variant="caption" color={AnimoColors.danger}>
                    {uploadError}
                  </AnimoText>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* 5-Step Progress Tracker with Payment as Current Step */}
          <ProgressTracker steps={paymentSteps} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerStack}>
          <AnimoButton
            label="Magpatuloy sa Bayad"
            icon={Check}
            onPress={handleContinue}
            disabled={!canContinue}
          />
          {/* Red Cancel Button */}
          <AnimoButton
            label="Kanselahin ang Transaksyon"
            variant="dangerOutline"
            icon={X}
            onPress={() => setCancelling(true)}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Photo Picker Bottom Sheet */}
      <PhotoSourceSheet
        visible={photoSheetVisible}
        onPickCamera={() => handlePickSource('camera')}
        onPickGallery={() => handlePickSource('gallery')}
        onClose={() => setPhotoSheetVisible(false)}
      />

      {/* Confirmation Modal before cancellation */}
      <CancelRequestModal
        visible={cancelling}
        title={policy.title}
        body={policy.body}
        consequences={policy.consequences}
        confirmLabel={policy.confirmLabel}
        onDismiss={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          setShowCancelledSuccessModal(true);
        }}
      />

      {/* Successfully Cancelled Notification Modal */}
      <FeedbackModal
        visible={showCancelledSuccessModal}
        tone="danger"
        title="Matagumpay na Nakansela"
        message="Nakansela na ang transaksyong ito. Muling nakalista ang palay para sa ibang mamimili."
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelledSuccessModal(false);
          router.replace('/(buyer)/transaksyon/pr-cancelled');
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
    paddingHorizontal: AnimoSpacing.xl,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  thumb: {
    width: 64,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
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
  inputSection: {
    marginTop: AnimoSpacing.xs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
  },
  methodCardActive: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.greenTint,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    flex: 1,
  },
  gcashLogo: {
    backgroundColor: '#0B76D1',
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashLogo: {
    backgroundColor: AnimoColors.greenTint,
    borderRadius: AnimoRadius.sm,
    padding: 6,
    borderWidth: 1,
    borderColor: AnimoColors.green,
  },
  methodTexts: {
    flex: 1,
    gap: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AnimoColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoColors.white,
  },
  radioActive: {
    borderColor: AnimoColors.green,
  },
  radioCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.green,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
  uploadSection: {
    gap: AnimoSpacing.xs,
    marginTop: AnimoSpacing.xs,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: AnimoColors.accentPrimary,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surfaceSecondary,
    padding: AnimoSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.xs,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  receiptPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surfaceSecondary,
    padding: AnimoSpacing.sm,
    gap: AnimoSpacing.md,
  },
  receiptImage: {
    width: 60,
    height: 60,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.surfaceTertiary,
  },
  receiptInfo: {
    flex: 1,
    gap: 4,
  },
  receiptAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  changeReceiptBtn: {
    paddingVertical: 2,
  },
  removeReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
});
