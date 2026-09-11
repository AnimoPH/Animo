import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Sprout } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { IconChoiceGrid, type IconChoiceOption } from '@/components/animo/farmer/icon-choice-grid';
import { ProgressSteps } from '@/components/animo/farmer/progress-steps';
import { ScreenHeader } from '@/components/animo/screen-header';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { logPlanting, RICE_TYPE_OPTIONS, type RiceTypeCategory } from '@/services/advisory-service';

const RICE_TYPE_ICON_OPTIONS: IconChoiceOption<RiceTypeCategory>[] = RICE_TYPE_OPTIONS.map((option) => ({
  ...option,
  icon: Sprout,
}));

function formatDate(date: Date): string {
  const months = [
    'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
    'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** Itala ang Taniman — 2-step planting log, the only farmer input the advisory rule engine needs. */
export default function ItalaTanimanScreen() {
  const [step, setStep] = useState<0 | 1>(0);
  const [riceType, setRiceType] = useState<RiceTypeCategory | null>(null);
  const [plantingDate, setPlantingDate] = useState<Date>(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [successVisible, setSuccessVisible] = useState(false);

  const handleConfirm = async () => {
    if (!riceType) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      await logPlanting(riceType, plantingDate.toISOString().slice(0, 10));
      setSuccessVisible(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Hindi naitala ang taniman.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Itala ang Taniman" />
      <ProgressSteps currentStep={step} />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {step === 0 ? (
          <>
            <AnimoText variant="tag" color={AnimoColors.textLowEmphasis} style={styles.stepLabel}>
              HAKBANG 1 NG 2
            </AnimoText>
            <AnimoText variant="h2" color={AnimoColors.black} style={styles.question}>
              Anong uri ng palay ang itinanim mo?
            </AnimoText>
            <IconChoiceGrid options={RICE_TYPE_ICON_OPTIONS} value={riceType} onChange={setRiceType} />

            <View style={styles.flexFill} />
            <AnimoButton label="Susunod" onPress={() => setStep(1)} disabled={!riceType} />
          </>
        ) : (
          <>
            <AnimoText variant="tag" color={AnimoColors.textLowEmphasis} style={styles.stepLabel}>
              HAKBANG 2 NG 2
            </AnimoText>
            <AnimoText variant="h2" color={AnimoColors.black} style={styles.question}>
              Kailan mo ito itinanim?
            </AnimoText>

            {Platform.OS === 'ios' ? (
              <View style={styles.calendarCard}>
                <DateTimePicker
                  value={plantingDate}
                  mode="date"
                  display="inline"
                  maximumDate={new Date()}
                  onChange={(_event, selectedDate) => selectedDate && setPlantingDate(selectedDate)}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAndroidPicker(true)}
                style={styles.dateField}>
                <AnimoText variant="body" color={AnimoColors.black}>
                  {formatDate(plantingDate)}
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

            <AnimoText variant="caption" color={AnimoColors.textLowEmphasis} style={styles.pickedLabel}>
              Pinili: {formatDate(plantingDate)}
            </AnimoText>

            {errorMessage ? (
              <AnimoText variant="caption" color={AnimoColors.danger}>
                {errorMessage}
              </AnimoText>
            ) : null}

            <View style={styles.flexFill} />
            <View style={styles.confirmRow}>
              <AnimoButton label="Bumalik" variant="secondary" onPress={() => setStep(0)} style={styles.flexOne} />
              <AnimoButton
                label="Kumpirmahin"
                onPress={handleConfirm}
                loading={submitting}
                style={styles.flexOne}
              />
            </View>
          </>
        )}
      </ScrollView>

      <FeedbackModal
        visible={successVisible}
        tone="success"
        title="Naitala ang Taniman!"
        message="Makakatanggap ka na ng payo sa panahon para sa taniman na ito, kapag naging available ang datos."
        confirmLabel="Sige, Salamat"
        onConfirm={() => {
          setSuccessVisible(false);
          router.replace('/(farmer)/(tabs)');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AnimoColors.white },
  body: { flexGrow: 1, paddingHorizontal: AnimoSpacing.lg, paddingBottom: AnimoSpacing.xl },
  stepLabel: { letterSpacing: 0.6, marginBottom: 4 },
  question: { marginBottom: AnimoSpacing.lg },
  flexFill: { flexGrow: 1, minHeight: AnimoSpacing.xl },
  flexOne: { flex: 1 },
  confirmRow: { flexDirection: 'row', gap: AnimoSpacing.md },
  calendarCard: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    overflow: 'hidden',
  },
  dateField: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.md,
    paddingVertical: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.lg,
  },
  pickedLabel: { marginTop: AnimoSpacing.sm },
});
