import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type PhotoSourceSheetProps = {
  visible: boolean;
  onPickCamera: () => void;
  onPickGallery: () => void;
  onClose: () => void;
};

/**
 * Small chooser sheet for a single photo slot: camera or device gallery.
 * Modal/backdrop/sheet shell follows bid-confirmation-modal.tsx's convention
 * (a centered sheet), not select-field.tsx's scrollable option-row list —
 * this wants 2 large tap targets, not a list.
 */
export function PhotoSourceSheet({
  visible,
  onPickCamera,
  onPickGallery,
  onClose,
}: PhotoSourceSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <AnimoText variant="h3" color={AnimoColors.textHighEmphasis} style={styles.title}>
            Pumili ng Larawan
          </AnimoText>

          <Pressable
            accessibilityRole="button"
            onPress={onPickCamera}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
            <View style={styles.iconWrap}>
              <Camera size={24} color={AnimoColors.accentPrimary} />
            </View>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              Kumuha ng Larawan
            </AnimoText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onPickGallery}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}>
            <View style={styles.iconWrap}>
              <ImageIcon size={24} color={AnimoColors.accentPrimary} />
            </View>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
              Piliin sa Gallery
            </AnimoText>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
              Kanselahin
            </AnimoText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
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
    paddingBottom: AnimoSpacing.xxl,
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
  cancelButton: {
    alignItems: 'center',
    paddingVertical: AnimoSpacing.md,
    marginTop: AnimoSpacing.xs,
  },
});
