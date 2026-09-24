import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import {
  BuyerPreferencesForm,
  EMPTY_BUYER_PREFERENCES_FORM,
  type BuyerPreferencesFormValues,
} from '@/components/animo/buyer-preferences-form';
import { FormCard } from '@/components/animo/form-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SelectField } from '@/components/animo/select-field';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { BARANGAYS, FARM_SIZES, PALAY_VARIETIES } from '@/constants/profile-options';
import { useLanguage } from '@/hooks/use-language';

function formatPhoneDisplay(local: string): string {
  return local ? `+63 ${local}` : '';
}

export type ProfileValues = {
  fullName: string;
  barangay: string | null;
  farmSize: string | null;
  riceVariety: string | null;
  gcashNumber: string;
  /** Buyer-only; optional, storage-only preferences (see buyer-preferences-form.tsx). */
  buyerPreferences: BuyerPreferencesFormValues;
};

export const EMPTY_PROFILE_VALUES: ProfileValues = {
  fullName: '',
  barangay: null,
  farmSize: null,
  riceVariety: null,
  gcashNumber: '',
  buyerPreferences: EMPTY_BUYER_PREFERENCES_FORM,
};

export type ProfileFormProps = {
  roleTitle?: string;
  /** Farm location / details only apply to Magsasaka. */
  showFarmerFields: boolean;
  /** Buying preferences only apply to Mamimili. */
  showBuyerFields: boolean;
  /** Verified phone from the Numero/OTP steps — read-only display only. */
  phoneNumber: string;
  values: ProfileValues;
  onChange: (values: ProfileValues) => void;
};

/** Returns true when every required field for the given role is filled. */
export function isProfileComplete(v: ProfileValues, isFarmer: boolean): boolean {
  const sharedDone =
    v.fullName.trim().length >= 2 && /^\d{11}$/.test(v.gcashNumber);
  if (!isFarmer) return sharedDone;

  return sharedDone && v.barangay !== null;
}

/**
 * Registration step 3 — profile details.
 *
 * Everyone fills "Personal na Impormasyon" and "Bayad". Magsasaka additionally
 * fills farm location and farm details.
 */
export function ProfileForm({
  roleTitle,
  showFarmerFields,
  showBuyerFields,
  phoneNumber,
  values,
  onChange,
}: ProfileFormProps) {
  const { t } = useLanguage();

  // Small helper to update a single field immutably.
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.body}>
      <View style={styles.intro}>
        <AnimoText variant="h2" color={AnimoColors.black}>
          {t('register.completeProfileTitle')}
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {roleTitle
            ? (showFarmerFields ? t('register.introFarmer') : t('register.introBuyer'))
            : t('register.introFarmer')}
        </AnimoText>
      </View>

      <FormCard title={t('register.personalInfo')}>
        <LabeledInput
          label={t('register.fullName')}
          placeholder="Juan Dela Cruz"
          autoCapitalize="words"
          value={values.fullName}
          onChangeText={(t) => set('fullName', t)}
          hint={t('register.fullNameHint')}
        />
      </FormCard>

      <FormCard title={t('register.contactInfo')}>
        <LabeledInput
          label={t('login.phoneLabel')}
          value={formatPhoneDisplay(phoneNumber)}
          editable={false}
        />

        <LabeledInput
          label={t('register.gcashNumber')}
          placeholder="09XXXXXXXXX"
          keyboardType="number-pad"
          maxLength={11}
          value={values.gcashNumber}
          onChangeText={(t) => set('gcashNumber', t.replace(/\D/g, ''))}
          hint={t('register.gcashHint')}
        />
      </FormCard>

      {showFarmerFields && (
        <>
          <FormCard title={t('register.farmLocationTitle')}>
            <SelectField
              label={t('register.barangay')}
              placeholder={t('register.selectBarangayPlaceholder')}
              options={BARANGAYS}
              value={values.barangay}
              onChange={(v) => set('barangay', v)}
            />
          </FormCard>

          <FormCard title={t('register.farmDetailsTitle')}>
            <SelectField
              label={t('register.farmSize')}
              placeholder={t('register.farmSizePlaceholder')}
              options={FARM_SIZES}
              value={values.farmSize}
              onChange={(v) => set('farmSize', v)}
            />
            <SelectField
              label={t('register.typicalVarietyLabel')}
              placeholder={t('register.riceVarietyPlaceholder')}
              options={PALAY_VARIETIES}
              value={values.riceVariety}
              onChange={(v) => set('riceVariety', v)}
            />
          </FormCard>
        </>
      )}

      {showBuyerFields && (
        <BuyerPreferencesForm
          values={values.buyerPreferences}
          onChange={(buyerPreferences) => set('buyerPreferences', buyerPreferences)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: AnimoSpacing.lg,
  },
  intro: {
    gap: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.xs,
  },
});
