import { Image } from 'expo-image';
import { Camera, Check, Droplet, Image as ImageIcon, Sun, X, AlertCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { DepthCard } from '@/components/animo/ui/depth-card';
import { V2Sheet } from '@/components/animo/ui/dialog';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { OptionCard } from '@/components/animo/ui/option-card';
import { TextField } from '@/components/animo/ui/text-field';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';
import {
  SPECIFIC_VARIETY_OTHER,
  getMoistureOptions,
  getPurityOptions,
  getVarietyOptions,
  type DeclaredVariety,
  type MoistureType,
  type PhotoType,
  type PurityGrade,
  type SpecificVarietyOption,
} from '@/types/crop-listing';

/** Slot order and short labels follow the v2 prototype (Buong palay, Bago anihin, Butil ng palay). */
const SLOT_ORDER: { value: PhotoType; labelKey: TranslationKey }[] = [
  { value: 'Overview', labelKey: 'wizV2.slotOverview' },
  { value: 'BeforeHarvest', labelKey: 'wizV2.slotBefore' },
  { value: 'AfterHarvestUnsacked', labelKey: 'wizV2.slotGrain' },
];

export type PhotoSlotGridProps = {
  photos: Partial<Record<PhotoType, string>>;
  failedSlots?: PhotoType[];
  onPressSlot: (slot: PhotoType) => void;
  /** Return true when the clear (X) button should show for this slot. */
  canClear?: (slot: PhotoType) => boolean;
  onClear?: (slot: PhotoType) => void;
};

/** Three square photo slots: dashed when empty, solid with a check and label when filled. */
export function PhotoSlotGrid({ photos, failedSlots = [], onPressSlot, canClear, onClear }: PhotoSlotGridProps) {
  const { t } = useLanguage();
  return (
    <View style={styles.photoRow}>
      {SLOT_ORDER.map(({ value, labelKey }) => {
        const uri = photos[value];
        const failed = failedSlots.includes(value);
        const label = t(labelKey);
        return (
          <View key={value} style={styles.photoCell}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: !!uri }}
              onPress={() => onPressSlot(value)}
              style={[
                styles.slot,
                uri ? styles.slotFilled : null,
                failed ? { borderColor: AnimoV2Colors.dangerSolid, borderStyle: 'solid' } : null,
              ]}>
              {uri ? (
                <>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={styles.check}>
                    <Check size={16} color={AnimoV2Colors.textOnBrand} strokeWidth={3.5} />
                  </View>
                  <View style={styles.slotLabelPill}>
                    <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand} numberOfLines={1}>
                      {label}
                    </AnimoText>
                  </View>
                </>
              ) : (
                <>
                  <Camera size={26} color={AnimoV2Colors.textBrand} strokeWidth={2.5} />
                  <AnimoText variant="tagV2" color={AnimoV2Colors.textBrand} style={{ textAlign: 'center' }}>
                    {label}
                  </AnimoText>
                </>
              )}
            </Pressable>
            {uri && onClear && (canClear ? canClear(value) : true) ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('wizV2.clearPhoto', { slot: label })}
                hitSlop={12}
                onPress={() => onClear(value)}
                style={styles.clearBtn}>
                <X size={16} color={AnimoV2Colors.textOnBrand} strokeWidth={3} />
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export type VarietyFieldsProps = {
  variety: DeclaredVariety | '';
  onVarietyChange: (next: DeclaredVariety) => void;
  customVariety: string;
  onCustomVarietyChange: (text: string) => void;
  specificOptions: SpecificVarietyOption[];
  specificVariety: SpecificVarietyOption | null;
  onSpecificSelect: (option: SpecificVarietyOption) => void;
  specificCustom: string;
  onSpecificCustomChange: (text: string) => void;
  editable?: boolean;
};

/** Variety, then (Inbred / Hybrid only) the specific variety, as radio option cards. */
export function VarietyFields({
  variety,
  onVarietyChange,
  customVariety,
  onCustomVarietyChange,
  specificOptions,
  specificVariety,
  onSpecificSelect,
  specificCustom,
  onSpecificCustomChange,
  editable = true,
}: VarietyFieldsProps) {
  const { t, language } = useLanguage();
  const needsSpecific = variety === 'Inbred' || variety === 'Hybrid';
  return (
    <View style={{ gap: AnimoV2Spacing.lg }}>
      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('wizV2.varietyLabel')}</AnimoText>
        {getVarietyOptions(language).map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={variety === option.value}
            onPress={() => onVarietyChange(option.value)}
          />
        ))}
      </View>
      {variety === 'Others' ? (
        <TextField
          label={t('wizV2.customVarietyLabel')}
          value={customVariety}
          onChangeText={onCustomVarietyChange}
          placeholder={t('wizV2.customVarietyPh')}
          editable={editable}
        />
      ) : null}
      {needsSpecific ? (
        <View style={styles.group}>
          <AnimoText variant="bodyStrong">{t('wizV2.specificLabel')}</AnimoText>
          {specificOptions.map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={specificVariety?.value === option.value}
              onPress={() => onSpecificSelect(option)}
            />
          ))}
        </View>
      ) : null}
      {needsSpecific && specificVariety?.value === SPECIFIC_VARIETY_OTHER ? (
        <TextField
          label={t('wizV2.customSpecificLabel')}
          value={specificCustom}
          onChangeText={onSpecificCustomChange}
          placeholder={t('wizV2.customSpecificPh')}
          editable={editable}
        />
      ) : null}
    </View>
  );
}

