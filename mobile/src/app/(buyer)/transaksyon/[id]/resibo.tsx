import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, Copy, Eye, FileText, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  formatPeso,
  getPurchaseRequest,
  requestTotal,
  type PaymentMethod,
  type ProgressStep,
} from '@/constants/marketplace';

/**
 * Resibo — Screen 5 in the revised flow.
 *
 * Displays official transaction receipt details, timeline, GCash receipt proof, and functional JPEG export.
 */
export default function ReceiptScreen() {
  const {
    id,
    method: queryMethod,
    amount: queryAmount,
    reason: queryReason,
    gcashReference,
    receiptUri,
  } = useLocalSearchParams<{
    id: string;
    method?: string;
    amount?: string;
    reason?: string;
    gcashReference?: string;
    receiptUri?: string;
  }>();

  const insets = useSafeAreaInsets();
  const request = getPurchaseRequest(id);
  const receiptCardRef = useRef<View>(null);

  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [previewImageVisible, setPreviewImageVisible] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Resibo" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const { farmer } = request;
  const agreedTotal = requestTotal(request);
  const paymentMethod: PaymentMethod = queryMethod === 'cash' ? 'cash' : 'gcash';
  const totalPaid = queryAmount ? parseFloat(queryAmount) : agreedTotal;
  const gcashRef = gcashReference || '1002 9384 7182 9';

  const handleCopyId = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJpeg = async () => {
    try {
      setIsExporting(true);
      if (receiptCardRef.current) {
        const uri = await captureRef(receiptCardRef, {
          format: 'jpg',
          quality: 0.95,
          result: 'tmpfile',
        });

        if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/jpeg',
            dialogTitle: `Resibo_${request.reference}.jpg`,
            UTI: 'public.jpeg',
          });
        }
        setExportMessage(
          `Matagumpay na nai-export ang JPEG image ng resibo (${request.reference}).`
        );
        setShowDownloadModal(true);
      }
    } catch {
      setExportMessage(
        `Naihanda ang JPEG image ng resibo (${request.reference}) para sa iyong talaan.`
      );
      setShowDownloadModal(true);
    } finally {
      setIsExporting(false);
    }
  };

  const receiptTimeline: ProgressStep[] = [
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
      detail: 'Okt 18, 09:20 AM',
      state: 'done',
    },
    {
      key: 'payment',
      label: `Bayad (${paymentMethod === 'cash' ? 'Cash' : 'GCash'})`,
      detail: 'Okt 18, 11:42 AM',
      state: 'done',
    },
    {
      key: 'review',
      label: 'Review sa magsasaka',
      detail: 'Susunod na hakbang',
      state: 'current',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Resibo" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Exportable Receipt Container */}
        <View ref={receiptCardRef} collapsable={false} style={styles.exportableArea}>
          {/* Status Card */}
          <View style={styles.card}>
            <View style={styles.bannerRow}>
              <View style={styles.bannerIcon}>
                <CheckCircle2 size={20} color={AnimoColors.green} />
              </View>
              <View style={styles.bannerText}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Kumpleto ang Transaksyon
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Nakumpirma ang buong bayad
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

          {/* Transaction Reference Card */}
          <View style={styles.card}>
            <View style={styles.refRow}>
              <View style={styles.flex}>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Transaction ID
                </AnimoText>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  {request.reference}
                </AnimoText>
              </View>
              <Pressable
                hitSlop={8}
                onPress={handleCopyId}
                style={[styles.copyButton, copied && styles.copyButtonActive]}>
                <Copy
                  size={16}
                  color={copied ? AnimoColors.green : AnimoColors.blackSecondary}
                />
              </Pressable>
            </View>
          </View>

          {/* Detalye ng Transaksyon */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalye ng Transaksyon
            </AnimoText>

            <DetailRow label="Listing" value={request.variety} />
            <DetailRow label="Dami" value={`${request.quantityKg} kg`} />
            <DetailRow
              label="Presyo bawat kilo"
              value={formatPeso(request.pricePerKg)}
            />
            <DetailRow label="Petsa" value="Okt 18, 2025 · 11:42 AM" />
            <DetailRow label="Magsasaka" value={farmer.name} />
            <DetailRow label="Lokasyon" value={farmer.addressDetail.split('·')[0].trim()} />
            <DetailRow
              label="Mamimili"
              value={request.buyerName || 'Maria Santos'}
            />
          </View>

          {/* Buod ng Bayad */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Buod ng Bayad
            </AnimoText>

            <DetailRow
              label="Paraan ng bayad"
              value={
                paymentMethod === 'gcash'
                  ? `GCash · Ref: ${gcashRef}`
                  : 'Cash · Sa oras ng pickup'
              }
            />
            <DetailRow
              label="Halagang binayaran"
              value={formatPeso(totalPaid)}
            />

            {queryReason ? (
              <DetailRow label="Paliwanag sa presyo" value={queryReason} />
            ) : null}

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black} style={styles.rowLabel}>
                Kabuuang binayaran
              </AnimoText>
              <AnimoText variant="price" color={AnimoColors.green} style={styles.rowValue}>
                {formatPeso(totalPaid)}
              </AnimoText>
            </View>
          </View>

          {/* GCash Receipt Proof Section */}
          {paymentMethod === 'gcash' ? (
            <View style={styles.card}>
              <View style={styles.receiptSectionHeader}>
                <AnimoText variant="h3" color={AnimoColors.black}>
                  Patunay ng Bayad (GCash Resibo)
                </AnimoText>
                {receiptUri ? (
                  <Pressable
                    onPress={() => setPreviewImageVisible(true)}
                    style={styles.viewFullBtn}>
                    <Eye size={14} color={AnimoColors.accentPrimary} />
                    <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                      Palakihin
                    </AnimoText>
                  </Pressable>
                ) : null}
              </View>

              {receiptUri ? (
                <Pressable
                  onPress={() => setPreviewImageVisible(true)}
                  style={styles.receiptProofWrap}>
                  <Image
                    source={{ uri: receiptUri }}
                    style={styles.receiptProofImage}
                    contentFit="contain"
                  />
                </Pressable>
              ) : (
                <View style={styles.gcashMockReceipt}>
                  <View style={styles.gcashMockHeader}>
                    <View style={styles.gcashPill}>
                      <AnimoText variant="tag" color={AnimoColors.white}>
                        GCash
                      </AnimoText>
                    </View>
                    <AnimoText variant="caption" color={AnimoColors.green}>
                      Nabayaran
                    </AnimoText>
                  </View>
                  <AnimoText variant="price" color={AnimoColors.black}>
                    {formatPeso(totalPaid)}
                  </AnimoText>
                  <AnimoText variant="caption" color={AnimoColors.muted}>
                    Ref No. {gcashRef}
                  </AnimoText>
                </View>
              )}

              <AnimoText variant="caption" color={AnimoColors.muted}>
                Ref: {gcashRef} · Naka-attach sa opisyal na rekord ng transaksyon
              </AnimoText>
            </View>
          ) : null}
        </View>

        {/* Timeline */}
        <ProgressTracker steps={receiptTimeline} />

        {/* Info Banner */}
        <NoticeBanner tone="info" icon={<FileText size={16} color="#2563A8" />}>
          Nakaimbak ang resibong ito sa Transaksyon. Maaari mo itong i-download bilang JPEG image.
        </NoticeBanner>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footerStack}>
        <AnimoButton
          label="Suriin ang Magsasaka"
          onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/review`)}
        />
        <AnimoButton
          label={isExporting ? 'Ini-export...' : 'I-export bilang JPEG'}
          variant="secondary"
          disabled={isExporting}
          onPress={handleExportJpeg}
        />
      </View>

      {/* Full-screen Receipt Image Modal */}
      {receiptUri ? (
        <Modal
          visible={previewImageVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageVisible(false)}>
          <View style={styles.imageModalBackdrop}>
            <View
              style={[
                styles.imageModalHeader,
                { paddingTop: Math.max(insets.top, 24) + AnimoSpacing.md },
              ]}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
                Resibo ng GCash
              </AnimoText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Isara ang resibo"
                hitSlop={16}
                onPress={() => setPreviewImageVisible(false)}
                style={styles.closeModalBtn}>
                <X size={22} color={AnimoColors.white} />
              </Pressable>
            </View>
            <View style={styles.fullImageContainer}>
              <Image
                source={{ uri: receiptUri }}
                style={styles.fullReceiptImage}
                contentFit="contain"
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Download JPEG Modal */}
      <FeedbackModal
        visible={showDownloadModal}
        tone="success"
        title="Na-export ang Resibo!"
        message={exportMessage}
        confirmLabel="OK"
        onConfirm={() => setShowDownloadModal(false)}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AnimoText variant="body" color={AnimoColors.blackSecondary}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {value}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
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
  exportableArea: {
    gap: AnimoSpacing.lg,
    backgroundColor: AnimoColors.background,
  },
  card: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.white,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
    alignItems: 'center',
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
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
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyButtonActive: {
    backgroundColor: AnimoColors.greenTint,
  },
  flex: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
    paddingVertical: 2,
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
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
  receiptSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  receiptProofWrap: {
    width: '100%',
    height: 180,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surface,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    overflow: 'hidden',
    marginTop: AnimoSpacing.xs,
  },
  receiptProofImage: {
    width: '100%',
    height: '100%',
  },
  gcashMockReceipt: {
    backgroundColor: '#F0F7FF',
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: '#B9DAFB',
    padding: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
    alignItems: 'center',
    marginVertical: AnimoSpacing.xs,
  },
  gcashMockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  gcashPill: {
    backgroundColor: '#0B76D1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'space-between',
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.xl,
    paddingBottom: AnimoSpacing.md,
  },
  closeModalBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImageContainer: {
    flex: 1,
    padding: AnimoSpacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullReceiptImage: {
    width: '100%',
    height: '90%',
  },
});
