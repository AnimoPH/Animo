import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AppHeader } from '@/components/animo/app-header';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';

export type PlaceholderScreenProps = {
  title: string;
  icon: LucideIcon;
  message: string;
};

/** Simple "under construction" screen body for scaffolded (not-yet-built) tabs. */
export function PlaceholderScreen({ title, icon: Icon, message }: PlaceholderScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <AppHeader title={title} />
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Icon size={40} color={AnimoColors.green} strokeWidth={1.5} />
        </View>
        <AnimoText variant="h2" color={AnimoColors.black} style={styles.centerText}>
          Malapit na
        </AnimoText>
        <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.centerText}>
          {message}
        </AnimoText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.xxl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AnimoSpacing.sm,
  },
  centerText: {
    textAlign: 'center',
  },
});
