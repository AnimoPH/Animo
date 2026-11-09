import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { AlertCircle, CalendarDays, Check, ChevronLeft, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog } from '@/components/animo/ui/dialog';
import { OptionCard } from '@/components/animo/ui/option-card';
import { ProgressBar } from '@/components/animo/ui/progress-bar';
import { IconButton, StickyFooter } from '@/components/animo/ui/screen-bits';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import { getRiceTypeOptions, logPlanting, type RiceTypeCategory } from '@/services/advisory-service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_STEPS = 2;

function formatDate(date: Date, isTagalog: boolean): string {
  const monthsTl = [
    'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
    'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre',
  ];
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const months = isTagalog ? monthsTl : monthsEn;
  return isTagalog
    ? `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    : `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Itala ang Taniman: 2-step planting log, the only farmer input the advisory rule engine needs. */
export default function ItalaTanimanScreen() {
  const { t, isTagalog, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<0 | 1>(0);
  const [riceType, setRiceType] = useState<RiceTypeCategory | null>(null);
  const [plantingDate, setPlantingDate] = useState<Date>(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successVisible, setSuccessVisible] = useState(false);

  const riceTypeOptions = useMemo(() => getRiceTypeOptions(language), [language]);

  const handleConfirm = async () => {
    if (!riceType) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      await logPlanting(riceType, plantingDate.toISOString().slice(0, 10));
      setSuccessVisible(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t('plant.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessVisible(false);
    router.replace('/(farmer)/(tabs)');
  };

  return (
    <View style={styles.screen}>
      {/* Progress header: close or back, bar, step counter */}
      <View style={[styles.progressRow, { paddingTop: insets.top + AnimoV2Spacing.sm }]}>
        <IconButton
          icon={
            step === 0 ? (
              <X size={28} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
            ) : (
              <ChevronLeft size={28} color={AnimoV2Colors.textPrimary} strokeWidth={2.75} />
            )
          }
          label={step === 0 ? t('common.close') : t('common.back')}
          onPress={() => (step === 0 ? router.back() : setStep(0))}
        />
        <View style={styles.flex}>
          <ProgressBar value={(step + 1) / TOTAL_STEPS} />
        </View>
        <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary} style={styles.counter}>
          {step + 1}/{TOTAL_STEPS}
        </AnimoText>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.titleBlock}>
          <AnimoText variant="tagV2" color={AnimoV2Colors.textTertiary}>
            {step === 0 ? t('plant.step1') : t('plant.step2')}
          </AnimoText>
          <AnimoText variant="title" accessibilityRole="header">
            {step === 0 ? t('plant.q1') : t('plant.q2')}
          </AnimoText>
        </View>

        {step === 0 ? (
          <View style={styles.optionList}>
            {riceTypeOptions.map((option) => (
              <OptionCard
                key={option.value}
                label={option.label}
                selected={riceType === option.value}
                onPress={() => setRiceType(option.value)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.optionList}>
            {Platform.OS === 'ios' ? (
              <DepthCard depth="flat" style={styles.calendarCard}>
                <DateTimePicker
                  value={plantingDate}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  onChange={(_event, selectedDate) => selectedDate && setPlantingDate(selectedDate)}
                />
              </DepthCard>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('plant.pickDate')}: ${formatDate(plantingDate, isTagalog)}`}
                onPress={() => setShowAndroidPicker(true)}
                style={styles.dateField}>
                <CalendarDays size={24} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                <AnimoText variant="bodyStrong" style={styles.flex}>
                  {formatDate(plantingDate, isTagalog)}
                </AnimoText>
              </Pressable>
            )}
            {showAndroidPicker ? (
              <DateTimePicker
                value={plantingDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(_event, selectedDate) => {
                  setShowAndroidPicker(false);
                  if (selectedDate) setPlantingDate(selectedDate);
                }}
              />
            ) : null}

            <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
              {t('plant.selected')} {formatDate(plantingDate, isTagalog)}
            </AnimoText>

            {errorMessage ? (
              <View style={styles.errorRow}>
                <AlertCircle size={20} color={AnimoV2Colors.dangerFg} strokeWidth={2.75} />
                <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.flex}>
                  {errorMessage}
                </AnimoText>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <StickyFooter>
        {step === 0 ? (
          <ChunkyButton label={t('common.next')} onPress={() => setStep(1)} disabled={!riceType} />
        ) : (
          <ChunkyButton label={t('common.confirm')} onPress={handleConfirm} loading={submitting} />
        )}
      </StickyFooter>

      <V2Dialog
        visible={successVisible}
        onClose={handleSuccessClose}
        dismissable={false}
        icon={Check}
        iconTone="success"
        title={t('plant.successTitle')}
        message={t('plant.successBody')}
        actions={<ChunkyButton label={t('plant.successOk')} onPress={handleSuccessClose} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingBottom: AnimoV2Spacing.sm,
  },
  counter: { paddingRight: AnimoV2Spacing.sm },
  body: {
    flexGrow: 1,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.md,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  titleBlock: { gap: AnimoV2Spacing.xs },
  optionList: { gap: AnimoV2Spacing.sm },
  calendarCard: { padding: AnimoV2Spacing.sm },
  dateField: {
    minHeight: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
