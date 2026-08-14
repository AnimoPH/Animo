import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, Copy, FileText } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
 * Displays official transaction receipt details, timeline, and link to review farmer.
 */
export default function ReceiptScreen() {
  const {
    id,
    method: queryMethod,
    amount: queryAmount,
    reason: queryReason,
  } = useLocalSearchParams<{
    id: string;
    method?: string;
    amount?: string;
    reason?: string;
  }>();

  const request = getPurchaseRequest(id);
  const [copied, setCopied] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

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

  const handleCopyId = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                ? 'GCash · GC-8846702'
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
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
              Kabuuang binayaran
            </AnimoText>
            <AnimoText variant="price" color={AnimoColors.green}>
              {formatPeso(totalPaid)}
            </AnimoText>
          </View>
        </View>

        {/* Timeline */}
        <ProgressTracker steps={receiptTimeline} />

        {/* Info Banner */}
        <NoticeBanner tone="info" icon={<FileText size={16} color="#2563A8" />}>
          Nakaimbak ang resibong ito sa Transaksyon. Maaari mo itong i-download bilang PDF.
        </NoticeBanner>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footerStack}>
        <AnimoButton
          label="Suriin ang Magsasaka"
          onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/review`)}
        />
        <AnimoButton
          label="I-download ang PDF"
          variant="secondary"
          onPress={() => setShowDownloadModal(true)}
        />
      </View>

      {/* Download PDF Modal */}
      <FeedbackModal
        visible={showDownloadModal}
        tone="success"
        title="Na-download ang Resibo!"
        message={`Matagumpay na nai-download ang PDF copy ng resibo (${request.reference}) sa iyong device.`}
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
});
