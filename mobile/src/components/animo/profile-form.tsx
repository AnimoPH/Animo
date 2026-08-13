import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FormCard } from '@/components/animo/form-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SegmentedChoice } from '@/components/animo/segmented-choice';
import { SelectField } from '@/components/animo/select-field';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import {
  BARANGAYS,
  EXPERIENCE_YEARS,
  FARM_SIZES,
  HOUSEHOLD_SIZES,
  MUNICIPALITIES,
} from '@/constants/profile-options';

export type Gender = 'lalaki' | 'babae';
export type YesNo = 'oo' | 'hindi';

export type ProfileValues = {
  fullName: string;
  age: string;
  gender: Gender | null;
  municipality: string | null;
  barangay: string | null;
  farmSize: string | null;
  experience: string | null;
  household: string | null;
  stormDamage: YesNo | null;
  /** Mamimili-only — no location field is collected for buyers. */
  businessName: string;
};

export type ProfileFormProps = {
  roleTitle?: string;
  /** Farm location / details / recovery only apply to Magsasaka. */
  showFarmerFields: boolean;
  values: ProfileValues;
  onChange: (values: ProfileValues) => void;
};

/** Returns true when every required field for the given role is filled. */
export function isProfileComplete(v: ProfileValues, isFarmer: boolean): boolean {
  const personalDone =
    v.fullName.trim().length >= 2 && v.age.trim().length > 0 && v.gender !== null;
  if (!isFarmer) return personalDone && v.businessName.trim().length >= 2;

  return (
    personalDone &&
    v.municipality !== null &&
    v.barangay !== null &&
    v.farmSize !== null &&
    v.experience !== null &&
    v.household !== null &&
    v.stormDamage !== null
  );
}

/**
 * Registration step 3 — profile details.
 *
 * Everyone fills "Personal na Impormasyon". Magsasaka additionally fills farm
 * location, farm details and recovery info.
 */
export function ProfileForm({ roleTitle, showFarmerFields, values, onChange }: ProfileFormProps) {
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
        <LabeledInput
          label="Edad"
          placeholder="45"
          keyboardType="number-pad"
          maxLength={3}
          value={values.age}
          onChangeText={(t) => set('age', t.replace(/\D/g, ''))}
        />
        <SegmentedChoice<Gender>
          label="Kasarian"
          options={[
            { value: 'lalaki', label: 'Lalaki' },
            { value: 'babae', label: 'Babae' },
          ]}
          value={values.gender}
          onChange={(g) => set('gender', g)}
        />
      </FormCard>

      {!showFarmerFields && (
        <FormCard title="Negosyo">
          <LabeledInput
            label="Pangalan ng Negosyo o Kooperatiba"
            placeholder="Hal. Dela Cruz Trading"
            autoCapitalize="words"
            value={values.businessName}
            onChangeText={(t) => set('businessName', t)}
            hint="Ito ang lalabas sa inyong mga transaksyon bilang mamimili."
          />
        </FormCard>
      )}

      {showFarmerFields && (
        <>
          <FormCard title="Lokasyon ng Bukid">
            <SelectField
              label="Munisipalidad"
              placeholder="Pumili ng munisipalidad"
              options={MUNICIPALITIES}
              value={values.municipality}
              onChange={(v) => set('municipality', v)}
            />
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
              label="Taon ng Karanasan sa Pagsasaka"
              placeholder="Pumili ng karanasan"
              options={EXPERIENCE_YEARS}
              value={values.experience}
              onChange={(v) => set('experience', v)}
            />
          </FormCard>

          <FormCard title="Impormasyon Pang-Recovery">
            <SelectField
              label="Bilang ng Miyembro ng Sambahayan"
              placeholder="Pumili ng bilang"
              options={HOUSEHOLD_SIZES}
              value={values.household}
              onChange={(v) => set('household', v)}
            />
            <SegmentedChoice<YesNo>
              label="Naranasan ang pinsala mula sa bagyo noong nakaraang taon?"
              options={[
                { value: 'oo', label: 'Oo' },
                { value: 'hindi', label: 'Hindi' },
              ]}
              value={values.stormDamage}
              onChange={(v) => set('stormDamage', v)}
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
