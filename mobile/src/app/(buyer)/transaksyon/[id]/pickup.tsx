import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Edit2,
  HelpCircle,
  Map,
  MapPin,
  Phone,
  PlusCircle,
  TriangleAlert,
  User,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Linking,
  Modal,
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
import { NoticeBanner } from '@/components/animo/notice-banner';
import { ProgressTracker } from '@/components/animo/progress-tracker';
import { ScreenHeader } from '@/components/animo/screen-header';
import { StatusBadge } from '@/components/animo/status-badge';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import {
  cancelPolicy,
  formatPeso,
  getPurchaseRequest,
  progressSteps,
  requestTotal,
} from '@/constants/marketplace';

const MONTH_NAMES = [
  'Ene', 'Peb', 'Mar', 'Abr', 'May', 'Hun',
  'Hul', 'Ago', 'Set', 'Okt', 'Nob', 'Dis',
];

const DAY_NAMES = ['Linggo', 'Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado'];

function formatDate(date: Date): string {
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  return `${dayName}, ${monthName} ${dayNum}, ${year}`;
}

function formatTime(date: Date): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Pickup at Inspeksyon — Screen 1 in the revised flow.
 *
 * Initially date/time is NOT set; buyer must set it.
 * Confirming inspection triggers a success feedback modal before proceeding to payment.
 */
