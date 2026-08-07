import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
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
import { SelectField } from '@/components/animo/select-field';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { DELIVERY_LOCATIONS, formatPeso, getListing } from '@/constants/marketplace';

const DELIVERY_OPTIONS = DELIVERY_LOCATIONS.map((m) => ({ value: m, label: m }));

/** Mag-bid — place a bid on a listing (quantity + delivery), then confirm. */
export default function BidScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListing(id);

  const [quantity, setQuantity] = useState('200');
  const [delivery, setDelivery] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  if (!listing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Mag-bid" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.blackSecondary}>
            Hindi nahanap ang listing na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const qtyNum = parseInt(quantity || '0', 10) || 0;
  const overAvailable = qtyNum > listing.availableKg;
  const total = qtyNum * listing.pricePerKg;
  const canConfirm = qtyNum > 0 && !overAvailable && delivery !== null;

  const summary = `${listing.variety} · ${qtyNum} kg · ${delivery ?? listing.municipality}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Mag-bid" />

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
                {listing.variety}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.blackSecondary}>
                {formatPeso(listing.pricePerKg)} bawat kilo · {listing.municipality},{' '}
                {listing.province}
              </AnimoText>
              {listing.estimated && (
                <View style={styles.badgeWrap}>
                  <StatusBadge label="Tinantyang Presyo" tone="warning" />
                </View>
              )}
            </View>
          </View>

          {/* Bid details */}
          <View style={styles.card}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalye ng Bid
            </AnimoText>
            <LabeledInput
              label="Dami na gusto"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={(t) => setQuantity(t.replace(/\D/g, ''))}
              suffixText="kilo/kg"
              error={overAvailable}
              hint={`Hindi maaaring lumampas sa ${listing.availableKg} kg na available.`}
              hintTone={overAvailable ? 'danger' : 'muted'}
            />
            <SelectField
              label="Lokasyon ng paghahatid"
              placeholder="Pumili ng lokasyon"
              options={DELIVERY_OPTIONS}
              value={delivery}
              onChange={setDelivery}
            />
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Baliwag, Plaridel, o Pulilan lamang.
            </AnimoText>
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
                {formatPeso(listing.pricePerKg)}
              </AnimoText>
            </View>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Kinomputa ng ANIMO para sa patas na presyo — hindi ito mababago ng mamimili.
            </AnimoText>

            <View style={styles.divider} />

            <View style={styles.rowBetween}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                Kabuuang halaga
              </AnimoText>
              <AnimoText variant="price" color={AnimoColors.green}>
                {formatPeso(total)}
              </AnimoText>
            </View>
            <AnimoText variant="caption" color={AnimoColors.muted}>
              Awtomatikong kinakalkula: {formatPeso(listing.pricePerKg)} × {qtyNum} kg
            </AnimoText>
          </View>

          {/* Escrow note */}
          <View style={styles.escrowNote}>
            <ShieldCheck size={18} color={AnimoColors.green} />
            <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.flex}>
              Kapag kinumpirma, ilalagay ang bayad sa escrow smart contract sa Polygon PoS. May 30
              segundo kang makakansela bago ito ma-lock.
            </AnimoText>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AnimoButton
            label="Kumpirmahin ang Bid"
            onPress={() => setConfirming(true)}
            disabled={!canConfirm}
          />
        </View>
      </KeyboardAvoidingView>

      <BidConfirmationModal
        visible={confirming}
        summary={summary}
        total={total}
        onCancel={() => setConfirming(false)}
        onComplete={() => {
          setConfirming(false);
          // Bid committed — show it in the transaction history.
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.border,
    marginVertical: AnimoSpacing.xs,
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
  },
});
