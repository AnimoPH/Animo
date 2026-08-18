import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplets,
  FileText,
  HelpCircle,
  MapPin,
  Package,
  Phone,
  Scale,
  ShieldCheck,
  Star,
  TriangleAlert,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Modal,
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
import { PaymentSummary } from '@/components/animo/payment-summary';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
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

type ConfirmKind = 'accept' | 'schedule_accept' | 'inspection_pass' | 'payment' | 'rating' | null;

const REJECTION_REASONS = [
  'Kulang ang natitirang stock o naubos na',
  'Hindi tugma ang iskedyul ng pickup',
  'Masyadong mababa ang itinakdang dami',
  'Iba pang dahilan',
];

/**
 * Farmer Transaction Detail Screen.
 *
 * Flow aligned with Buyer module:
 * 1. Request Stage (Pending) -> Farmer accepts request with confirmation modal.
 * 2. Schedule & Inspection Stage -> Farmer accepts proposed schedule -> Confirms inspection passed.
 * 3. Payment Stage -> "Paraan ng Pagbabayad" becomes visible -> Farmer confirms payment received.
 * 4. Completed Stage -> Digital receipt & Review sa Mamimili at Progreso ng Transaksyon.
 */
export default function FarmerTransactionDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [transaction, setTransaction] = useState<FarmerTransaction | undefined>(
    () => getFarmerTransaction(id),
  );
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  // Inspection & schedule confirmation state (accepted if already paying or completed!)
  const initialScheduleAccepted =
    transaction?.stage === 'completed' ||
    transaction?.stage === 'awaiting_payment' ||
    transaction?.stage === 'awaiting_pickup';
  const [scheduleAccepted, setScheduleAccepted] = useState(initialScheduleAccepted);

  // Action Confirmation Prompt Modals
  const [actionConfirmType, setActionConfirmType] = useState<
    'accept_request' | 'accept_schedule' | 'confirm_inspection' | 'confirm_payment' | null
  >(null);

  // Reject / Cancel Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReasonNote, setCustomReasonNote] = useState('');
  const [showCancelSuccessModal, setShowCancelSuccessModal] = useState(false);

  const bump = (stage: FarmerTransactionStage) => {
    if (!id) return;
    const updated = updateFarmerTransactionStage(id, stage);
    if (updated) setTransaction(updated);
  };

  const handleCallBuyer = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {});
  };

  const handleExecuteAction = () => {
    const type = actionConfirmType;
    setActionConfirmType(null);

    if (type === 'accept_request') {
      bump('accepted');
      setConfirm('accept');
    } else if (type === 'accept_schedule') {
      setScheduleAccepted(true);
      setConfirm('schedule_accept');
    } else if (type === 'confirm_inspection') {
      bump('awaiting_payment');
      setConfirm('inspection_pass');
    } else if (type === 'confirm_payment') {
      bump('completed');
      setConfirm('payment');
    }
  };

  const handleConfirmReject = () => {
    bump('cancelled');
    setShowRejectModal(false);
    setShowCancelSuccessModal(true);
  };

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <ScreenHeader title="Detalye ng Transaksyon" />
        <View style={styles.missing}>
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            Hindi nahanap ang transaksyon na ito.
          </AnimoText>
        </View>
      </SafeAreaView>
    );
  }

  const steps = farmerProgressSteps(transaction);
  const pricePerKg = transaction.quantityKg > 0 ? transaction.total / transaction.quantityKg : 0;
  const isPending = transaction.stage === 'pending';
  const isPaymentStage = transaction.stage === 'awaiting_payment';
  const isCompleted = transaction.stage === 'completed';
  const isCancelled = transaction.stage === 'cancelled' || transaction.stage === 'failed';

  // Only show payment method if in payment stage or completed
  const showPaymentMethod = isPaymentStage || isCompleted;

  // Build payment breakdown rows conditionally
  const paymentRows = [
    { label: 'Dami ng Palay', amount: `${transaction.quantityKg} kg` },
    { label: 'Presyo bawat kilo', amount: formatPeso(pricePerKg) },
    ...(showPaymentMethod
      ? [{ label: 'Paraan ng Pagbabayad', amount: paymentMethodLabel(transaction.paymentMethod) }]
      : []),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Detalye ng Transaksyon" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* 1. Stage Banner Card */}
        <StageBanner
          transaction={transaction}
          showPaymentMethod={showPaymentMethod}
        />

        {/* 2. Crop Listing Summary Card */}
        <ListingCard
          transaction={transaction}
          pricePerKg={pricePerKg}
          isCancelled={isCancelled}
        />

        {/* 3. Progress Tracker (5 Steps: Kahilingan -> Tinanggap -> Iskedyul at Inspeksyon -> Bayad -> Review) */}
        <ProgressTracker title="Progreso ng Transaksyon" steps={steps} />

        {/* 4. Payment Breakdown (Payment method only visible when at payment stage) */}
        <PaymentSummary
          rows={paymentRows}
          total={{ label: 'Kabuuang Halaga ng Transaksyon', amount: transaction.total }}
        />

        {/* 5. Buyer Contact & Party Card */}
        {!isPending && !isCancelled ? (
          <BuyerPartyCard
            buyer={transaction.buyer}
            onCall={() => handleCallBuyer(transaction.buyer.phone)}
          />
        ) : null}

        {/* 6. Pickup & Inspection Details Card */}
        {!isPending && !isCancelled ? (
          <PickupInspectionCard
            isCompleted={isCompleted}
            quantityKg={transaction.quantityKg}
            scheduleAccepted={scheduleAccepted || isCompleted || isPaymentStage}
            onAcceptSchedule={() => setActionConfirmType('accept_schedule')}
          />
        ) : null}

        {/* 7. Digital Receipt Card (When Completed) */}
        {isCompleted ? (
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
                {transaction.reference} · Naka-save sa iyong talaan
              </AnimoText>
            </View>
            <ChevronRight size={18} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Bottom Footer Actions */}
      <View style={styles.footer}>
        <FooterActions
          stage={transaction.stage}
          scheduleAccepted={scheduleAccepted || isCompleted || isPaymentStage}
          onAcceptRequest={() => setActionConfirmType('accept_request')}
          onDecline={() => setShowRejectModal(true)}
          onConfirmSchedule={() => setActionConfirmType('accept_schedule')}
          onConfirmInspectionPass={() => setActionConfirmType('confirm_inspection')}
          onConfirmPayment={() => setActionConfirmType('confirm_payment')}
          onCancel={() => setShowRejectModal(true)}
          onRate={() => router.push({ pathname: '/(farmer)/review', params: { id: transaction.id } })}
          onBackToMarket={() => router.push('/(farmer)/(tabs)/palengke' as Href)}
        />
      </View>

      {/* ACTION CONFIRMATION MODAL */}
      <Modal
        visible={actionConfirmType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActionConfirmType(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setActionConfirmType(null)}>
          <Pressable style={styles.confirmModalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmModalIconCircle}>
              <HelpCircle size={28} color={AnimoColors.accentPrimary} />
            </View>

            <View style={styles.confirmModalHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                {actionConfirmType === 'accept_request'
                  ? 'Tanggapin ang Order?'
                  : actionConfirmType === 'accept_schedule'
                    ? 'Tanggapin ang Iskedyul?'
                    : actionConfirmType === 'confirm_inspection'
                      ? 'Pumasa sa Inspeksyon?'
                      : 'Kumpirmahin ang Bayad?'}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                {actionConfirmType === 'accept_request'
                  ? `Sigurado ka bang nais mong tanggapin ang purchase request mula kay ${transaction.buyer.name}?`
                  : actionConfirmType === 'accept_schedule'
                    ? 'Sigurado ka bang ayos sa iyo ang itinakdang oras at petsa ng pickup ng palay?'
                    : actionConfirmType === 'confirm_inspection'
                      ? 'Sigurado ka bang na-inspeksyon at pumasa ang kalidad at timbang ng palay?'
                      : 'Sigurado ka bang natanggap mo na ang buong bayad sa GCash o Cash?'}
              </AnimoText>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleExecuteAction}
                style={({ pressed }) => [styles.confirmActionBtn, pressed && styles.pressed]}>
                <Check size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  {actionConfirmType === 'accept_request'
                    ? 'Oo, Tanggapin ang Order'
                    : actionConfirmType === 'accept_schedule'
                      ? 'Oo, Tanggapin ang Iskedyul'
                      : actionConfirmType === 'confirm_inspection'
                        ? 'Oo, Kumpirmahin (Pumasa)'
                        : 'Oo, Nakumpirma ang Bayad'}
                </AnimoText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setActionConfirmType(null)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Huwag Muna
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* REJECT / CANCEL REASON PROMPT MODAL */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowRejectModal(false)}>
          <Pressable style={styles.rejectCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.rejectIconCircle}>
              <TriangleAlert size={28} color={AnimoColors.danger} />
            </View>

            <View style={styles.rejectHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                {isPending ? 'Tanggihan ang Kahilingan?' : 'Kanselahin ang Transaksyon?'}
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                Sigurado ka bang nais mong kanselahin? Pumili o maglagay ng dahilan para kay {transaction.buyer.name}:
              </AnimoText>
            </View>

            {/* Preset Options */}
            <View style={styles.reasonsList}>
              {REJECTION_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    accessibilityRole="radio"
                    onPress={() => setSelectedReason(reason)}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected ? <View style={styles.radioInnerDot} /> : null}
                    </View>
                    <AnimoText
                      variant={isSelected ? 'bodyEmphasis' : 'body'}
                      color={isSelected ? AnimoColors.accentPrimary : AnimoColors.textHighEmphasis}
                      style={styles.flex}>
                      {reason}
                    </AnimoText>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Notes */}
            {selectedReason === 'Iba pang dahilan' ? (
              <View style={styles.customInputWrap}>
                <TextInput
                  style={styles.customInput}
                  placeholder="Isulat ang partikular na dahilan..."
                  placeholderTextColor={AnimoColors.textLowEmphasis}
                  value={customReasonNote}
                  onChangeText={setCustomReasonNote}
                  multiline
                  numberOfLines={3}
                />
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={handleConfirmReject}
                style={({ pressed }) => [styles.confirmRejectBtn, pressed && styles.pressed]}>
                <X size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  {isPending ? 'Tanggihan ang Order' : 'Kanselahin ang Transaksyon'}
                </AnimoText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowRejectModal(false)}
                style={({ pressed }) => [styles.cancelDismissBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Bumalik
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* CANCEL SUCCESS MODAL */}
      <FeedbackModal
        visible={showCancelSuccessModal}
        tone="danger"
        title="Matagumpay na Nakansela"
        message="Nakansela na ang transaksyong ito at naipabatid na sa mamimili ang iyong dahilan."
        confirmLabel="OK"
        onConfirm={() => {
          setShowCancelSuccessModal(false);
          router.replace('/(farmer)/(tabs)/transaksyon');
        }}
      />

      {/* CONFIRMATION / SUCCESS MODAL */}
      <FeedbackModal
        visible={confirm !== null}
        tone="success"
        title={confirmTitle(confirm)}
        message={confirmMessage(transaction, confirm)}
        confirmLabel="Sige"
        onConfirm={() => setConfirm(null)}
      />
    </SafeAreaView>
  );
}

/** Stage banner matching the Buyer UI stage card style */
function StageBanner({
  transaction,
  showPaymentMethod,
}: {
  transaction: FarmerTransaction;
  showPaymentMethod: boolean;
}) {
  const badge = farmerStageBadge(transaction.stage);
  const { stage } = transaction;

  const getStageHeader = () => {
    switch (stage) {
      case 'pending':
        return {
          icon: <Clock size={20} color="#B4791A" />,
          iconBg: '#FBF0D9',
          title: 'Bagong Purchase Request',
          caption: 'Naghihintay ng iyong pagtanggap upang simulan ang transaksyon.',
        };
      case 'accepted':
      case 'awaiting_pickup':
        return {
          icon: <CalendarDays size={20} color={AnimoColors.accentPrimary} />,
          iconBg: AnimoColors.accentPrimaryLight,
          title: 'Iskedyul at Inspeksyon sa Bukid',
          caption: 'Ihanda ang palay para sa inspeksyon sa itinakdang oras ng pickup.',
        };
      case 'awaiting_payment':
        return {
          icon: <Package size={20} color="#D97706" />,
          iconBg: '#FEF3C7',
          title: 'Pumasa sa Inspeksyon — Naghihintay ng Bayad',
          caption: 'Kumpirmahin kapag naipadala na ng mamimili ang buong bayad.',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 size={20} color={AnimoColors.accentPrimary} />,
          iconBg: AnimoColors.accentPrimaryLight,
          title: 'Kumpleto na ang Transaksyon',
          caption: 'Nakuha na ang palay at naisara na ang transaksyon.',
        };
      case 'cancelled':
      case 'failed':
        return {
          icon: <XCircle size={20} color={AnimoColors.danger} />,
          iconBg: AnimoColors.dangerTint,
          title: 'Nakansela ang Transaksyon',
          caption: 'Hindi na itutuloy ang transaksyong ito.',
        };
    }
  };

  const header = getStageHeader();

  return (
    <View style={styles.bannerCard}>
      <View style={styles.bannerRow}>
        <View style={[styles.bannerIcon, { backgroundColor: header.iconBg }]}>
          {header.icon}
        </View>
        <View style={styles.bannerText}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {header.title}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {header.caption}
          </AnimoText>
        </View>
      </View>

      <View style={styles.bannerMeta}>
        <StatusBadge label={badge.label} tone={badge.tone} />
        <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
          {transaction.sentAt}
        </AnimoText>
      </View>

      <View style={styles.divider} />

      <MetaRow label="Transaction ID" value={transaction.reference} />
      <MetaRow label="Mamimili" value={transaction.buyer.name} />
      {showPaymentMethod ? (
        <MetaRow label="Paraan ng Bayad" value={paymentMethodLabel(transaction.paymentMethod)} />
      ) : null}
    </View>
  );
}

/** Crop listing summary card with robust layout against price overlap */
function ListingCard({
  transaction,
  pricePerKg,
  isCancelled,
}: {
  transaction: FarmerTransaction;
  pricePerKg: number;
  isCancelled: boolean;
}) {
  return (
    <View style={[styles.listingCard, isCancelled && styles.listingCardMuted]}>
      <View style={styles.listingHeader}>
        <View style={styles.listingTitleGroup}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {transaction.variety}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            {farmerListingLine(transaction)}
          </AnimoText>
        </View>
        <AnimoText variant="price" color={AnimoColors.accentPrimary} style={styles.listingPriceText}>
          {formatPeso(transaction.total)}
        </AnimoText>
      </View>

      <View style={styles.specsRow}>
        <View style={styles.specItem}>
          <Scale size={14} color={AnimoColors.accentPrimary} />
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {transaction.quantityKg} kg
          </AnimoText>
        </View>
        <View style={styles.specItem}>
          <Droplets size={14} color={AnimoColors.textMediumEmphasis} />
          <AnimoText variant="body" color={AnimoColors.textMediumEmphasis}>
            {transaction.moisture}
          </AnimoText>
        </View>
        <View style={styles.specItem}>
          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            {formatPeso(pricePerKg)} / kg
          </AnimoText>
        </View>
      </View>
    </View>
  );
}

/** Buyer party information card with click-to-call */
function BuyerPartyCard({
  buyer,
  onCall,
}: {
  buyer: { name: string; phone: string };
  onCall: () => void;
}) {
  return (
    <View style={styles.partyCard}>
      <View style={styles.partyHeaderRow}>
        <View style={styles.partyAvatar}>
          <User size={20} color={AnimoColors.accentPrimary} />
        </View>
        <View style={styles.flex}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
            {buyer.name}
          </AnimoText>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Mamimili · Na-verify na Account
          </AnimoText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Tawagan si ${buyer.name}`}
          onPress={onCall}
          style={({ pressed }) => [styles.callBtn, pressed && styles.pressed]}>
          <Phone size={15} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.callBtnText}>
            Tawagan
          </AnimoText>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.partyContactRow}>
        <Phone size={15} color={AnimoColors.textMediumEmphasis} />
        <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
          {buyer.phone}
        </AnimoText>
      </View>

      <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
        Makipag-ugnayan sa mamimili gamit ang telepono para sa koordinasyon ng pickup at inspeksyon.
      </AnimoText>
    </View>
  );
}

/** Pickup & Inspection checklist card */
function PickupInspectionCard({
  isCompleted,
  quantityKg,
  scheduleAccepted,
  onAcceptSchedule,
}: {
  isCompleted: boolean;
  quantityKg: number;
  scheduleAccepted: boolean;
  onAcceptSchedule: () => void;
}) {
  return (
    <View style={styles.inspectionCard}>
      <View style={styles.inspectionHeader}>
        <CalendarDays size={18} color={AnimoColors.accentPrimary} />
        <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
          Iskedyul ng Pickup at Inspeksyon
        </AnimoText>
      </View>

      <View style={styles.scheduleBox}>
        <View style={styles.scheduleRow}>
          <Clock size={15} color={AnimoColors.accentPrimary} />
          <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
            Biyernes, Ago 21, 2026 · 08:00 AM - 10:00 AM
          </AnimoText>
        </View>

        <View style={styles.scheduleRow}>
          <MapPin size={15} color={AnimoColors.textMediumEmphasis} />
          <AnimoText variant="body" color={AnimoColors.textHighEmphasis} style={styles.flex}>
            Barangay San Jose, Antipolo, Rizal (Lokasyon ng Bukid)
          </AnimoText>
        </View>
      </View>

      {!scheduleAccepted ? (
        <View style={styles.scheduleAcceptWrap}>
          <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
            Itinakda ng mamimili ang oras na ito. Tanggapin upang kumpirmahin ang iskedyul:
          </AnimoText>
          <AnimoButton
            label="Tanggapin ang Iskedyul"
            icon={Check}
            onPress={onAcceptSchedule}
          />
        </View>
      ) : (
        <View style={styles.confirmedScheduleBanner}>
          <CheckCircle2 size={16} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.passedText}>
            Kumpirmado na ang iskedyul ng pickup.
          </AnimoText>
        </View>
      )}

      <View style={styles.divider} />

      <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
        Talaan ng Inspeksyon sa Oras ng Pickup:
      </AnimoText>

      <View style={styles.checksList}>
        <CheckRow label="Uri at Kalidad ng Palay" passed={isCompleted} />
        <CheckRow label={`Bilang ng Sako (${Math.ceil(quantityKg / 50)} sako × 50kg)`} passed={isCompleted} />
        <CheckRow label={`Aktwal na Timbang (${quantityKg} kg)`} passed={isCompleted} />
      </View>

      {isCompleted ? (
        <View style={styles.passedBanner}>
          <CheckCircle2 size={16} color={AnimoColors.accentPrimary} />
          <AnimoText variant="caption" color={AnimoColors.accentPrimary} style={styles.passedText}>
            Matagumpay na natapos ang inspeksyon at nakuha na ang palay.
          </AnimoText>
        </View>
      ) : null}
    </View>
  );
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <View style={styles.checkRow}>
      <ShieldCheck size={16} color={passed ? AnimoColors.accentPrimary : AnimoColors.objectLowEmphasis} />
      <AnimoText variant="body" color={AnimoColors.textHighEmphasis}>
        {label}
      </AnimoText>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.metaLabel}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis} style={styles.metaValue}>
        {value}
      </AnimoText>
    </View>
  );
}

function FooterActions({
  stage,
  scheduleAccepted,
  onAcceptRequest,
  onDecline,
  onConfirmSchedule,
  onConfirmInspectionPass,
  onConfirmPayment,
  onCancel,
  onRate,
  onBackToMarket,
}: {
  stage: FarmerTransactionStage;
  scheduleAccepted: boolean;
  onAcceptRequest: () => void;
  onDecline: () => void;
  onConfirmSchedule: () => void;
  onConfirmInspectionPass: () => void;
  onConfirmPayment: () => void;
  onCancel: () => void;
  onRate: () => void;
  onBackToMarket: () => void;
}) {
  // 1. Pending stage
  if (stage === 'pending') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton label="Accept" icon={Check} onPress={onAcceptRequest} />
        <AnimoButton
          label="Tanggihan"
          variant="dangerOutline"
          icon={X}
          onPress={onDecline}
        />
      </View>
    );
  }

  // 2. Schedule & Inspection stage
  if (stage === 'accepted' || stage === 'awaiting_pickup') {
    return (
      <View style={styles.footerStack}>
        {!scheduleAccepted ? (
          <AnimoButton
            label="Tanggapin ang Iskedyul ng Pickup"
            icon={Check}
            onPress={onConfirmSchedule}
          />
        ) : (
          <AnimoButton
            label="Kumpirmahin ang Inspeksyon (Pumasa)"
            icon={Check}
            onPress={onConfirmInspectionPass}
          />
        )}
        <AnimoButton
          label="Kanselahin ang Transaksyon"
          variant="dangerOutline"
          icon={X}
          onPress={onCancel}
        />
      </View>
    );
  }

  // 3. Payment stage
  if (stage === 'awaiting_payment') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton
          label="Natanggap ko na ang Bayad"
          icon={Check}
          onPress={onConfirmPayment}
        />
        <AnimoButton
          label="Kanselahin ang Transaksyon"
          variant="dangerOutline"
          icon={X}
          onPress={onCancel}
        />
      </View>
    );
  }

  // 4. Completed stage
  if (stage === 'completed') {
    return (
      <View style={styles.footerStack}>
        <AnimoButton
          label="Magbigay ng Rating"
          variant="secondary"
          icon={Star}
          onPress={onRate}
        />
        <AnimoButton
          label="Bumalik sa Palengke"
          icon={Check}
          onPress={onBackToMarket}
        />
      </View>
    );
  }

  return (
    <View style={styles.footerStack}>
      <AnimoButton label="Bumalik sa Transaksyon" variant="secondary" onPress={() => router.back()} />
    </View>
  );
}

function confirmTitle(kind: ConfirmKind): string {
  switch (kind) {
    case 'accept':
      return 'Tinanggap ang Kahilingan';
    case 'schedule_accept':
      return 'Tinanggap ang Iskedyul';
    case 'inspection_pass':
      return 'Pumasa sa Inspeksyon';
    case 'payment':
      return 'Nakumpirma ang Bayad';
    case 'rating':
      return 'Salamat sa iyong Rating';
    default:
      return '';
  }
}

function confirmMessage(tx: FarmerTransaction, kind: ConfirmKind): string {
  switch (kind) {
    case 'accept':
      return 'Tinanggap mo ang purchase request. Makikita na ang numero ng mamimili para sa pickup at inspeksyon.';
    case 'schedule_accept':
      return 'Kumpirmado na ang itinakdang oras at araw para sa pickup at inspeksyon ng palay.';
    case 'inspection_pass':
      return 'Nakumpirma na ang kalidad at timbang ng palay. Maaari nang magbayad ang mamimili.';
    case 'payment':
      return 'Nakumpirma na ang bayad at tapos na ang transaksyon. Maaari mo nang tingnan ang digital na resibo.';
    case 'rating':
      return 'Naitala ang iyong rating para sa mamimili.';
    default:
      return '';
  }
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
  scroll: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  flex: {
    flex: 1,
  },
  bannerCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
    marginVertical: AnimoSpacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  metaLabel: {
    flex: 1,
  },
  metaValue: {
    textAlign: 'right',
    flexShrink: 0,
  },
  listingCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.sm,
  },
  listingCardMuted: {
    opacity: 0.7,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: AnimoSpacing.md,
  },
  listingTitleGroup: {
    flex: 1,
    gap: 2,
  },
  listingPriceText: {
    textAlign: 'right',
    flexShrink: 0,
  },
  specsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AnimoSpacing.md,
    marginTop: 4,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partyCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.sm,
  },
  partyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  partyAvatar: {
    width: 44,
    height: 44,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
  },
  callBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  partyContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  inspectionCard: {
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.lg,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.sm,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleBox: {
    gap: 6,
    paddingVertical: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleAcceptWrap: {
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfaceSecondary,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    marginTop: 4,
  },
  confirmedScheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AnimoColors.accentPrimaryLight,
    padding: AnimoSpacing.sm,
    borderRadius: AnimoRadius.md,
    marginTop: 2,
  },
  checksList: {
    gap: 6,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  passedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AnimoColors.accentPrimaryLight,
    padding: AnimoSpacing.sm,
    borderRadius: AnimoRadius.md,
    marginTop: 4,
  },
  passedText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
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
  footer: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
    backgroundColor: AnimoColors.appBackground,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
  },
  footerStack: {
    gap: AnimoSpacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.lg,
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmModalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmModalHeaderGroup: {
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  confirmActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
  },
  rejectCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  rejectIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AnimoColors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectHeaderGroup: {
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  textCenter: {
    textAlign: 'center',
  },
  reasonsList: {
    width: '100%',
    gap: AnimoSpacing.sm,
    marginTop: 4,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  reasonOptionSelected: {
    borderColor: AnimoColors.accentPrimary,
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AnimoColors.borderLowEmphasis,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: AnimoColors.accentPrimary,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AnimoColors.accentPrimary,
  },
  customInputWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.sm,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  customInput: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: AnimoColors.textHighEmphasis,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  modalActions: {
    width: '100%',
    gap: AnimoSpacing.sm,
    marginTop: 6,
  },
  confirmRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.danger,
  },
  cancelDismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  pressed: {
    opacity: 0.85,
  },
});
