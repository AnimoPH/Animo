import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { FormCard } from '@/components/animo/form-card';
import { LabeledInput } from '@/components/animo/labeled-input';
import { SegmentedChoice } from '@/components/animo/segmented-choice';
import { SelectField } from '@/components/animo/select-field';
import { SpecificVarietyField } from '@/components/animo/specific-variety-field';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import type { BuyerPreferences, UpsertBuyerPreferencesInput } from '@/types/buyer-preferences';
import {
  HYBRID_SPECIFIC_VARIETY_OPTIONS,
  INBRED_SPECIFIC_VARIETY_OPTIONS,
  MOISTURE_OPTIONS,
  SPECIFIC_VARIETY_OTHER,
  VARIETY_OPTIONS,
  type DeclaredVariety,
  type MoistureType,
  type SpecificVarietyOption,
} from '@/types/crop-listing';

/**
 * Form-local shape: same fields as `UpsertBuyerPreferencesInput`, but
 * `typicalQuantityKg` stays a raw string while being typed (parsed to a
 * number, or `null` when blank, by `buyerPreferencesFormToInput`).
 */
export type BuyerPreferencesFormValues = {
  preferredVariety: DeclaredVariety | null;
  preferredVarietyCode: string | null;
  preferredMoisture: MoistureType | null;
  typicalQuantityKg: string;
};

export const EMPTY_BUYER_PREFERENCES_FORM: BuyerPreferencesFormValues = {
  preferredVariety: null,
  preferredVarietyCode: null,
  preferredMoisture: null,
  typicalQuantityKg: '',
};

/** Seeds the form from a previously saved row (Profile tab re-entry). */
export function buyerPreferencesToForm(prefs: BuyerPreferences | null): BuyerPreferencesFormValues {
  if (!prefs) return EMPTY_BUYER_PREFERENCES_FORM;
  return {
    preferredVariety: prefs.preferredVariety,
    preferredVarietyCode: prefs.preferredVarietyCode,
    preferredMoisture: prefs.preferredMoisture,
    typicalQuantityKg: prefs.typicalQuantityKg === null ? '' : String(prefs.typicalQuantityKg),
  };
}

/**
 * All fields optional — a blank quantity is `null`, never `0`. An empty
 * `preferredVarietyCode` (the form uses `''`, not `null`, to mean "Iba pa is
 * selected but no text typed yet" — see `BuyerPreferencesForm`) collapses to
 * `null` here rather than persisting an empty string.
 */
export function buyerPreferencesFormToInput(
  values: BuyerPreferencesFormValues,
): UpsertBuyerPreferencesInput {
  const parsedQuantity = parseFloat(values.typicalQuantityKg);
  const trimmedVarietyCode = values.preferredVarietyCode?.trim();
  return {
    preferredVariety: values.preferredVariety,
    preferredVarietyCode: trimmedVarietyCode ? trimmedVarietyCode : null,
    preferredMoisture: values.preferredMoisture,
    typicalQuantityKg: Number.isFinite(parsedQuantity) && parsedQuantity > 0 ? parsedQuantity : null,
  };
}

export type BuyerPreferencesFormProps = {
  values: BuyerPreferencesFormValues;
  onChange: (values: BuyerPreferencesFormValues) => void;
};

/**
 * Optional buyer-side preferences: what variety, specific variety, moisture,
 * and typical order size a buyer usually looks for. Storage only — nothing
 * here affects search/ranking. Reused as-is on the onboarding Profile step
 * (register.tsx) and from the buyer Profile tab.
 *
 * Reuses the farmer listing flow's own two-modal variety picker
 * (VARIETY_OPTIONS + INBRED/HYBRID_SPECIFIC_VARIETY_OPTIONS +
 * SpecificVarietyField) rather than a second copy of those lists. Unlike the
 * farmer flow, the specific-variety pick is stored as its actual label text
 * (`preferredVarietyCode`), not reduced to a '218'/'OTHER' price code — that
 * reduction is CROPLISTING's pricing concern, not a buyer preference.
 */
