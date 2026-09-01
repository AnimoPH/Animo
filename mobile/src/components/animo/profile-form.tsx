import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FormCard } from '@/components/animo/form-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SelectField } from '@/components/animo/select-field';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { BARANGAYS, FARM_SIZES, PALAY_VARIETIES } from '@/constants/profile-options';

function formatPhoneDisplay(local: string): string {
  return local ? `+63 ${local}` : '';
}

export type ProfileValues = {
  fullName: string;
  barangay: string | null;
  farmSize: string | null;
  riceVariety: string | null;
  gcashNumber: string;
};

export type ProfileFormProps = {
  roleTitle?: string;
  /** Farm location / details only apply to Magsasaka. */
  showFarmerFields: boolean;
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
  phoneNumber,
  values,
  onChange,
}: ProfileFormProps) {
  // Small helper to update a single field immutably.
  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.body}>
      <View style={styles.intro}>
        <AnimoText variant="h2" color={AnimoColors.black}>
          Kumpletuhin ang inyong profile
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary}>
          {roleTitle
            ? `Nagrerehistro bilang ${roleTitle}. Kailangan namin ng ilang impormasyon para makapaglingkod sa inyo nang tama.`
            : 'Kailangan namin ng ilang impormasyon para makapaglingkod sa inyo nang tama.'}
        </AnimoText>
      </View>

      <FormCard title="Personal na Impormasyon">
        <LabeledInput
          label="Buong Pangalan"
          placeholder="Juan Dela Cruz"
          autoCapitalize="words"
          value={values.fullName}
          onChangeText={(t) => set('fullName', t)}
          hint="Ito ang lalabas sa inyong mga listing at transaksyon."
        />
      </FormCard>

      <FormCard title="Bayad">
        <LabeledInput
          label="GCash Number"
          placeholder="09XXXXXXXXX"
          keyboardType="number-pad"
          maxLength={11}
          value={values.gcashNumber}
          onChangeText={(t) => set('gcashNumber', t.replace(/\D/g, ''))}
        />
      </FormCard>

      <FormCard title="Contact Number">
        <LabeledInput
          label="Numero ng Telepono"
          value={formatPhoneDisplay(phoneNumber)}
          editable={false}
        />
      </FormCard>

      {showFarmerFields && (
        <>
          <FormCard title="Lokasyon ng Bukid">
            <SelectField
              label="Barangay"
              placeholder="Pumili ng barangay"
              options={BARANGAYS}
              value={values.barangay}
              onChange={(v) => set('barangay', v)}
            />
          </FormCard>

          <FormCard title="Detalye ng Bukid">
            <SelectField
              label="Laki ng Bukid"
              placeholder="Pumili ng laki ng bukid"
              options={FARM_SIZES}
              value={values.farmSize}
              onChange={(v) => set('farmSize', v)}
            />
            <SelectField
              label="Uri ng Palay na Karaniwang Itinatanim"
              placeholder="Pumili ng uri"
              options={PALAY_VARIETIES}
              value={values.riceVariety}
              onChange={(v) => set('riceVariety', v)}
            />
          </FormCard>
        </>
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
