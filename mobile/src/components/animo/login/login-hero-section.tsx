import { Image } from 'expo-image';
import { useWindowDimensions, StyleSheet, View } from 'react-native';

import { AnimoLoginColors, AnimoSpacing } from '@/constants/animo';

const BANNER_ASPECT = 1;
const BANNER_MAX_HEIGHT_RATIO = 0.32;
const BANNER_MAX_HEIGHT_DP = 175;

/** Logo lockup + full-width hero illustration for the login phone step. */
export function LoginHeroSection() {
  const { height: windowHeight } = useWindowDimensions();
  const bannerMaxHeight = Math.min(windowHeight * BANNER_MAX_HEIGHT_RATIO, BANNER_MAX_HEIGHT_DP);

  return (
    <View style={styles.wrap}>
      <View style={styles.logoRow}>
        <Image
          source={require('@/assets/images/animo/Animo-Logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
      <Image
        source={require('@/assets/images/animo/login-banner.png')}
        style={[styles.banner, { maxHeight: bannerMaxHeight }]}
        contentFit="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AnimoLoginColors.pageBackground,
    flexShrink: 1,
  },
  logoRow: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: 0,
    alignItems: 'flex-start',
  },
  logo: {
    width: 151,
    height: 44,
  },
  banner: {
    width: '100%',
    aspectRatio: BANNER_ASPECT,
    marginTop: 0,
  },
});