export type MoistureGradeFieldsProps = {
  moisture: MoistureType;
  onMoistureChange: (next: MoistureType) => void;
  grade: PurityGrade | '';
  onGradeChange: (next: PurityGrade) => void;
};

const GRADE_DESC: Partial<Record<PurityGrade, TranslationKey>> = {
  A: 'wizV2.gradeA',
  B: 'wizV2.gradeB',
  C: 'wizV2.gradeC',
};

/** Moisture (Tuyo / Basa) as two stacked icon cards, purity grade A / B / C as three stacked cards. */
export function MoistureGradeFields({ moisture, onMoistureChange, grade, onGradeChange }: MoistureGradeFieldsProps) {
  const { t, language } = useLanguage();
  const grades = getPurityOptions(language);
  const mainGrades = grades.filter((g) => g.value === 'A' || g.value === 'B' || g.value === 'C');
  const otherGrades = grades.filter((g) => !(g.value === 'A' || g.value === 'B' || g.value === 'C'));
  return (
    <View style={{ gap: AnimoV2Spacing.xl }}>
      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('wizV2.moistureLabel')}</AnimoText>
        <View style={styles.row}>
          {getMoistureOptions(language).map((option) => {
            const selected = moisture === option.value;
            return (
              <OptionCard
                key={option.value}
                layout="stacked"
                label={option.label}
                selected={selected}
                onPress={() => onMoistureChange(option.value)}
                style={styles.flex}>
                <IconTile icon={option.value === 'Dry' ? Sun : Droplet} tone={selected ? 'success' : 'warning'} />
              </OptionCard>
            );
          })}
        </View>
      </View>
      <View style={styles.group}>
        <AnimoText variant="bodyStrong">{t('wizV2.purityLabel')}</AnimoText>
        <View style={styles.row}>
          {mainGrades.map((option) => {
            const descKey = GRADE_DESC[option.value];
            return (
              <OptionCard
                key={option.value}
                layout="stacked"
                label={option.value}
                description={descKey ? t(descKey) : undefined}
                selected={grade === option.value}
                onPress={() => onGradeChange(option.value)}
                style={styles.flex}
              />
            );
          })}
        </View>
        {otherGrades.map((option) => (
          <OptionCard
            key={option.value}
            label={option.label}
            selected={grade === option.value}
            onPress={() => onGradeChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export type WeightFieldsProps = {
  gross: string;
  tare: string;
  onGrossChange: (text: string) => void;
  onTareChange: (text: string) => void;
  net: number;
  editable?: boolean;
};

/** Gross and tare fields with a kg suffix, a live net-weight card, and an inline tare > gross error. */
export function WeightFields({ gross, tare, onGrossChange, onTareChange, net, editable = true }: WeightFieldsProps) {
  const { t } = useLanguage();
  const tareTooHeavy = gross.trim() !== '' && (parseFloat(tare) || 0) > (parseFloat(gross) || 0);
  return (
    <View style={{ gap: AnimoV2Spacing.lg }}>
      <TextField
        label={t('wizV2.grossLabel')}
        value={gross}
        onChangeText={onGrossChange}
        keyboardType="numeric"
        placeholder="0"
        suffix="kg"
        editable={editable}
      />
      <TextField
        label={t('wizV2.tareLabel')}
        value={tare}
        onChangeText={onTareChange}
        keyboardType="numeric"
        placeholder="0"
        suffix="kg"
        editable={editable}
        error={tareTooHeavy ? t('wizV2.tareError') : undefined}
      />
      <DepthCard
        depth="flat"
        radius="lg"
        backgroundColor={AnimoV2Colors.surfaceBrandSubtle}
        borderColor={AnimoV2Colors.actionPrimary}
        style={styles.netCard}>
        <View style={{ flex: 1 }}>
          <AnimoText variant="bodyStrong">{t('wizV2.netLabel')}</AnimoText>
          <AnimoText variant="captionV2" color={AnimoV2Colors.textSecondary}>
            {t('wizV2.netHint')}
          </AnimoText>
        </View>
        <AnimoText variant="heading" color={AnimoV2Colors.textBrand} accessibilityLiveRegion="polite">
          {net.toLocaleString('en-PH')} kg
        </AnimoText>
      </DepthCard>
    </View>
  );
}

export type PhotoSourceSheetV2Props = {
  visible: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onClose: () => void;
};

/** v2 camera / gallery chooser (bottom sheet). The legacy PhotoSourceSheet stays for the buyer. */
export function PhotoSourceSheetV2({ visible, onPickCamera, onPickGallery, onClose }: PhotoSourceSheetV2Props) {
  const { t } = useLanguage();
  return (
    <V2Sheet visible={visible} onClose={onClose} title={t('wizV2.photoSheetTitle')}>
      <View style={{ gap: AnimoV2Spacing.md }}>
        <ChunkyButton label={t('wizV2.photoCamera')} icon={Camera} onPress={onPickCamera} />
        <ChunkyButton label={t('wizV2.photoGallery')} icon={ImageIcon} variant="secondary" onPress={onPickGallery} />
      </View>
    </V2Sheet>
  );
}

/** Inline error line with an icon (never color only). */
export function InlineError({ message }: { message: string }) {
  return (
    <View style={styles.errorRow} accessibilityLiveRegion="polite">
      <AlertCircle size={20} color={AnimoV2Colors.dangerFg} strokeWidth={2.75} />
      <AnimoText variant="bodyStrong" color={AnimoV2Colors.dangerFg} style={{ flex: 1 }}>
        {message}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: AnimoV2Spacing.sm },
  row: { flexDirection: 'row', gap: AnimoV2Spacing.sm, alignItems: 'stretch' },
  flex: { flex: 1 },
  photoRow: { flexDirection: 'row', gap: AnimoV2Spacing.sm },
  photoCell: { flex: 1 },
  slot: {
    aspectRatio: 1,
    borderRadius: AnimoV2Radius.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: AnimoV2Colors.actionPrimary,
    backgroundColor: AnimoV2Colors.surfaceBrandSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
    overflow: 'hidden',
  },
  slotFilled: { borderStyle: 'solid', padding: 0 },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AnimoV2Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotLabelPill: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    backgroundColor: AnimoV2Colors.scrim,
    borderRadius: AnimoV2Radius.full,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AnimoV2Colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  netCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: AnimoV2Spacing.lg,
    gap: AnimoV2Spacing.md,
  },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
});
