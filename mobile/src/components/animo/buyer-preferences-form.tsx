import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Droplet, Sun } from 'lucide-react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { SpecificVarietyField } from '@/components/animo/specific-variety-field';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { OptionCard } from '@/components/animo/ui/option-card';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { BuyerPreferences, UpsertBuyerPreferencesInput } from '@/types/buyer-preferences';
import {
  SPECIFIC_VARIETY_OTHER,
  getHybridSpecificVarieties,
  getInbredSpecificVarieties,
  getMoistureOptions,
  getVarietyOptions,
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
 * and typical order size a buyer usually looks for. Storage only: nothing
 * here affects search/ranking. v2 look (option cards, 56px fields).
 */
export function BuyerPreferencesForm({ values, onChange }: BuyerPreferencesFormProps) {
  const { t, language } = useLanguage();
  const [specificVarietyOpen, setSpecificVarietyOpen] = useState(false);

  const needsSpecificVariety =
    values.preferredVariety === 'Inbred' || values.preferredVariety === 'Hybrid';
  const specificVarietyOptions: SpecificVarietyOption[] =
    values.preferredVariety === 'Inbred'
      ? getInbredSpecificVarieties(language)
      : values.preferredVariety === 'Hybrid'
        ? getHybridSpecificVarieties(language)
        : [];

  // preferredVarietyCode holds free text, not an option value: resolve back
  // to "which row is checked" by matching label, so a previously saved
  // custom entry (no matching row) falls back to the "Iba pa" row. `''`
  // (distinct from `null`) means "Iba pa picked, nothing typed yet".
  const matchedOption = specificVarietyOptions.find((o) => o.label === values.preferredVarietyCode);
  const specificFieldValue = matchedOption
    ? matchedOption.value
    : values.preferredVarietyCode !== null
      ? SPECIFIC_VARIETY_OTHER
      : null;
  const showCustomVarietyInput = specificFieldValue === SPECIFIC_VARIETY_OTHER;
  const customVarietyText = matchedOption ? '' : values.preferredVarietyCode ?? '';

  return (
    <View style={styles.form}>
      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
        {t('buyProfileV2.prefOptional')}
      </AnimoText>

      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('buyProfileV2.prefVariety')}</AnimoText>
        {getVarietyOptions(language).map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={values.preferredVariety === option.value}
            onPress={() => {
              const next = option.value as DeclaredVariety;
              const nextNeedsSpecific = next === 'Inbred' || next === 'Hybrid';
              // Reset on every pick (even Inbred <-> Hybrid), same as the farmer listing flow.
              onChange({ ...values, preferredVariety: next, preferredVarietyCode: null });
              setSpecificVarietyOpen(nextNeedsSpecific);
            }}
          />
        ))}
      </View>

      {needsSpecificVariety ? (
        <View style={styles.group}>
          <SpecificVarietyField
            label={t('buyProfileV2.prefSpecific')}
            placeholder={t('buyProfileV2.prefPickSpecific')}
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
            <TextField
              label={t('buyProfileV2.prefSpecific')}
              value={customVarietyText}
              onChangeText={(text) => onChange({ ...values, preferredVarietyCode: text })}
              placeholder={t('buyProfileV2.prefCustom')}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('buyProfileV2.prefMoisture')}</AnimoText>
        <View style={styles.moistureRow}>
          {getMoistureOptions(language).map((option) => {
            const selected = values.preferredMoisture === option.value;
            return (
              <OptionCard
                key={option.value}
                layout="stacked"
                label={option.label}
                selected={selected}
                style={styles.moistureCard}
                onPress={() => onChange({ ...values, preferredMoisture: option.value })}>
                <IconTile icon={option.value === 'Dry' ? Sun : Droplet} tone={selected ? 'success' : 'warning'} />
              </OptionCard>
            );
          })}
        </View>
      </View>

      <TextField
        label={t('buyProfileV2.prefQty')}
        placeholder="0"
        keyboardType="numeric"
        suffix={t('buyProfileV2.prefQtyUnit')}
        value={values.typicalQuantityKg}
        onChangeText={(text) => onChange({ ...values, typicalQuantityKg: text })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: AnimoV2Spacing.lg },
  group: { gap: AnimoV2Spacing.sm },
  moistureRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm, alignItems: 'stretch' },
  moistureCard: { flex: 1 },
});
