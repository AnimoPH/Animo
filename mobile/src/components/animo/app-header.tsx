import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Bell, Globe } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export type AppHeaderProps = {
  /** Optional larger screen title shown under the brand row. */
  title?: string;
  onPressBell?: () => void;
  unreadCount?: number;
  /**
   * When true (default), the header adds its own horizontal padding.
   * Pass false when the parent screen already applies `AnimoLayout.screenGutter`.
   */
  inset?: boolean;
  /** Optional ref for spotlight tour highlight */
  bellRef?: React.RefObject<any>;
  /** Show language toggle pill in header. Default is true. */
  showLanguageToggle?: boolean;
};

/**
 * Top app header used inside the tab modules: the "🌾 Animo" brand lockup with
 * a quick language toggle, a notification bell, and an optional big screen title below it.
 */
export function AppHeader({
  title,
  onPressBell,
  unreadCount = 3,
  inset = true,
  bellRef,
  showLanguageToggle = true,
}: AppHeaderProps) {
  const { language, setLanguage, isTagalog } = useLanguage();
  const handleBellPress = onPressBell || (() => router.push('/(buyer)/notipikasyon'));

  const toggleLanguage = () => {
    setLanguage(language === 'tl' ? 'en' : 'tl');
  };

  return (
    <View style={[styles.wrapper, !inset && styles.wrapperFlush]}>
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.badge}>
            <Image
              source={require('@/assets/images/animo/icon-green.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <AnimoText variant="h1" color={AnimoColors.green}>
            Animo
          </AnimoText>
        </View>

        <View style={styles.rightActions}>
          {showLanguageToggle ? (
            <Pressable
              onPress={toggleLanguage}
              hitSlop={6}
              style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Switch language to ${isTagalog ? 'English' : 'Tagalog'}`}>
              <Globe size={13} color={AnimoColors.green} />
              <AnimoText variant="tag" color={AnimoColors.green} style={styles.langText}>
                {isTagalog ? '🇵🇭 TL' : '🌐 EN'}
              </AnimoText>
            </Pressable>
          ) : null}

          <View ref={bellRef} collapsable={false}>
            <Pressable
              onPress={handleBellPress}
              hitSlop={8}
              style={styles.bell}
              accessibilityLabel="Mga abiso">
              <Bell size={20} color={AnimoColors.black} />
              {unreadCount > 0 && (
                <View style={styles.unreadDot} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {title ? (
        <AnimoText variant="display" color={AnimoColors.black} style={styles.title}>
          {title}
        </AnimoText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.md,
    gap: AnimoSpacing.md,
  },
  wrapperFlush: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 28,
    height: 28,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.greenTint,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: AnimoColors.white,
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoColors.danger,
    borderWidth: 1.5,
    borderColor: AnimoColors.white,
  },
  title: {
    marginTop: AnimoSpacing.xs,
  },
});
