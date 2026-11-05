import { router } from 'expo-router';
import { AlertCircle, Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Dialog, V2Sheet } from '@/components/animo/ui/dialog';
import { OptionCard } from '@/components/animo/ui/option-card';
import { StickyFooter, V2BackHeader } from '@/components/animo/ui/screen-bits';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { BARANGAYS } from '@/constants/profile-options';
import { getRole } from '@/constants/roles';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { updateMyFarmerProfile } from '@/services/auth-service';

/** 11-digit PH mobile format, matching `farmer.gcash_number varchar(11)`. */
const GCASH_NUMBER_PATTERN = /^09\d{9}$/;

/**
 * View/edit the farmer's own profile, reachable from the Profile tab's
 * "Personal na Impormasyon" row. Only `full_name`, `barangay`, and
 * `gcash_number` are actually editable (see migration 0001's column grants);
 * phone, role, and wallet address are read-only.
 */
export default function ProfileEditScreen() {
  const { account, refresh } = useSession();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(account?.fullName ?? '');
  const [barangay, setBarangay] = useState<string | null>(account?.barangay ?? null);
  const [gcashNumber, setGcashNumber] = useState(account?.gcashNumber ?? '');
  const [original] = useState({
    fullName: account?.fullName?.trim() ?? '',
    barangay: account?.barangay ?? null,
    gcashNumber: account?.gcashNumber?.trim() ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState(false);
  const [showBarangaySheet, setShowBarangaySheet] = useState(false);

  if (!account) return null;

  const roleTitle = getRole(account.role)?.title ?? 'Magsasaka';
  const trimmedName = fullName.trim();
  const trimmedGcash = gcashNumber.trim();
  const gcashValid = trimmedGcash.length === 0 || GCASH_NUMBER_PATTERN.test(trimmedGcash);
  const hasChanges =
    trimmedName !== original.fullName ||
    barangay !== original.barangay ||
    trimmedGcash !== original.gcashNumber;
  const canSave = hasChanges && trimmedName.length >= 2 && barangay !== null && gcashValid;
  const barangayText = BARANGAYS.find((option) => option.value === barangay)?.label;

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
      setErrorMessage(err instanceof Error ? err.message : t('profileV2.editFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <V2BackHeader title={t('profileV2.editTitle')} onBack={() => router.back()} backLabel={t('common.back')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <DepthCard depth="flat" style={styles.card}>
            <AnimoText variant="subheading">{t('profileV2.editAccount')}</AnimoText>
            <ReadOnlyRow label={t('profileV2.phone')} value={account.phone} />
            <ReadOnlyRow label={t('profileV2.editRole')} value={roleTitle} />
            <ReadOnlyRow label={t('profileV2.editWallet')} value={account.walletAddress ?? t('profileV2.editNoWallet')} />
          </DepthCard>

          <DepthCard depth="flat" style={styles.card}>
            <AnimoText variant="subheading">{t('profileV2.editTitle')}</AnimoText>
            <TextField
              label={t('profileV2.editFullName')}
              placeholder="Juan Dela Cruz"
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={styles.fieldGap}>
              <AnimoText variant="bodyStrong">{t('profileV2.editBarangay')}</AnimoText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('profileV2.editBarangay')}: ${barangayText ?? t('profileV2.editPickBarangay')}`}
                onPress={() => setShowBarangaySheet(true)}
                style={styles.selectBox}>
                <AnimoText
                  variant="bodyV2"
                  color={barangayText ? AnimoV2Colors.textPrimary : AnimoV2Colors.textTertiary}
                  style={styles.flex}>
                  {barangayText ?? t('profileV2.editPickBarangay')}
                </AnimoText>
                <ChevronDown size={22} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
              </Pressable>
            </View>

            <TextField
              label={t('profileV2.gcash')}
              placeholder="09171234567"
              keyboardType="number-pad"
              maxLength={11}
              value={gcashNumber}
              onChangeText={(text) => setGcashNumber(text.replace(/\D/g, ''))}
              error={gcashValid ? undefined : t('profileV2.editGcashHint')}
            />
          </DepthCard>

          {errorMessage ? (
            <View style={styles.errorRow}>
              <AlertCircle size={20} color={AnimoV2Colors.dangerFg} strokeWidth={2.75} />
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={styles.flex}>
                {errorMessage}
              </AnimoText>
            </View>
          ) : null}
        </ScrollView>

        <StickyFooter>
          <ChunkyButton label={t('common.save')} onPress={handleSave} disabled={!canSave} loading={submitting} />
        </StickyFooter>
      </KeyboardAvoidingView>

      <V2Sheet
        visible={showBarangaySheet}
        onClose={() => setShowBarangaySheet(false)}
        title={t('profileV2.editPickBarangay')}>
        {BARANGAYS.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={option.value === barangay}
            onPress={() => {
              setBarangay(option.value);
              setShowBarangaySheet(false);
            }}
          />
        ))}
      </V2Sheet>

      <V2Dialog
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          router.back();
        }}
        icon={Check}
        iconTone="success"
        title={t('profileV2.editSavedTitle')}
        message={t('profileV2.editSavedBody')}
        actions={
          <ChunkyButton
            label={t('plant.successOk')}
            onPress={() => {
              setShowSuccess(false);
              router.back();
            }}
          />
        }
      />
    </View>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readOnlyRow}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textTertiary}>
        {label}
      </AnimoText>
      <AnimoText variant="bodyStrong">{value}</AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AnimoV2Colors.surfaceApp },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingTop: AnimoV2Spacing.xs,
    paddingBottom: AnimoV2Spacing.xl,
    gap: AnimoV2Spacing.lg,
  },
  card: { padding: AnimoV2Spacing.lg, gap: AnimoV2Spacing.lg },
  readOnlyRow: { gap: AnimoV2Spacing.xs },
  fieldGap: { gap: AnimoV2Spacing.sm },
  selectBox: {
    minHeight: AnimoV2Size.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
