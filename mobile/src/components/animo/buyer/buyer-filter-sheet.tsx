import { StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { V2Sheet } from '@/components/animo/ui/dialog';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { OptionCard } from '@/components/animo/ui/option-card';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import {
  MOISTURE_OPTIONS,
  VARIETY_OPTIONS,
  type DeclaredVariety,
  type MoistureType,
} from '@/types/crop-listing';

export type BuyerVarietyChoice = 'Lahat' | DeclaredVariety;
export type BuyerMoistureChoice = 'Lahat' | MoistureType;

export type BuyerFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  quantityText: string;
  onQuantityChange: (text: string) => void;
  minPriceText: string;
  onMinPriceChange: (text: string) => void;
  maxPriceText: string;
  onMaxPriceChange: (text: string) => void;
  variety: BuyerVarietyChoice;
  onVarietyChange: (value: BuyerVarietyChoice) => void;
  moisture: BuyerMoistureChoice;
  onMoistureChange: (value: BuyerMoistureChoice) => void;
};

/**
 * v2 buyer filter sheet for Palengke. Same fields and draft state as the old floating window
 * (desired quantity, price range, variety, moisture); the parent still owns apply/reset.
 */
export function BuyerFilterSheet({
  visible,
  onClose,
  onApply,
  onReset,
  quantityText,
  onQuantityChange,
  minPriceText,
  onMinPriceChange,
  maxPriceText,
  onMaxPriceChange,
  variety,
  onVarietyChange,
  moisture,
  onMoistureChange,
}: BuyerFilterSheetProps) {
  const { t, isTagalog } = useLanguage();

  const varietyLabel = (value: DeclaredVariety, fallback: string) =>
    value === 'Traditional_or_Heirloom'
      ? t('buyPalV2.varTraditional')
      : value === 'Mix_of_Varieties'
        ? t('buyPalV2.varMixed')
        : value === 'Others'
          ? t('buyPalV2.varOthers')
          : fallback;

  const moistureChoices: { value: BuyerMoistureChoice; label: string }[] = [
    { value: 'Lahat', label: t('common.all') },
    ...MOISTURE_OPTIONS.map((option) => ({
      value: option.value as BuyerMoistureChoice,
      label: option.value === 'Dry' ? t('buyPalV2.moistDry') : t('buyPalV2.moistWet'),
    })),
  ];

  return (
    <V2Sheet visible={visible} onClose={onClose} title={t('buyPalV2.filterTitle')}>
      <TextField
        label={t('buyPalV2.quantityLabel')}
        hint={t('buyPalV2.quantityHint')}
        suffix="kg"
        keyboardType="numeric"
        placeholder={isTagalog ? 'Halimbawa: 100' : 'e.g. 100'}
        value={quantityText}
        onChangeText={onQuantityChange}
      />

      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('buyPalV2.priceLabel')}</AnimoText>
        <View style={styles.priceRow}>
          <View style={styles.priceField}>
            <TextField
              label={t('buyPalV2.priceMin')}
              suffix="₱"
              keyboardType="numeric"
              placeholder="15"
              value={minPriceText}
              onChangeText={onMinPriceChange}
            />
          </View>
          <View style={styles.priceField}>
            <TextField
              label={t('buyPalV2.priceMax')}
              suffix="₱"
              keyboardType="numeric"
              placeholder="25"
              value={maxPriceText}
              onChangeText={onMaxPriceChange}
            />
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('buyPalV2.varietyLabel')}</AnimoText>
        <View style={styles.chipWrap}>
          <FilterChip
            label={t('common.all')}
            selected={variety === 'Lahat'}
            onPress={() => onVarietyChange('Lahat')}
          />
          {VARIETY_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={varietyLabel(option.value, option.label)}
              selected={variety === option.value}
              onPress={() => onVarietyChange(option.value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('buyPalV2.moistureLabel')}</AnimoText>
        {moistureChoices.map((choice) => (
          <OptionCard
            key={choice.value}
            label={choice.label}
            selected={moisture === choice.value}
            onPress={() => onMoistureChange(choice.value)}
          />
        ))}
      </View>

      <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
        {t('buyPalV2.rankNote')}
      </AnimoText>

      <View style={styles.actions}>
        <ChunkyButton
          label={t('buyPalV2.reset')}
          variant="secondary"
          onPress={onReset}
          style={styles.action}
        />
        <ChunkyButton label={t('buyPalV2.apply')} onPress={onApply} style={styles.action} />
      </View>
    </V2Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: AnimoV2Spacing.sm },
  priceRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  priceField: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  actions: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  action: { flex: 1 },
});
