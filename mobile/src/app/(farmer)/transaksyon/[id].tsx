import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, ChevronRight, FileText, Phone, Star, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { BackHeader } from '@/components/animo/back-header';
import { CancelRequestModal } from '@/components/animo/cancel-request-modal';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoLayout, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  farmerListingLine,
  farmerProgressSteps,
  farmerStageBadge,
  formatPeso,
  getFarmerTransaction,
  paymentMethodLabel,
  updateFarmerTransactionStage,
  type FarmerTransaction,
  type FarmerTransactionStage,
} from '@/constants/marketplace';

type ConfirmKind = 'accept' | 'payment' | 'pickup' | 'rating' | 'receipt' | null;
type CancelKind = 'decline' | 'cancel' | null;

/**
 * Single farmer transaction detail. Footer and contact visibility follow
 * the current stage — no pickup / bayad / resibo chain.
 */
export default function FarmerTransactionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [transaction, setTransaction] = useState<FarmerTransaction | undefined>(
    () => getFarmerTransaction(id),
  );
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [cancelKind, setCancelKind] = useState<CancelKind>(null);

  const bump = (stage: FarmerTransactionStage) => {
    if (!id) return;
    const updated = updateFarmerTransactionStage(id, stage);
    if (updated) setTransaction(updated);
  };

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <BackHeader title="Detalye ng Transaksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            Hindi mahanap ang transaksyon.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const showContact =
    transaction.stage !== 'pending' &&
    transaction.stage !== 'cancelled' &&
    transaction.stage !== 'failed';
  const steps = farmerProgressSteps(transaction);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <BackHeader title="Detalye ng Transaksyon" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SummaryCard transaction={transaction} />

        {showContact ? <ContactCard phone={transaction.buyer.phone} /> : null}

        {transaction.stage === 'completed' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(farmer)/resibo' as Href)}
            style={({ pressed }) => [styles.receiptRow, pressed && styles.pressed]}>
            <View style={styles.receiptIcon}>
              <FileText size={20} color={AnimoColors.green} />
            </View>
            <View style={styles.flex}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                Digital na Resibo
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                {transaction.reference}
              </AnimoText>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        ) : null}

        <ProgressTracker title="Takbo ng transaksyon" steps={steps} />
      </ScrollView>

      <View style={styles.footer}>
        <FooterActions
          stage={transaction.stage}
          onAccept={() => {
            bump('awaiting_payment');
            setConfirm('accept');
          }}
          onDecline={() => setCancelKind('decline')}
          onConfirmPayment={() => {
            bump('awaiting_pickup');
            setConfirm('payment');
          }}
          onCancel={() => setCancelKind('cancel')}
          onConfirmPickup={() => {
            bump('completed');
            setConfirm('pickup');
          }}
          onRate={() => setConfirm('rating')}
          onBackToMarket={() => router.push('/(farmer)/(tabs)/palengke' as Href)}
        />
      </View>

      <CancelRequestModal
        visible={cancelKind !== null}
        title={
          cancelKind === 'decline'
            ? 'Tanggihan ang kahilingan?'
            : 'Kanselahin ang transaksyon?'
        }
        body={
          cancelKind === 'decline'
            ? 'Hindi pa nagsisimula ang transaksyon. Walang bayad na kailangang isauli.'
            : 'Hindi pa nakumpirma ang bayad. Hindi itutuloy ang pickup.'
        }
        consequences={
          cancelKind === 'decline'
            ? [
                'Aabisuhan ang mamimili sa iyong sagot.',
                'Maaaring magpadala muli ng kahilingan ang mamimili.',
              ]
            : [
                'Aabisuhan ang mamimili sa pagkansela.',
                'Hindi itutuloy ang pagkuha ng palay.',
              ]
        }
        confirmLabel={cancelKind === 'decline' ? 'Tanggihan' : 'Kanselahin'}
        onDismiss={() => setCancelKind(null)}
        onConfirm={() => {
          bump('cancelled');
          setCancelKind(null);
          router.back();
        }}
      />

      <FeedbackModal
        visible={confirm !== null}
        tone={confirm === 'receipt' ? 'info' : 'success'}
        title={confirmTitle(confirm)}
        message={confirmMessage(transaction, confirm)}
        confirmLabel="Sige"
        onConfirm={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

function SummaryCard({ transaction }: { transaction: FarmerTransaction }) {
  const badge = farmerStageBadge(transaction.stage);

  return (
    <View style={styles.summary}>
      {/* Top row */}
      <View style={styles.summaryTop}>
        <View style={styles.flex}>
          {/* Buyer name */}
          <AnimoText variant="h3" color={AnimoColors.white}>
            {transaction.buyer.name}
          </AnimoText>
          {/* Palay details */}
          <AnimoText variant="body" color={AnimoColors.white}>
            {farmerListingLine(transaction)}
          </AnimoText>
        </View>
        {/* Status badge */}
        <StatusBadge label={badge.label} tone={badge.tone} />
      </View>

      {/* Divider */}
      <View style={styles.summaryDivider} />

      <View style={styles.summaryBottom}>
        {/* Payment method */}
        <View style={styles.payChipOnGreen}>
          <AnimoText variant="caption" color={AnimoColors.green} style={{ fontFamily: 'PlusJakartaSans_700Bold'}}>
            {paymentMethodLabel(transaction.paymentMethod)}
          </AnimoText>
        </View>
        {/* Total */}
        <AnimoText variant="price" color={AnimoColors.mildLight}>
          {formatPeso(transaction.total)}
        </AnimoText>
      </View>
    </View>
  );
}

function ContactCard({ phone }: { phone: string }) {
  return (
    <View style={styles.contactCard}>
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
        Numero ng Mamimili
      </AnimoText>
      <View style={styles.phoneRow}>
        <Phone size={18} color={AnimoColors.textAccentPrimary} />
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textAccentPrimary}>
          {phone}
        </AnimoText>
      </View>
      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
        Mag-usap kayo sa numero para sa oras at lugar ng pickup.
      </AnimoText>
    </View>
  );
}

