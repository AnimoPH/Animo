import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { ScreenHeader } from '@/components/animo/screen-header';
import { FormCard } from '@/components/animo/form-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SelectField } from '@/components/animo/select-field';
import { FeedbackModal } from '@/components/animo/feedback-modal';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { BARANGAYS } from '@/constants/profile-options';
import { getRole } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';
import { updateMyFarmerProfile } from '@/services/auth-service';

/** 11-digit PH mobile format, matching `farmer.gcash_number varchar(11)`. */
const GCASH_NUMBER_PATTERN = /^09\d{9}$/;

/**
 * View/edit the farmer's own profile — the only screen reachable from the
 * Profile tab's previously-dead "Personal na Impormasyon" row. Only
 * `full_name`, `barangay`, and `gcash_number` are actually editable (see
 * migration 0001's column grants); phone, role, and wallet address are
 * read-only.
 */
export default function ProfileEditScreen() {
  const { account, refresh } = useSession();

  const [fullName, setFullName] = useState(account?.fullName ?? '');
  const [barangay, setBarangay] = useState<string | null>(account?.barangay ?? null);
  const [gcashNumber, setGcashNumber] = useState(account?.gcashNumber ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);

  if (!account) return null;

  const roleTitle = getRole(account.role)?.title ?? 'Magsasaka';
  const gcashValid = gcashNumber.trim().length === 0 || GCASH_NUMBER_PATTERN.test(gcashNumber);
  const canSave = fullName.trim().length >= 2 && barangay !== null && gcashValid;

  const handleSave = async () => {
    if (!canSave || !barangay) return;
    setSubmitting(true);
    setErrorMessage(undefined);
    try {
      await updateMyFarmerProfile({
        fullName: fullName.trim(),
        barangay,
        gcashNumber: gcashNumber.trim().length > 0 ? gcashNumber.trim() : null,
      });
      await refresh();
      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Hindi na-save ang profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Personal na Impormasyon" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <FormCard title="Account">
            <ReadOnlyRow label="Numero ng Telepono" value={account.phone} />
            <ReadOnlyRow label="Tungkulin" value={roleTitle} />
            <ReadOnlyRow
              label="Wallet Address"
              value={account.walletAddress ?? 'Wala pang wallet'}
            />
          </FormCard>

          <FormCard title="Personal na Impormasyon">
            <LabeledInput
              label="Buong Pangalan"
              placeholder="Juan Dela Cruz"
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
            <SelectField
              label="Barangay"
              placeholder="Pumili ng barangay"
              options={BARANGAYS}
              value={barangay}
              onChange={setBarangay}
            />
            <LabeledInput
              label="GCash Number"
              placeholder="09171234567"
              keyboardType="number-pad"
              maxLength={11}
              value={gcashNumber}
              onChangeText={(t) => setGcashNumber(t.replace(/\D/g, ''))}
              error={!gcashValid}
              hint={gcashValid ? undefined : '11 digits, nagsisimula sa 09.'}
              hintTone={gcashValid ? 'muted' : 'danger'}
            />
          </FormCard>

          {errorMessage && (
            <AnimoText variant="body" color={AnimoColors.danger}>
              {errorMessage}
            </AnimoText>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <AnimoButton
            label="I-save"
            onPress={handleSave}
            disabled={!canSave}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>

      <FeedbackModal
        visible={showSuccess}
        tone="success"
        title="Na-save ang Profile"
        message="Na-update na ang inyong personal na impormasyon."
        onConfirm={() => {
          setShowSuccess(false);
          router.back();
        }}
      />
    </SafeAreaView>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <AnimoText variant="bodyEmphasis" color={AnimoColors.black}>
        {label}
      </AnimoText>
      <AnimoText variant="body" color={AnimoColors.blackSecondary}>
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
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.lg,
  },
  readOnlyRow: {
    gap: AnimoSpacing.xs,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.md,
  },
});
