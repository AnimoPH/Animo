import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
  onApply: () => void;
  activeCount?: number;
  children: ReactNode;
  title?: string;
};

/**
 * Floating filter window chrome. The parent owns draft vs applied state
 * and supplies the field content as `children`.
 */
export function FilterModal({
  visible,
  onClose,
  onReset,
  onApply,
  activeCount = 0,
  children,
  title = 'Mga Filter',
}: FilterModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.floatingWindow} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <SlidersHorizontal size={20} color={AnimoColors.accentPrimary} />
              <AnimoText variant="h2" color={AnimoColors.textHighEmphasis}>
                {title}
              </AnimoText>
              {activeCount > 0 ? (
                <View style={styles.modalActiveBadge}>
                  <AnimoText variant="caption" color={AnimoColors.accentPrimary}>
                    {activeCount} aktibo
                  </AnimoText>
                </View>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Isara"
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}>
              <X size={20} color={AnimoColors.objectMediumEmphasis} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable accessibilityRole="button" onPress={onReset} style={styles.resetButton}>
              <AnimoText variant="button" color={AnimoColors.textHighEmphasis}>
                Clear All
              </AnimoText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onApply} style={styles.applyButton}>
              <AnimoText variant="button" color={AnimoColors.white}>
                Apply Filter
              </AnimoText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.xl,
  },
  floatingWindow: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AnimoColors.borderLowEmphasis,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  modalActiveBadge: {
    backgroundColor: AnimoColors.accentPrimaryLight,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 2,
    borderRadius: AnimoRadius.pill,
    marginLeft: AnimoSpacing.xs,
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollContent: {
    padding: AnimoSpacing.lg,
    gap: AnimoSpacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
    gap: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfaceSecondary,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: AnimoRadius.md,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
