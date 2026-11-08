import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { FilterChip } from '@/components/animo/ui/filter-chip';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export type PhotoGalleryItem = {
  key: string;
  title: string;
  shortLabel: string;
  subtitle: string;
  url: string | null;
};

const HERO_HEIGHT = 220;
const MODAL_THUMB = 60;

function PhotoFill({ url, contentFit }: { url: string | null; contentFit: 'cover' | 'contain' }) {
  if (url) return <Image source={{ uri: url }} style={styles.fill} contentFit={contentFit} />;
  return (
    <View style={styles.placeholder}>
      <ImageIcon size={32} color={AnimoV2Colors.textTertiary} strokeWidth={2.25} />
    </View>
  );
}

/**
 * v2 three-angle photo gallery: hero photo with an expand button, a row of chips to switch
 * angle, and a full-screen viewer. Presentational: the caller supplies the items.
 */
export function PhotoGallery({ items }: { items: PhotoGalleryItem[] }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [selected, setSelected] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  const active = items[selected] ?? items[0];
  const modalActive = items[modalIndex] ?? items[0];
  if (!active || !modalActive) return null;

  const openAt = (index: number) => {
    setModalIndex(index);
    setModalVisible(true);
  };
  const prev = () => setModalIndex((i) => (i > 0 ? i - 1 : items.length - 1));
  const next = () => setModalIndex((i) => (i < items.length - 1 ? i + 1 : 0));

  return (
    <>
      <View style={styles.gallery}>
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`${t('detailV2.enlargePhoto')}: ${active.title}`}
          onPress={() => openAt(selected)}
          style={styles.hero}>
          <PhotoFill url={active.url} contentFit="cover" />
          <View style={styles.expandButton}>
            <Maximize2 size={18} color={AnimoV2Colors.textOnBrand} strokeWidth={2.5} />
          </View>
        </Pressable>

        <View style={styles.chipRow}>
          {items.map((item, index) => (
            <FilterChip
              key={item.key}
              label={item.shortLabel}
              selected={selected === index}
              onPress={() => setSelected(index)}
            />
          ))}
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[styles.modalTopBar, { paddingTop: Math.max(insets.top, AnimoV2Spacing.xl) + AnimoV2Spacing.md }]}>
            <View style={styles.modalTitleWrap}>
              <AnimoText variant="bodyStrong" color={AnimoV2Colors.textOnBrand}>
                {modalActive.title}
              </AnimoText>
              <AnimoText variant="captionV2" color={AnimoV2Colors.brandLight}>
                {t('detailV2.photoOf', { n: modalIndex + 1, total: items.length })} · {modalActive.subtitle}
              </AnimoText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detailV2.closePhoto')}
              hitSlop={8}
              onPress={() => setModalVisible(false)}
              style={styles.modalIconBtn}>
              <X size={24} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
          </View>

          <View style={styles.modalMain}>
            <PhotoFill url={modalActive.url} contentFit="contain" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detailV2.prevPhoto')}
              hitSlop={8}
              onPress={prev}
              style={[styles.modalIconBtn, styles.navArrow, styles.navLeft]}>
              <ChevronLeft size={26} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('detailV2.nextPhoto')}
              hitSlop={8}
              onPress={next}
              style={[styles.modalIconBtn, styles.navArrow, styles.navRight]}>
              <ChevronRight size={26} color={AnimoV2Colors.textOnBrand} strokeWidth={2.75} />
            </Pressable>
          </View>

          <SafeAreaView style={styles.modalBottom} edges={['bottom']}>
            <View style={styles.modalThumbRow}>
              {items.map((item, index) => {
                const on = modalIndex === index;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={item.title}
                    onPress={() => setModalIndex(index)}
                    style={[styles.modalThumb, on && styles.modalThumbOn]}>
                    <PhotoFill url={item.url} contentFit="cover" />
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  gallery: { gap: AnimoV2Spacing.md },
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    borderRadius: AnimoV2Radius.lg,
    backgroundColor: AnimoV2Colors.surfaceMuted,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderDefault,
  },
  fill: { ...StyleSheet.absoluteFillObject },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoV2Colors.surfaceMuted,
  },
  expandButton: {
    position: 'absolute',
    top: AnimoV2Spacing.md,
    right: AnimoV2Spacing.md,
    width: 36,
    height: 36,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: AnimoV2Spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: AnimoV2Colors.textPrimary, justifyContent: 'space-between' },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoV2Spacing.lg,
    paddingBottom: AnimoV2Spacing.md,
    gap: AnimoV2Spacing.md,
  },
  modalTitleWrap: { flex: 1, gap: 2 },
  modalIconBtn: {
    width: AnimoV2Size.iconButton,
    height: AnimoV2Size.iconButton,
    borderRadius: AnimoV2Radius.full,
    backgroundColor: AnimoV2Colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMain: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: AnimoV2Spacing.sm },
  navArrow: { position: 'absolute', top: '50%' },
  navLeft: { left: AnimoV2Spacing.md },
  navRight: { right: AnimoV2Spacing.md },
  modalBottom: { paddingVertical: AnimoV2Spacing.md, alignItems: 'center' },
  modalThumbRow: { flexDirection: 'row', gap: AnimoV2Spacing.md },
  modalThumb: {
    width: MODAL_THUMB,
    height: MODAL_THUMB,
    borderRadius: AnimoV2Radius.sm,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  modalThumbOn: { borderColor: AnimoV2Colors.actionPrimary },
});
