import { Image } from 'expo-image';
import { useEffect } from 'react';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Rect, Stop, RadialGradient } from 'react-native-svg';

import { AnimoLoginColors } from '@/constants/animo';

// On a tall phone the artwork can breathe; on a short one the form has to win,
// otherwise the sign-in button is pushed off the first screen.
const HERO_HEIGHT_RATIO_TALL = 0.42;
const HERO_HEIGHT_RATIO_SHORT = 0.3;
const SHORT_SCREEN_DP = 700;
const HERO_MAX_HEIGHT_DP = 340;
const HERO_MIN_HEIGHT_DP = 150;

/**
 * Logo lockup + full-width hero illustration for the login phone step.
 *
 * A soft sunrise wash sits behind the artwork so the illustration reads as part
 * of a warm scene rather than a sticker on flat grey, and so the page carries
 * colour down into the green card instead of meeting it at a hard seam.
 */
export function LoginHeroSection() {
  const { height: windowHeight } = useWindowDimensions();
  const ratio =
    windowHeight < SHORT_SCREEN_DP ? HERO_HEIGHT_RATIO_SHORT : HERO_HEIGHT_RATIO_TALL;
  const heroHeight = Math.max(
    HERO_MIN_HEIGHT_DP,
    Math.min(windowHeight * ratio, HERO_MAX_HEIGHT_DP),
  );

  // The scene settles in rather than snapping — a gentle rise, once.
  const artOpacity = useSharedValue(0);
  const artTranslate = useSharedValue(12);
  const washOpacity = useSharedValue(0);

  useEffect(() => {
    washOpacity.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.ease),
    });
    artOpacity.value = withDelay(
      90,
      withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );
    artTranslate.value = withDelay(
      90,
      withTiming(0, { duration: 760, easing: Easing.out(Easing.cubic) }),
    );
  }, [artOpacity, artTranslate, washOpacity]);

  const washStyle = useAnimatedStyle(() => ({ opacity: washOpacity.value }));
  const artStyle = useAnimatedStyle(() => ({
    opacity: artOpacity.value,
    transform: [{ translateY: artTranslate.value }],
  }));

  return (
    <View style={[styles.wrap, { height: heroHeight }]}>
      {/* Sunrise wash: warm at the horizon, clearing toward the top. */}
      <Animated.View style={[StyleSheet.absoluteFill, washStyle]} pointerEvents="none">
        <Svg width="100%" height="100%" accessibilityElementsHidden>
          <Defs>
            <RadialGradient id="loginSunrise" cx="50%" cy="88%" rx="78%" ry="62%">
              <Stop offset="0%" stopColor="#FBE7A6" stopOpacity={0.72} />
              <Stop offset="45%" stopColor="#F5E6BE" stopOpacity={0.4} />
              <Stop offset="100%" stopColor={AnimoLoginColors.pageBackground} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#loginSunrise)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.bannerWrap, artStyle]}>
        <Image
          source={require('@/assets/images/animo/login-banner.png')}
          style={styles.bannerImage}
          contentFit="contain"
          contentPosition="bottom"
          accessibilityLabel="Mga magsasaka sa bukid"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: AnimoLoginColors.pageBackground,
    flexShrink: 1,
    flexGrow: 0,
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
