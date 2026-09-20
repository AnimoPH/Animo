import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

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

/** Bottom sheet for farmer listing management: Edit / Archive / Delete. */
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.title}>
            Mga Aksyon
          </AnimoText>

          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              onPress={onEdit}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
              <View style={styles.iconWrap}>
                <Pencil size={22} color={AnimoColors.accentPrimary} />
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                I-edit
              </AnimoText>
            </Pressable>
          ) : null}

          {canArchive ? (
            <Pressable
              accessibilityRole="button"
              onPress={onArchive}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
              <View style={styles.iconWrap}>
                <Archive size={22} color={AnimoColors.accentPrimary} />
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                I-archive
              </AnimoText>
            </Pressable>
          ) : null}

          {canDelete ? (
            <Pressable
              accessibilityRole="button"
              onPress={onDelete}
              style={({ pressed }) => [styles.option, styles.optionDanger, pressed && styles.optionPressed]}>
              <View style={[styles.iconWrap, styles.iconWrapDanger]}>
                <Trash2 size={22} color={AnimoColors.danger} />
              </View>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.danger}>
                Tanggalin
              </AnimoText>
            </Pressable>
          ) : null}

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
              Cancel
            </AnimoText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ListingOverflowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Mga aksyon sa listing"
      onPress={onPress}
      hitSlop={12}
      style={styles.overflowButton}>
      <MoreHorizontal size={24} color={AnimoColors.textHighEmphasis} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: AnimoColors.surfacePrimary,
    borderTopLeftRadius: AnimoRadius.lg,
    borderTopRightRadius: AnimoRadius.lg,
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.xl,
    gap: AnimoSpacing.sm,
  },
  title: {
    marginBottom: AnimoSpacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.md,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
  },
  optionDanger: {
    borderColor: AnimoColors.danger,
  },
  optionPressed: {
    backgroundColor: AnimoColors.accentPrimaryLight,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.accentPrimaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: AnimoColors.dangerTint,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: AnimoSpacing.lg,
    marginTop: AnimoSpacing.sm,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.lg,
  },
  overflowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
