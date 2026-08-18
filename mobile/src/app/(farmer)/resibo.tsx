import { router, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CheckCircle, Copy, Download } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { ScreenHeader } from '@/components/animo/screen-header';
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from '@/constants/animo';

const SCREEN_PADDING = AnimoSpacing.lg;

const RECEIPT = {
  transactionId: 'TXN-A1B2C3D4',
  txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
  status: 'Kumpleto',
  totalAmount: '₱3,000.00',
  variety: 'Inbred (RC218)',
  moisture: 'Tuyo' as 'Tuyo' | 'Basa',
  quantity: '300 kg',
  pricePerKg: '₱10.00/kg',
  paymentMode: 'GCash' as 'GCash' | 'Cash',
  gcashReference: '901234567890',
  farmer: 'Juan Dela Cruz',
  buyer: 'Bulacan Rice Traders',
  date: 'Agosto 17, 2026',
  datetime: 'Agosto 17, 2026 · 10:45 AM',
};

const POLYGON_EXPLORER_URL = `https://amoy.polygonscan.com/tx/${RECEIPT.txHash}`;

const DETAIL_ROWS: { label: string; kind: 'text' | 'moisture' | 'payment'; value?: string }[] = [
  { label: 'Uri ng Palay', kind: 'text', value: RECEIPT.variety },
  { label: 'Moisture', kind: 'moisture' },
  { label: 'Dami', kind: 'text', value: RECEIPT.quantity },
  { label: 'Presyo', kind: 'text', value: RECEIPT.pricePerKg },
  { label: 'Paraan ng Bayad', kind: 'payment' },
  ...(RECEIPT.paymentMode === 'GCash'
    ? [{ label: 'Reference No.', kind: 'text' as const, value: RECEIPT.gcashReference }]
    : []),
  { label: 'Magsasaka', kind: 'text', value: RECEIPT.farmer },
  { label: 'Mamimili', kind: 'text', value: RECEIPT.buyer },
  { label: 'Petsa', kind: 'text', value: RECEIPT.date },
];

/**
 * Digital na Resibo — shown after a farmer transaction is completed.
 */
export default function FarmerReceiptScreen() {
  const handleCopyHash = () => {
    console.log('Copy tx hash — wire clipboard here', RECEIPT.txHash);
  };

  const handleOpenExplorer = () => {
    console.log('Open Polygon explorer', POLYGON_EXPLORER_URL);
  };

  const handleDownload = () => {
    console.log('Download PDF receipt — to be wired later');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Digital na Resibo" />
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
          <Text style={styles.heroDate}>{RECEIPT.datetime}</Text>
        </View>

        {/* SECTION 2 — Main Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.txnIdRow}>
            <Text style={styles.txnId}>
              Transaction ID: {RECEIPT.transactionId}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{RECEIPT.status}</Text>
            </View>
          </View>
          <Text style={styles.totalAmount}>{RECEIPT.totalAmount}</Text>

          <View style={styles.dashedDivider} />

          {DETAIL_ROWS.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <View style={styles.rowDivider} /> : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{row.label}</Text>
                {row.kind === 'moisture' ? (
                  <View
                    style={
                      RECEIPT.moisture === 'Basa'
                        ? styles.basaBadge
                        : styles.tuyoBadge
                    }>
                    <Text
                      style={
                        RECEIPT.moisture === 'Basa'
                          ? styles.basaBadgeText
                          : styles.tuyoBadgeText
                      }>
                      {RECEIPT.moisture}
                    </Text>
                  </View>
                ) : row.kind === 'payment' ? (
                  <View
                    style={
                      RECEIPT.paymentMode === 'Cash'
                        ? styles.cashBadge
                        : styles.gcashBadge
                    }>
                    <Text
                      style={
                        RECEIPT.paymentMode === 'Cash'
                          ? styles.cashBadgeText
                          : styles.gcashBadgeText
                      }>
                      {RECEIPT.paymentMode}
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
              {RECEIPT.txHash}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kopyahin ang hash"
              hitSlop={8}
              onPress={handleCopyHash}
              style={({ pressed }) => [pressed && styles.pressed]}>
              <Copy size={18} color={AnimoColors.accentPrimary} />
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
            label="Download"
            icon={Download}
            onPress={handleDownload}
          />
          <AnimoButton
            label="Bumalik sa Palengke"
            variant="neutralOutline"
            onPress={() => router.replace('/(farmer)/(tabs)/palengke' as Href)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scroll: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scrollContent: {
    paddingBottom: AnimoSpacing.xl,
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
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
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
    shadowColor: AnimoColors.darkBackground,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    marginTop: AnimoSpacing.xxl,
    gap: AnimoSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