export default function PickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const request = getPurchaseRequest(id);

  // Initially date & time is unset (null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

  // Temporary date for picker modal
  const [tempDate, setTempDate] = useState<Date>(new Date(Date.now() + 86400000));
  const [tempEndTime, setTempEndTime] = useState<Date>(
    new Date(Date.now() + 86400000 + 7200000)
  );

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Action Feedback Modals
  const [showScheduleSetModal, setShowScheduleSetModal] = useState(false);
  const [showInspectionConfirmPrompt, setShowInspectionConfirmPrompt] = useState(false);
  const [showInspectionSuccessModal, setShowInspectionSuccessModal] = useState(false);
  const [showCancelledSuccessModal, setShowCancelledSuccessModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Pickup at Inspeksyon" />
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
  const total = requestTotal(request);

  const addressLine = request.pickup?.addressLine || farmer.addressLine;
  const addressDetail = request.pickup?.addressDetail || farmer.addressDetail;

  const displayDateStr = selectedDate ? formatDate(selectedDate) : null;
  const displayTimeStr =
    selectedDate && selectedEndDate
      ? `${formatTime(selectedDate)} - ${formatTime(selectedEndDate)}`
      : null;

  const handleOpenPicker = () => {
    if (selectedDate && selectedEndDate) {
      setTempDate(new Date(selectedDate));
      setTempEndTime(new Date(selectedEndDate));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(10, 0, 0, 0);
      setTempDate(tomorrow);
      setTempEndTime(tomorrowEnd);
    }
    setIsEditingSchedule(true);
  };

  const handleSaveSchedule = () => {
    setSelectedDate(new Date(tempDate));
    setSelectedEndDate(new Date(tempEndTime));
    setIsEditingSchedule(false);
    setShowScheduleSetModal(true);
  };

  const handleConfirmInspectionPress = () => {
    if (!selectedDate) {
      handleOpenPicker();
      return;
    }
    setShowInspectionConfirmPrompt(true);
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      const updated = new Date(tempDate);
      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setTempDate(updated);
    }
  };

  const onStartTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') setShowStartTimePicker(false);
    if (time) {
      const updated = new Date(tempDate);
      updated.setHours(time.getHours(), time.getMinutes());
      setTempDate(updated);
    }
  };

  const onEndTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS === 'android') setShowEndTimePicker(false);
    if (time) {
      const updated = new Date(tempEndTime);
      updated.setHours(time.getHours(), time.getMinutes());
      setTempEndTime(updated);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScreenHeader title="Pickup at Inspeksyon" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Top Status Card */}
        <View style={styles.card}>
          <View style={styles.bannerRow}>
            <View
              style={[
                styles.bannerIcon,
                !selectedDate && styles.bannerIconPending,
              ]}>
              <CalendarDays
                size={20}
                color={selectedDate ? '#2563A8' : '#B4791A'}
              />
            </View>
            <View style={styles.bannerText}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                {selectedDate ? 'Nakaiskedyul ang Pickup' : 'Itakda ang Iskedyul'}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {selectedDate
                  ? 'Puntahan ang bukid para sa inspeksyon'
                  : 'Pumili ng petsa at oras ng iyong pagbisita sa bukid'}
              </AnimoText>
            </View>
          </View>
          <View style={styles.bannerMeta}>
            <StatusBadge
              label={selectedDate ? 'Nakaiskedyul' : 'Kailangan Itakda'}
              tone={selectedDate ? 'info' : 'warning'}
            />
            {displayDateStr && (
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {displayDateStr}
              </AnimoText>
            )}
          </View>
        </View>

        {/* Schedule Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <AnimoText variant="h3" color={AnimoColors.black}>
              Detalye ng Iskedyul
            </AnimoText>
            <Pressable
              hitSlop={8}
              onPress={handleOpenPicker}
              style={styles.editAction}>
              {selectedDate ? (
                <>
                  <Edit2 size={14} color={AnimoColors.green} />
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    Baguhin
                  </AnimoText>
                </>
              ) : (
                <>
                  <PlusCircle size={14} color={AnimoColors.green} />
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.green}>
                    Itakda
                  </AnimoText>
                </>
              )}
            </Pressable>
          </View>

          {selectedDate && displayDateStr && displayTimeStr ? (
            <View style={styles.detailRow}>
              <CalendarDays size={18} color={AnimoColors.blackSecondary} />
              <View style={styles.detailText}>
                <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                  {displayDateStr}
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {displayTimeStr}
                </AnimoText>
              </View>
            </View>
          ) : (
            <Pressable
              style={styles.unsetItemBox}
              onPress={handleOpenPicker}>
              <Clock size={18} color="#B4791A" />
              <View style={styles.detailText}>
                <AnimoText variant="bodyEmphasis" color="#B4791A">
                  Wala pang petsa at oras
                </AnimoText>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  Pindutin dito upang itakda ang iskedyul ng pickup
                </AnimoText>
              </View>
            </Pressable>
          )}

          <View style={styles.detailRow}>
            <MapPin size={18} color={AnimoColors.blackSecondary} />
            <View style={styles.detailText}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                {addressLine}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.muted}>
                {addressDetail}
              </AnimoText>
            </View>
          </View>

          <Pressable
            style={styles.mapRow}
            onPress={() =>
              Linking.openURL(
                `https://maps.google.com/?q=${encodeURIComponent(`${addressLine}, ${addressDetail}`)}`
              )
            }>
            <Map size={18} color={AnimoColors.blackSecondary} />
            <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
              Tingnan sa Mapa
            </AnimoText>
            <ChevronRight size={18} color={AnimoColors.muted} />
          </Pressable>
        </View>

        {/* Farmer Contact & Party Card */}
        <View style={styles.partyCard}>
          <View style={styles.partyHeaderRow}>
            <View style={styles.partyAvatar}>
              <User size={20} color={AnimoColors.accentPrimary} />
            </View>
            <View style={styles.flex}>
              <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
                {farmer.name}
              </AnimoText>
              <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                Magsasaka · Rehistrado sa RSBSA
              </AnimoText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tawagan si ${farmer.name}`}
              onPress={() => Linking.openURL(`tel:${farmer.phone.replace(/\s/g, '')}`)}
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
              {farmer.phone}
            </AnimoText>
          </View>

          <AnimoText variant="caption" color={AnimoColors.textLowEmphasis}>
            Makipag-ugnayan sa magsasaka gamit ang telepono para sa koordinasyon ng pickup at inspeksyon.
          </AnimoText>
        </View>

        {/* Transaction Progress Tracker */}
        <ProgressTracker steps={progressSteps(request)} />

        {/* Payment Notice Banner */}
        <NoticeBanner tone="warning" icon={<TriangleAlert size={16} color="#B4791A" />}>
          Pagkatapos ng inspeksyon, babayaran mo ang buong halagang{' '}
          {formatPeso(total)} sa pamamagitan ng GCash o Cash.
        </NoticeBanner>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footerStack}>
        <AnimoButton
          label="Kumpirmahin ang Inspeksyon"
          icon={Check}
          onPress={handleConfirmInspectionPress}
        />
        {/* Red Cancel Button */}
        <AnimoButton
          label="Kanselahin ang Transaksyon"
          variant="dangerOutline"
          icon={X}
          onPress={() => setCancelling(true)}
        />
      </View>

      {/* React Native Date & Time Picker Modal */}
      <Modal
        visible={isEditingSchedule}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingSchedule(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AnimoText variant="h3" color={AnimoColors.black}>
                Itakda ang Petsa at Oras
              </AnimoText>
              <Pressable
                onPress={() => setIsEditingSchedule(false)}
                hitSlop={8}>
                <X size={20} color={AnimoColors.muted} />
              </Pressable>
            </View>

            {/* Date Picker Trigger */}
            <View style={styles.pickerFieldGroup}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                Petsa ng Pickup
              </AnimoText>
              <Pressable
                style={styles.pickerTrigger}
                onPress={() => setShowDatePicker(true)}>
                <CalendarDays size={18} color={AnimoColors.green} />
                <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
                  {formatDate(tempDate)}
                </AnimoText>
                <ChevronRight size={18} color={AnimoColors.muted} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Start Time Picker Trigger */}
            <View style={styles.pickerFieldGroup}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                Oras ng Simula
              </AnimoText>
              <Pressable
                style={styles.pickerTrigger}
                onPress={() => setShowStartTimePicker(true)}>
                <Clock size={18} color={AnimoColors.green} />
                <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
                  {formatTime(tempDate)}
                </AnimoText>
                <ChevronRight size={18} color={AnimoColors.muted} />
              </Pressable>
              {showStartTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartTimeChange}
                />
              )}
            </View>

            {/* End Time Picker Trigger */}
            <View style={styles.pickerFieldGroup}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
                Oras ng Pagtatapos
              </AnimoText>
              <Pressable
                style={styles.pickerTrigger}
                onPress={() => setShowEndTimePicker(true)}>
                <Clock size={18} color={AnimoColors.green} />
                <AnimoText variant="body" color={AnimoColors.black} style={styles.flex}>
                  {formatTime(tempEndTime)}
                </AnimoText>
                <ChevronRight size={18} color={AnimoColors.muted} />
              </Pressable>
              {showEndTimePicker && (
                <DateTimePicker
                  value={tempEndTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEndTimeChange}
                />
              )}
            </View>

            <AnimoButton
              label="I-save ang Iskedyul"
              icon={Check}
              onPress={handleSaveSchedule}
            />
          </View>
        </View>
      </Modal>

      {/* Schedule Set Notification Modal */}
      <FeedbackModal
        visible={showScheduleSetModal}
        tone="success"
        title="Naitakda ang Iskedyul!"
        message={`Naka-iskedyul ang iyong pickup sa ${displayDateStr} mula ${displayTimeStr}.`}
        confirmLabel="OK"
        onConfirm={() => setShowScheduleSetModal(false)}
      />

      {/* Inspection Confirmation Prompt Modal */}
      <Modal
        visible={showInspectionConfirmPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInspectionConfirmPrompt(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInspectionConfirmPrompt(false)}>
          <Pressable style={styles.confirmPromptCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmPromptIconCircle}>
              <HelpCircle size={28} color={AnimoColors.accentPrimary} />
            </View>

            <View style={styles.confirmPromptHeaderGroup}>
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis} style={styles.textCenter}>
                Kumpirmahin ang Inspeksyon?
              </AnimoText>
              <AnimoText variant="body" color={AnimoColors.textMediumEmphasis} style={styles.textCenter}>
                Sigurado ka bang pumasa ang palay sa kalidad at timbang at nais mo nang magpatuloy sa pagbabayad?
              </AnimoText>
            </View>

            <View style={styles.modalActionStack}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setShowInspectionConfirmPrompt(false);
                  setShowInspectionSuccessModal(true);
                }}
                style={({ pressed }) => [styles.confirmPromptBtn, pressed && styles.pressed]}>
                <Check size={18} color={AnimoColors.white} />
                <AnimoText variant="button" color={AnimoColors.white}>
                  Oo, Kumpirmahin (Magbayad)
                </AnimoText>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setShowInspectionConfirmPrompt(false)}
                style={({ pressed }) => [styles.cancelPromptBtn, pressed && styles.pressed]}>
                <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                  Huwag Muna
                </AnimoText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Inspection Confirmed Notification Modal */}
      <FeedbackModal
        visible={showInspectionSuccessModal}
        tone="success"
        title="Nakumpirma ang Inspeksyon!"
        message={`Nakahanda ka na para sa pagbabayad ng ${formatPeso(total)} kay ${farmer.name}.`}
        confirmLabel="Kumpirmahin"
        onConfirm={() => {
          setShowInspectionSuccessModal(false);
          router.push(`/(buyer)/transaksyon/${request.id}/bayad`);
        }}
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
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AnimoSpacing.md,
  },
  editAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: AnimoSpacing.md,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3EEFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconPending: {
    backgroundColor: '#FDF6E4',
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
  },
  unsetItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: '#FDF6E4',
    borderWidth: 1,
    borderColor: '#F0D79A',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
    marginVertical: 2,
  },
  detailText: {
    flex: 1,
    gap: 1,
  },
  flex: {
    flex: 1,
  },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xs,
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
  footerStack: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: AnimoSpacing.lg,
  },
  modalContent: {
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AnimoSpacing.xs,
  },
  pickerFieldGroup: {
    gap: 6,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surface,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.md,
  },
  confirmPromptCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    padding: AnimoSpacing.xl,
    gap: AnimoSpacing.md,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmPromptIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPromptHeaderGroup: {
    alignItems: 'center',
    gap: AnimoSpacing.xs,
  },
  textCenter: {
    textAlign: 'center',
  },
  modalActionStack: {
    width: '100%',
    gap: AnimoSpacing.sm,
    marginTop: 4,
  },
  confirmPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
    width: '100%',
    height: 50,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimary,
  },
  cancelPromptBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  divider: {
    height: 1,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  pressed: {
    opacity: 0.85,
  },
});
