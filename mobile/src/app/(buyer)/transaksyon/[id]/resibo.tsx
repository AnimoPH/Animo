import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle2, Copy, Download, FileText } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  amountPaid,
  formatPeso,
  getPurchaseRequest,
  progressSteps,
} from '@/constants/marketplace';

/** Resibo — the receipt for a completed transaction. */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Resibo" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
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
                Nakumpleto ang buong bayad
              </AnimoText>
            </View>
          </View>
          <View style={styles.bannerMeta}>
            <StatusBadge label="Completed" tone="success" />
            <AnimoText variant="caption" color={AnimoColors.muted}>
              {request.payments[1]?.paidAt}
            </AnimoText>
          </View>
        </View>

        {/* Reference + listing details */}
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
            <Pressable hitSlop={8} style={styles.copyButton}>
              <Copy size={16} color={AnimoColors.blackSecondary} />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <DetailRow label="Listing" value={request.variety} />
          <DetailRow label="Magsasaka" value={request.farmer.name} />
          <DetailRow label="Lokasyon" value={request.farmer.addressDetail} />
          <DetailRow label="Dami" value={`${request.quantityKg} kg`} />
          <DetailRow label="Presyo bawat kilo" value={formatPeso(request.pricePerKg)} />
        </View>

        {/* Payment records */}
        <View style={styles.card}>
          {request.payments.map((payment) => (
            <View key={payment.reference} style={styles.paymentRow}>
              <View style={styles.flex}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  {payment.label}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {payment.paidAt} · GCash {payment.reference}
                </AnimoText>
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {formatPeso(payment.amount)}
              </AnimoText>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
              Kabuuang binayaran
            </AnimoText>
            <AnimoText variant="price" color={AnimoColors.green}>
              {formatPeso(amountPaid(request))}
            </AnimoText>
          </View>
        </View>

        <ProgressTracker steps={progressSteps(request)} />

        <NoticeBanner tone="success" icon={<FileText size={16} color={AnimoColors.green} />}>
          Nakaimbak ang resibong ito sa Transaksyon. Maaari mo itong i-download
          bilang PDF.
        </NoticeBanner>
      </ScrollView>

      <View style={styles.footerStack}>
        <AnimoButton label="I-download ang Resibo" />
        <AnimoButton
          label="Bumalik sa Palengke"
          variant="secondary"
          onPress={() => router.replace('/(buyer)/palengke')}
        />
      </View>
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
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
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
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: AnimoRadius.sm,
    backgroundColor: AnimoColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
});
