import { Image } from 'expo-image';
import { Globe } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export type BrandHeaderProps = {
  showLanguageToggle?: boolean;
};

/** Small "🌾 Animo" lockup shown at the top of onboarding screens with optional language switcher. */
export function BrandHeader({ showLanguageToggle = true }: BrandHeaderProps) {
  const { language, setLanguage, isTagalog } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'tl' ? 'en' : 'tl');
  };

  return (
    <View style={styles.headerRow}>
      <View style={styles.brand}>
        <View style={styles.badge}>
          <Image
            source={require('@/assets/images/animo/icon-green.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <AnimoText variant="h2" color={AnimoColors.green}>
          Animo
        </AnimoText>
      </View>

      {showLanguageToggle ? (
        <Pressable
          onPress={toggleLanguage}
          hitSlop={8}
          style={({ pressed }) => [styles.langPill, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Switch language to ${isTagalog ? 'English' : 'Tagalog'}`}>
          <Globe size={13} color={AnimoColors.green} />
          <AnimoText variant="tag" color={AnimoColors.green} style={styles.langText}>
            {isTagalog ? '🇵🇭 Tagalog' : '🌐 English'}
          </AnimoText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
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
});
