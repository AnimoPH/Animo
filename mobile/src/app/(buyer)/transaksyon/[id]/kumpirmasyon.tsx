import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Banknote,
  Check,
  CheckCircle2,
  Lock,
  TriangleAlert,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  formatPeso,
  getPurchaseRequest,
  requestTotal,
  type DiscrepancyReason,
  type PaymentMethod,
} from '@/constants/marketplace';

const REASON_OPTIONS: DiscrepancyReason[] = [
  'Mas mababa/mataas ang timbang',
  'Magkaiba ang grade',
  'Iba ang variant',
  'Iba pa',
];

/**
 * Kumpirmasyon ng Bayad — Screens 3 & 4 in the revised flow.
 *
 * Checks if the actual amount matches the agreed price.
 * If match: Shows success confirmation (Tugma) and "Kumpirmahin ang Bayad" button.
 * If mismatch: Shows warning and feedback form (Ipaliwanag ang Pagkakaiba).
 */
export default function PaymentConfirmationScreen() {
  const {
    id,
    method: queryMethod,
    actualAmount: queryAmount,
    gcashReference,
    receiptUri,
  } = useLocalSearchParams<{
    id: string;
    method?: string;
    actualAmount?: string;
    gcashReference?: string;
    receiptUri?: string;
  }>();

  const request = getPurchaseRequest(id);
  const agreedTotal = request ? requestTotal(request) : 8000;

  const actualAmount = queryAmount ? parseFloat(queryAmount) : agreedTotal;
  const paymentMethod: PaymentMethod = queryMethod === 'cash' ? 'cash' : 'gcash';

  const difference = actualAmount - agreedTotal;
  const isMatch = Math.abs(difference) < 0.01;

  // Discrepancy state
  const [selectedReason, setSelectedReason] = useState<DiscrepancyReason | null>(
    difference !== 0 ? 'Mas mababa/mataas ang timbang' : null
  );
  const [explanation, setExplanation] = useState('');

  // Feedback modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExplanationSubmittedModal, setShowExplanationSubmittedModal] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Kumpirmasyon ng Bayad" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const navigateToReceipt = () => {
    router.push({
      pathname: `/(buyer)/transaksyon/${request.id}/resibo` as any,
      params: {
        method: paymentMethod,
        amount: actualAmount.toString(),
        reason: selectedReason ?? undefined,
        explanation: explanation || undefined,
        gcashReference: gcashReference || undefined,
        receiptUri: receiptUri || undefined,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Kumpirmasyon ng Bayad" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {isMatch ? (
            /* ================= EXACT MATCH (SCREEN 3) ================= */
            <>
              {/* Status Card */}
              <View style={styles.card}>
                <View style={styles.bannerRow}>
                  <View style={[styles.bannerIcon, styles.bannerIconSuccess]}>
                    <CheckCircle2 size={22} color={AnimoColors.green} />
                  </View>
                  <View style={styles.bannerText}>
                    <AnimoText variant="h3" color={AnimoColors.black}>
                      Matagumpay ang Bayad
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.muted}>
                      Tugma ang halagang binayaran
                    </AnimoText>
                  </View>
                </View>
                <View style={styles.bannerMeta}>
                  <StatusBadge label="Tinanggap" tone="success" />
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Okt 18, 2025 · 11:42 AM
                  </AnimoText>
                </View>
              </View>

              {/* Halagang Binayaran Card */}
              <View style={styles.card}>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Halagang Binayaran
                </AnimoText>
                <AnimoText variant="h1" color={AnimoColors.black}>
                  {formatPeso(actualAmount)}
                </AnimoText>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Napagkasunduang presyo
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(agreedTotal)}
                  </AnimoText>
                </View>

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Halagang binayaran
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(actualAmount)}
                  </AnimoText>
                </View>

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Pagkakaiba
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    ₱0.00 · Tugma
                  </AnimoText>
                </View>
              </View>

              {/* Paraan ng Bayad Card */}
              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Paraan ng Bayad
                </AnimoText>

                <View style={styles.methodInfoBox}>
                  {paymentMethod === 'gcash' ? (
                    <>
                      <View style={styles.methodRow}>
                        <View style={styles.gcashLogo}>
                          <AnimoText variant="tag" color={AnimoColors.white}>
                            GCash
                          </AnimoText>
                        </View>
                        <View style={styles.methodTexts}>
                          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                            GCash Transfer
                          </AnimoText>
                          <AnimoText variant="caption" color={AnimoColors.muted}>
                            Ref: {gcashReference || '1002 9384 7182 9'}
                          </AnimoText>
                        </View>
                        <Check size={18} color={AnimoColors.green} strokeWidth={3} />
                      </View>

                      {receiptUri ? (
                        <View style={styles.receiptAttachedBox}>
                          <Image
                            source={{ uri: receiptUri }}
                            style={styles.receiptThumb}
                            contentFit="cover"
                          />
                          <View style={styles.receiptAttachedText}>
                            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                              Resibo ng GCash
                            </AnimoText>
                            <AnimoText variant="caption" color={AnimoColors.muted}>
                              Naka-attach ang patunay ng bayad
                            </AnimoText>
                          </View>
                        </View>
                      ) : null}

                      <AnimoText variant="caption" color={AnimoColors.muted}>
                        Ligtas na bayad sa pamamagitan ng GCash.
                      </AnimoText>
                    </>
                  ) : (
                    <>
                      <View style={styles.methodRow}>
                        <View style={styles.cashLogo}>
                          <Banknote size={18} color={AnimoColors.green} />
                        </View>
                        <View style={styles.methodTexts}>
                          <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                            Cash
                          </AnimoText>
                          <AnimoText variant="caption" color={AnimoColors.muted}>
                            Bayad sa oras ng pickup
                          </AnimoText>
                        </View>
                        <Check size={18} color={AnimoColors.green} strokeWidth={3} />
                      </View>
                      <AnimoText variant="caption" color={AnimoColors.muted}>
                        Naibigay na cash sa magsasaka sa oras ng pickup.
                      </AnimoText>
                    </>
                  )}
                </View>
              </View>

              {/* Info Banner */}
              <NoticeBanner tone="info" icon={<Lock size={16} color="#2563A8" />}>
                Tugma ang halaga kaya hindi na kailangan ng paliwanag.
                Awtomatikong nakumpleto ang talaan ng bayad.
              </NoticeBanner>
            </>
          ) : (
            /* ================= MISMATCH / DISCREPANCY (SCREEN 4) ================= */
            <>
              {/* Warning Header Card */}
              <View style={[styles.card, styles.warningCard]}>
                <View style={styles.bannerRow}>
                  <View style={[styles.bannerIcon, styles.bannerIconWarning]}>
                    <TriangleAlert size={22} color="#B4791A" />
                  </View>
                  <View style={styles.bannerText}>
                    <AnimoText variant="h3" color={AnimoColors.black}>
                      Hindi Tugma ang Halaga
                    </AnimoText>
                    <AnimoText variant="caption" color={AnimoColors.blackSecondary}>
                      {difference > 0
                        ? 'Mas mataas ang binayaran kaysa napagkasunduang presyo'
                        : 'Mas mababa ang binayaran kaysa napagkasunduang presyo'}
                    </AnimoText>
                  </View>
                </View>
              </View>

              {/* Halagang Binayaran Card */}
              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Halagang Binayaran
                </AnimoText>

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Napagkasunduang presyo
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(agreedTotal)}
                  </AnimoText>
                </View>

                <View style={styles.rowBetween}>
                  <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                    Halagang binayaran
                  </AnimoText>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    {formatPeso(actualAmount)}
                  </AnimoText>
                </View>

                <View style={styles.divider} />

                <View style={styles.rowBetween}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                    Pagkakaiba
                  </AnimoText>
                  <AnimoText
                    variant="price"
                    color={difference > 0 ? '#B4791A' : AnimoColors.danger}>
                    {difference > 0 ? `+${formatPeso(difference)}` : `-${formatPeso(Math.abs(difference))}`}
                  </AnimoText>
                </View>
              </View>

              {/* Feedback Form Card (Ipaliwanag ang Pagkakaiba) */}
              <View style={styles.card}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Ipaliwanag ang Pagkakaiba
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Kailangan ito bago magpatuloy. Piliin ang dahilan at magdagdag ng detalye.
                </AnimoText>

                {/* Reason Chips */}
                <View style={styles.chipGroup}>
                  {REASON_OPTIONS.map((reason) => (
                    <Pressable
                      key={reason}
                      style={[
                        styles.chip,
                        selectedReason === reason && styles.chipActive,
                      ]}
                      onPress={() => setSelectedReason(reason)}>
                      <AnimoText
                        variant="caption"
                        color={
                          selectedReason === reason
                            ? AnimoColors.green
                            : AnimoColors.black
                        }>
                        {reason}
                      </AnimoText>
                    </Pressable>
                  ))}
                </View>

                {/* Textarea */}
                <View style={styles.textareaContainer}>
                  <TextInput
                    style={styles.textarea}
                    placeholder="Isulat ang paliwanag dito..."
                    placeholderTextColor={AnimoColors.muted}
                    multiline
                    numberOfLines={4}
                    maxLength={300}
                    value={explanation}
                    onChangeText={setExplanation}
                    textAlignVertical="top"
                  />
                  <AnimoText variant="tag" color={AnimoColors.muted} style={styles.counter}>
                    {explanation.length}/300
                  </AnimoText>
                </View>
              </View>

              {/* LGU Notice Banner */}
              <NoticeBanner tone="warning" icon={<TriangleAlert size={16} color="#B4791A" />}>
                Ipapadala ang paliwanag na ito sa magsasaka at sa LGU para sa talaan
                ng transaksyon.
              </NoticeBanner>
            </>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footerStack}>
          {isMatch ? (
            <AnimoButton
              label="Kumpirmahin ang Bayad"
              onPress={() => setShowConfirmModal(true)}
            />
          ) : (
            <>
              <AnimoButton
                label="Isumite ang Paliwanag"
                onPress={() => setShowExplanationSubmittedModal(true)}
                disabled={!selectedReason}
              />
              <AnimoButton
                label="Baguhin ang Halaga"
                variant="secondary"
                onPress={() => router.back()}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Success Modal */}
      <FeedbackModal
        visible={showConfirmModal}
        tone="success"
        title="Matagumpay ang Bayad!"
        message={`Nakumpirma ang buong bayad na ${formatPeso(actualAmount)} gamit ang ${paymentMethod === 'cash' ? 'Cash' : 'GCash'}.`}
        confirmLabel="Tingnan ang Resibo"
        onConfirm={() => {
          setShowConfirmModal(false);
          navigateToReceipt();
        }}
      />

      {/* Discrepancy Submitted Modal */}
      <FeedbackModal
        visible={showExplanationSubmittedModal}
        tone="success"
        title="Naisumite ang Paliwanag!"
        message={`Naitala ang dahilan (${selectedReason}) at nakumpirma ang bayad na ${formatPeso(actualAmount)}.`}
        confirmLabel="Tingnan ang Resibo"
        onConfirm={() => {
          setShowExplanationSubmittedModal(false);
          navigateToReceipt();
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
  warningCard: {
    borderColor: '#F0D79A',
    backgroundColor: '#FDF6E4',
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
    alignItems: 'center',
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconSuccess: {
    backgroundColor: AnimoColors.greenTint,
  },
  bannerIconWarning: {
    backgroundColor: '#FBF0D9',
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
  bannerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
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
  methodInfoBox: {
    borderWidth: 1,
    borderColor: AnimoColors.green,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.greenTint,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  gcashLogo: {
    backgroundColor: '#0B76D1',
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cashLogo: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.sm,
    padding: 6,
  },
  methodTexts: {
    flex: 1,
    gap: 1,
  },
  receiptAttachedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.sm,
    padding: AnimoSpacing.sm,
    gap: AnimoSpacing.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    marginTop: AnimoSpacing.xs,
  },
  receiptThumb: {
    width: 48,
    height: 48,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.surface,
  },
  receiptAttachedText: {
    flex: 1,
    gap: 2,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
  },
  chip: {
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    backgroundColor: AnimoColors.surface,
  },
  chipActive: {
    borderColor: AnimoColors.green,
    backgroundColor: AnimoColors.greenTint,
  },
  textareaContainer: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    marginTop: AnimoSpacing.xs,
    gap: AnimoSpacing.xs,
  },
  textarea: {
    fontSize: 14,
    color: AnimoColors.black,
    minHeight: 80,
  },
  counter: {
    alignSelf: 'flex-end',
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
});
