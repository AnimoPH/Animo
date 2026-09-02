import { Image } from 'expo-image';
import { useWindowDimensions, StyleSheet, View } from 'react-native';

import { AnimoLoginColors, AnimoSpacing } from '@/constants/animo';

const HERO_HEIGHT_RATIO = 0.5;
const HERO_MAX_HEIGHT_DP = 400;

/** Logo lockup + full-width hero illustration for the login phone step. */
export function LoginHeroSection() {
  const { height: windowHeight } = useWindowDimensions();
  const heroHeight = Math.min(windowHeight * HERO_HEIGHT_RATIO, HERO_MAX_HEIGHT_DP);

  return (
    <View style={[styles.wrap, { height: heroHeight }]}>
      <View style={styles.logoRow}>
        <Image
          source={require('@/assets/images/animo/Animo-Logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
      <View style={styles.bannerWrap}>
        <Image
          source={require('@/assets/images/animo/login-banner.png')}
          style={styles.bannerImage}
          contentFit="contain"
          contentPosition="bottom"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AnimoLoginColors.pageBackground,
    flexShrink: 1,
    flexGrow: 0,
  },
  logoRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: 0,
    alignItems: 'flex-start',
  },
  logo: {
    width: 150,
    height: 44,
  },
  bannerWrap: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
});
