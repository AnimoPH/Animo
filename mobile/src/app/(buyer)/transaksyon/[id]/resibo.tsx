import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CheckCircle,
  Copy,
  Download,
  Star,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { BackHeader } from '@/components/animo/back-header';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from '@/constants/animo';
import {
  formatPeso,
  getPurchaseRequest,
  requestTotal,
  type PaymentMethod,
} from '@/constants/marketplace';

const SCREEN_PADDING = AnimoSpacing.lg;

/**
 * Buyer Receipt Screen (Digital na Resibo).
 *
 * Copies the identical layout and aesthetic from the Farmer Receipt screen:
 * - Green celebration hero with verified checkmark
 * - Overlapping detailed receipt card with large price & dashed divider
 * - Polygon blockchain record verification card
 * - Action buttons to review the farmer and download the receipt
 */
export default function BuyerReceiptScreen() {
  const {
    id,
    method: queryMethod,
    amount: queryAmount,
    gcashReference,
  } = useLocalSearchParams<{
    id: string;
    method?: string;
    amount?: string;
    gcashReference?: string;
  }>();

  const request = getPurchaseRequest(id);

  const [copied, setCopied] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <BackHeader title="Digital na Resibo" />
        <View style={styles.missing}>
          <Text style={styles.missingText}>Hindi nahanap ang transaksyon na ito.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { farmer } = request;
  const agreedTotal = requestTotal(request);
  const paymentMode: 'GCash' | 'Cash' = queryMethod === 'cash' ? 'Cash' : 'GCash';
  const totalPaid = queryAmount ? parseFloat(queryAmount) : agreedTotal;
  const gcashRef = gcashReference || '901234567890';
  const txHash = '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b';
  const polygonExplorerUrl = `https://amoy.polygonscan.com/tx/${txHash}`;
  const moisture: 'Tuyo' | 'Basa' = request.variety.toLowerCase().includes('basa') ? 'Basa' : 'Tuyo';

  const detailRows: { label: string; kind: 'text' | 'moisture' | 'payment'; value?: string }[] = [
    { label: 'Uri ng Palay', kind: 'text', value: request.variety },
    { label: 'Moisture', kind: 'moisture' },
    { label: 'Dami', kind: 'text', value: `${request.quantityKg} kg` },
    { label: 'Presyo bawat kilo', kind: 'text', value: `${formatPeso(request.pricePerKg)}/kg` },
    { label: 'Paraan ng Bayad', kind: 'payment' },
    ...(paymentMode === 'GCash'
      ? [{ label: 'Reference No.', kind: 'text' as const, value: gcashRef }]
      : []),
    { label: 'Magsasaka', kind: 'text', value: farmer.name },
    { label: 'Lokasyon', kind: 'text', value: farmer.addressDetail.split('·')[0].trim() },
    { label: 'Mamimili', kind: 'text', value: request.buyerName || 'Maria Santos' },
    { label: 'Petsa', kind: 'text', value: request.sentAt.split('·')[0].trim() },
  ];

  const handleCopyHash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenExplorer = () => {
    Linking.openURL(polygonExplorerUrl).catch(() => {});
  };

  const handleDownload = () => {
    setShowDownloadModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <BackHeader title="Digital na Resibo" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* SECTION 1 — Hero */}
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <CheckCircle size={40} color={AnimoColors.white} />
          </View>
          <Text style={styles.heroTitle}>Kumpleto ang Transaksyon!</Text>
          <Text style={styles.heroSubtitle}>Nakumpirma ang buong bayad.</Text>
          <Text style={styles.heroDate}>{request.sentAt}</Text>
        </View>

        {/* SECTION 2 — Main Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.txnIdRow}>
            <Text style={styles.txnId}>
              Transaction ID: {request.reference}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Kumpleto</Text>
            </View>
          </View>

          <Text style={styles.totalAmount}>{formatPeso(totalPaid)}</Text>

          <View style={styles.dashedDivider} />

          {detailRows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                {row.kind === 'moisture' ? (
                  <View
                    style={
                      moisture === 'Basa'
                        ? styles.basaBadge
                        : styles.tuyoBadge
                    }>
                    <Text
                      style={
                        moisture === 'Basa'
                          ? styles.basaBadgeText
                          : styles.tuyoBadgeText
                      }>
                      {moisture}
                    </Text>
                  </View>
                ) : row.kind === 'payment' ? (
                  <View
                    style={
                      paymentMode === 'Cash'
                        ? styles.cashBadge
                        : styles.gcashBadge
                    }>
                    <Text
                      style={
                        paymentMode === 'Cash'
                          ? styles.cashBadgeText
                          : styles.gcashBadgeText
                      }>
                      {paymentMode}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.detailValue}>{row.value}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* SECTION 3 — Blockchain Record Card */}
        <View style={styles.chainCard}>
          <View style={styles.chainHeader}>
            <View style={styles.polygonMark}>
              <Text style={styles.polygonMarkText}>P</Text>
            </View>
            <Text style={styles.chainTitle}>Na-record sa Polygon Blockchain</Text>
          </View>
          <Text style={styles.chainInfo}>
            Ito ay patunay na ang transaksyong ito ay permanente at hindi na
            mababago.
          </Text>
          <View style={styles.hashRow}>
            <Text style={styles.hashText} numberOfLines={1} ellipsizeMode="middle">
              {txHash}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kopyahin ang hash"
              hitSlop={8}
              onPress={handleCopyHash}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Copy size={18} color={copied ? AnimoColors.accentPrimary : AnimoColors.objectLowEmphasis} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={handleOpenExplorer}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <Text style={styles.explorerLink}>Tingnan sa Polygon Explorer →</Text>
          </Pressable>
        </View>

        {/* SECTION 4 — Action Buttons */}
        <View style={styles.actions}>
          <AnimoButton
            label="Suriin ang Magsasaka"
            icon={Star}
            onPress={() => router.push(`/(buyer)/transaksyon/${request.id}/review`)}
          />
          <AnimoButton
            label="I-download ang Resibo"
            variant="secondary"
            icon={Download}
            onPress={handleDownload}
          />
          <AnimoButton
            label="Bumalik sa Transaksyon"
            variant="neutralOutline"
            onPress={() => router.replace('/(buyer)/transaksyon')}
          />
        </View>
      </ScrollView>

      {/* Download / Export Modal */}
      <FeedbackModal
        visible={showDownloadModal}
        tone="success"
        title="Na-download ang Resibo!"
        message={`Matagumpay na nai-save ang digital na resibo para sa ${request.reference}.`}
        confirmLabel="OK"
        onConfirm={() => setShowDownloadModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  missingText: {
    ...AnimoType.body,
    color: AnimoColors.textMediumEmphasis,
  },
  scroll: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xxl,
  },
  hero: {
    backgroundColor: AnimoColors.accentPrimary,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: AnimoSpacing.xxl,
    paddingBottom: 56,
    alignItems: 'center',
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: AnimoRadius.pill,
    borderWidth: 2.5,
    borderColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AnimoSpacing.lg,
  },
  heroTitle: {
    ...AnimoType.h1,
    color: AnimoColors.white,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  heroSubtitle: {
    ...AnimoType.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: AnimoSpacing.xs,
  },
  heroDate: {
    ...AnimoType.caption,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    marginTop: AnimoSpacing.xs,
  },
  receiptCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: -32,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    elevation: 3,
  },
  txnIdRow: {
    alignItems: 'center',
    marginBottom: AnimoSpacing.sm,
  },
  txnId: {
    ...AnimoType.caption,
    color: AnimoColors.textLowEmphasis,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    marginBottom: AnimoSpacing.md,
  },
  statusBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.xs,
  },
  statusBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.accentPrimary,
  },
  totalAmount: {
    fontSize: 36,
    lineHeight: 44,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: AnimoColors.accentPrimary,
    textAlign: 'center',
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: AnimoColors.borderLowEmphasis,
    marginVertical: AnimoSpacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AnimoSpacing.sm,
  },
  detailLabel: {
    ...AnimoType.body,
    color: AnimoColors.textLowEmphasis,
  },
  detailValue: {
    ...AnimoType.bodyEmphasis,
    color: AnimoColors.textHighEmphasis,
  },
  rowDivider: {
    height: 1,
    backgroundColor: AnimoColors.surfaceTertiary,
  },
  tuyoBadge: {
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F9A825',
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  tuyoBadgeText: {
    ...AnimoType.tag,
    color: '#F9A825',
  },
  basaBadge: {
    backgroundColor: AnimoColors.focusRingLight,
    borderWidth: 1,
    borderColor: AnimoColors.focusRing,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  basaBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.focusRing,
  },
  gcashBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  gcashBadgeText: {
    ...AnimoType.tag,
    color: '#1565C0',
  },
  cashBadge: {
    backgroundColor: AnimoColors.surfaceTertiary,
    borderRadius: AnimoRadius.sm,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
  },
  cashBadgeText: {
    ...AnimoType.tag,
    color: AnimoColors.textMediumEmphasis,
  },
  chainCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.md,
    padding: AnimoSpacing.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
  },
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.sm,
  },
  polygonMark: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#7B3FE4',
    borderRadius: 6,
    transform: [{ rotate: '30deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  polygonMarkText: {
    fontSize: 10,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#7B3FE4',
    transform: [{ rotate: '-30deg' }],
  },
  chainTitle: {
    ...AnimoType.h3,
    color: AnimoColors.textHighEmphasis,
    flex: 1,
  },
  chainInfo: {
    ...AnimoType.body,
    color: AnimoColors.textMediumEmphasis,
    marginBottom: AnimoSpacing.md,
  },
  hashRow: {
    backgroundColor: AnimoColors.surfaceTertiary,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.sm,
  },
  hashText: {
    ...AnimoType.caption,
    color: AnimoColors.textMediumEmphasis,
    fontFamily: 'monospace',
    flex: 1,
  },
  explorerLink: {
    ...AnimoType.caption,
    color: AnimoColors.accentPrimary,
    textDecorationLine: 'underline',
    marginTop: AnimoSpacing.sm,
    textAlign: 'left',
  },
  actions: {
    marginHorizontal: SCREEN_PADDING,
    marginTop: AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