function FooterActions({
  stage,
  onAccept,
  onDecline,
  onConfirmPayment,
  onCancel,
  onConfirmPickup,
  onRate,
  onBackToMarket,
}: {
  stage: FarmerTransactionStage;
  onAccept: () => void;
  onDecline: () => void;
  onConfirmPayment: () => void;
  onCancel: () => void;
  onConfirmPickup: () => void;
  onRate: () => void;
  onBackToMarket: () => void;
}) {
  if (stage === 'pending') {
    return (
      <>
        <AnimoButton label="Accept" icon={Check} onPress={onAccept} />
        <AnimoButton
          label="Cancel"
          variant="neutralOutline"
          icon={X}
          onPress={onDecline}
        />
      </>
    );
  }

  if (stage === 'accepted' || stage === 'awaiting_payment') {
    return (
      <>
        <AnimoButton
          label="Natanggap ko na ang bayad"
          icon={Check}
          onPress={onConfirmPayment}
        />
        <AnimoButton
          label="Kanselahin"
          variant="neutralOutline"
          icon={X}
          onPress={onCancel}
        />
      </>
    );
  }

  if (stage === 'awaiting_pickup') {
    return (
      <AnimoButton
        label="Nakuha na ang palay"
        icon={Check}
        onPress={onConfirmPickup}
      />
    );
  }

  if (stage === 'completed') {
    return (
      <>
        <AnimoButton
          label="Magbigay ng rating"
          variant="secondary"
          icon={Star}
          onPress={onRate}
        />
        <AnimoButton label="Bumalik sa palengke" onPress={onBackToMarket} />
      </>
    );
  }

  return <AnimoButton label="Bumalik" variant="secondary" onPress={() => router.back()} />;
}

function confirmTitle(kind: ConfirmKind): string {
  switch (kind) {
    case 'accept':
      return 'Tinanggap ang kahilingan';
    case 'payment':
      return 'Nakumpirma ang bayad';
    case 'pickup':
      return 'Nakuha na ang palay';
    case 'rating':
      return 'Salamat sa iyong rating';
    case 'receipt':
      return 'Digital na resibo';
    default:
      return '';
  }
}

function confirmMessage(tx: FarmerTransaction, kind: ConfirmKind): string {
  switch (kind) {
    case 'accept':
      return 'Makikita na ang numero ng mamimili. Kumpirmahin ang bayad kapag natanggap mo na ito.';
    case 'payment':
      return 'Hintayin ang mamimili para kunin ang palay, tapos kumpirmahin kapag nakuha na.';
    case 'pickup':
      return 'Tapos na ang transaksyon. Maaari mo nang tingnan ang resibo at magbigay ng rating.';
    case 'rating':
      return 'Naitala ang iyong rating para sa mamimili.';
    case 'receipt':
      return `Naka-save ang resibo ${tx.reference} sa Transaksyon.`;
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  scroll: {
    paddingHorizontal: AnimoLayout.screenGutter,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoLayout.sectionGap,
  },
  missing: {
    paddingHorizontal: AnimoLayout.screenGutter,
    paddingTop: AnimoSpacing.xl,
  },
  summary: {
    backgroundColor: AnimoColors.green,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.sm,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: AnimoColors.white,
    opacity: 0.35,
  },
  summaryBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payChipOnGreen: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.pill,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.xs,
  },
  contactCard: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
  },
  receiptIcon: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
  footer: {
    paddingHorizontal: AnimoLayout.screenGutter,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.appBackground,
  },
});
