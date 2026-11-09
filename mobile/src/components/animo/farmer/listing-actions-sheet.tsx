import { Archive, MoreHorizontal, Pencil, Trash2, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { V2Sheet } from '@/components/animo/ui/dialog';
import { IconButton } from '@/components/animo/ui/screen-bits';
import { IconTile } from '@/components/animo/ui/icon-tile';
import { ChunkyButton } from '@/components/animo/ui/chunky-button';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';

export type ListingActionsSheetProps = {
  visible: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canArchive: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onClose: () => void;
};

function ActionRow({
  icon,
  labelKey,
  onPress,
  danger,
}: {
  icon: LucideIcon;
  labelKey: TranslationKey;
  onPress: () => void;
  danger?: boolean;
}) {
  const { t } = useLanguage();
  const label = t(labelKey);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        danger && styles.optionDanger,
        pressed && styles.optionPressed,
      ]}>
      <IconTile icon={icon} tone={danger ? 'danger' : 'success'} size={40} />
      <AnimoText variant="bodyStrong" color={danger ? AnimoV2Colors.dangerFg : AnimoV2Colors.textPrimary}>
        {label}
      </AnimoText>
    </Pressable>
  );
}

/** Bottom sheet for farmer listing management: Edit / Archive / Delete (existing actions only). */
export function ListingActionsSheet({
  visible,
  canDelete,
  canEdit,
  canArchive,
  onEdit,
  onArchive,
  onDelete,
  onClose,
}: ListingActionsSheetProps) {
  const { t } = useLanguage();
  return (
    <V2Sheet visible={visible} onClose={onClose} title={t('actionsV2.title')}>
      <View style={{ gap: AnimoV2Spacing.md }}>
        {canEdit ? <ActionRow icon={Pencil} labelKey="actionsV2.edit" onPress={onEdit} /> : null}
        {canArchive ? <ActionRow icon={Archive} labelKey="detailV2.archive" onPress={onArchive} /> : null}
        {canDelete ? <ActionRow icon={Trash2} labelKey="detailV2.delete" onPress={onDelete} danger /> : null}
      </View>
      <ChunkyButton variant="secondary" label={t('actionsV2.close')} onPress={onClose} />
    </V2Sheet>
  );
}

export function ListingOverflowButton({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  return (
    <IconButton
      icon={<MoreHorizontal size={26} color={AnimoV2Colors.textPrimary} strokeWidth={2.5} />}
      label={t('actionsV2.overflow')}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.md,
    minHeight: 64,
    borderRadius: AnimoV2Radius.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
    borderBottomColor: AnimoV2Colors.edgeSoft,
    borderBottomWidth: 4,
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingVertical: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  optionDanger: { borderColor: AnimoV2Colors.dangerSolid, borderBottomColor: AnimoV2Colors.dangerFg },
  optionPressed: { backgroundColor: AnimoV2Colors.surfaceBrandSubtle },
});
