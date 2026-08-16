import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';

export type BackHeaderProps = {
  title: string;
  /** Defaults to router.back(). */
  onBack?: () => void;
};

/** Back-arrow header with a left-aligned title (advisory, listing detail, create-listing screens). */
export function BackHeader({ title, onBack }: BackHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
        style={styles.backButton}
        accessibilityLabel="Bumalik">
        <ChevronLeft size={24} color={AnimoColors.textHighEmphasis} />
      </Pressable>
      <AnimoText variant="h3" color={AnimoColors.textHighEmphasis}>
        {title}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
    // backgroundColor: AnimoColors.surfacePrimary,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