export function BuyerPreferencesForm({ values, onChange }: BuyerPreferencesFormProps) {
  const [specificVarietyOpen, setSpecificVarietyOpen] = useState(false);

  const needsSpecificVariety =
    values.preferredVariety === 'Inbred' || values.preferredVariety === 'Hybrid';
  const specificVarietyOptions: SpecificVarietyOption[] =
    values.preferredVariety === 'Inbred'
      ? INBRED_SPECIFIC_VARIETY_OPTIONS
      : values.preferredVariety === 'Hybrid'
        ? HYBRID_SPECIFIC_VARIETY_OPTIONS
        : [];

  // preferredVarietyCode holds free text, not an option value — resolve back
  // to "which row is checked" by matching label, so a previously saved
  // custom entry (no matching row) falls back to the "Iba pa" row. `''`
  // (distinct from `null`) means "Iba pa picked, nothing typed yet" — using
  // `!== null` here (not a truthiness check) keeps that row checked while
  // the text box is still blank.
  const matchedOption = specificVarietyOptions.find((o) => o.label === values.preferredVarietyCode);
  const specificFieldValue = matchedOption
    ? matchedOption.value
    : values.preferredVarietyCode !== null
      ? SPECIFIC_VARIETY_OTHER
      : null;
  const showCustomVarietyInput = specificFieldValue === SPECIFIC_VARIETY_OTHER;
  const customVarietyText = matchedOption ? '' : values.preferredVarietyCode ?? '';

  return (
    <FormCard title="Kagustuhan sa Pagbili">
      <AnimoText variant="caption" color={AnimoColors.muted}>
        Opsyonal — maaari niyo itong laktawan o baguhin balang araw sa Profile.
      </AnimoText>

      <View>
        <SelectField
          label="Uri ng Palay"
          placeholder="Pumili ng uri ng palay"
          options={VARIETY_OPTIONS}
          value={values.preferredVariety}
          onChange={(value) => {
            const next = value as DeclaredVariety;
            const nextNeedsSpecific = next === 'Inbred' || next === 'Hybrid';
            // Reset on every pick (even Inbred <-> Hybrid) — same as the
            // farmer listing flow's "Uri ng Palay" select (creation-listing.tsx).
            onChange({ ...values, preferredVariety: next, preferredVarietyCode: null });
            setSpecificVarietyOpen(nextNeedsSpecific);
          }}
        />
        {needsSpecificVariety ? (
          <View style={styles.inlineFieldSpacing}>
            <SpecificVarietyField
              label="Tiyak na Uri ng Palay"
              placeholder="Pumili ng tiyak na uri"
              options={specificVarietyOptions}
              value={specificFieldValue}
              open={specificVarietyOpen}
              onOpenChange={setSpecificVarietyOpen}
              onSelect={(option) =>
                onChange({
                  ...values,
                  preferredVarietyCode: option.value === SPECIFIC_VARIETY_OTHER ? '' : option.label,
                })
              }
            />
            {showCustomVarietyInput ? (
              <View style={styles.inlineFieldSpacing}>
                <LabeledInput
                  value={customVarietyText}
                  onChangeText={(text) => onChange({ ...values, preferredVarietyCode: text })}
                  placeholder="Ilagay ang tiyak na uri (opsyonal)"
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <SegmentedChoice
        label="Kagustuhan sa Halumigmig"
        options={MOISTURE_OPTIONS}
        value={values.preferredMoisture}
        onChange={(value) => onChange({ ...values, preferredMoisture: value })}
      />

      <LabeledInput
        label="Karaniwang Dami na Binibili"
        placeholder="0"
        keyboardType="numeric"
        suffixText="kilo/kg"
        value={values.typicalQuantityKg}
        onChangeText={(text) => onChange({ ...values, typicalQuantityKg: text })}
      />
    </FormCard>
  );
}

const styles = StyleSheet.create({
  inlineFieldSpacing: {
    marginTop: AnimoSpacing.sm,
  },
});
