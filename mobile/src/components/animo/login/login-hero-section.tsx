import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AnimoColors, AnimoLoginColors, AnimoSpacing } from '@/constants/animo';

// On a tall phone the arch can breathe; on a short one the form has to win,
// otherwise the sign-in button is pushed off the first screen.
const SHORT_SCREEN_DP = 700;
const ARCH_HEIGHT_TALL = 0.36;
const ARCH_HEIGHT_SHORT = 0.26;
const ARCH_MAX_HEIGHT_DP = 320;
const ARCH_MIN_HEIGHT_DP = 150;
const RING_GAP = 8;

/**
 * Hero for the login phone step: the farm illustration seen through an arch,
 * like a window onto the field. The arch is the one bold shape on the screen;
 * everything below it stays plain white.
 */
export function LoginHeroSection() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const ratio = windowHeight < SHORT_SCREEN_DP ? ARCH_HEIGHT_SHORT : ARCH_HEIGHT_TALL;
  const archHeight = Math.max(
    ARCH_MIN_HEIGHT_DP,
    Math.min(windowHeight * ratio, ARCH_MAX_HEIGHT_DP),
  );
  const archWidth = windowWidth - AnimoSpacing.xl * 2;
  // A true half-circle crown on wide arches, a softer one on narrow/tall ones.
  const crownRadius = Math.min(archWidth / 2, archHeight * 0.7);

  const archOpacity = useSharedValue(0);
  const archTranslate = useSharedValue(16);
  const artTranslate = useSharedValue(28);

  useEffect(() => {
    const out = Easing.out(Easing.cubic);
    archOpacity.value = withTiming(1, { duration: 600, easing: out });
    archTranslate.value = withTiming(0, { duration: 700, easing: out });
    artTranslate.value = withDelay(150, withTiming(0, { duration: 800, easing: out }));
  }, [archOpacity, archTranslate, artTranslate]);

  const archStyle = useAnimatedStyle(() => ({
    opacity: archOpacity.value,
    transform: [{ translateY: archTranslate.value }],
  }));
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: artTranslate.value }],
  }));

  return (
    <View style={styles.wrap}>
      {/* Outline arch, offset from the green one — a second frame around the window. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            borderTopLeftRadius: crownRadius + RING_GAP,
            borderTopRightRadius: crownRadius + RING_GAP,
          },
          archStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.arch,
          {
            height: archHeight,
            borderTopLeftRadius: crownRadius,
            borderTopRightRadius: crownRadius,
          },
          archStyle,
        ]}>
        {/* Green sky with a low sun and faint terrace rows. */}
        <Svg
          style={StyleSheet.absoluteFill}
          width="100%"
          height="100%"
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
          accessibilityElementsHidden>
          <Defs>
            <LinearGradient id="archSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#145A18" />
              <Stop offset="1" stopColor="#2E7D32" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="400" height="300" fill="url(#archSky)" />
          <Circle cx="200" cy="170" r="92" fill="#FBE7A6" opacity={0.2} />
          <Circle cx="200" cy="170" r="58" fill="#FBE7A6" opacity={0.28} />
          {[0, 1, 2].map((i) => (
            <Path
              key={i}
              d="M0 250 C90 222 170 240 250 232 S360 214 400 210"
              transform={`translate(0 ${i * 18})`}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1.5}
            />
          ))}
        </Svg>

        <Animated.View style={[styles.art, artStyle]}>
          <Image
            source={require('@/assets/images/animo/login-banner.png')}
            style={styles.artImage}
            contentFit="contain"
            contentPosition="bottom"
            accessibilityLabel="Mga magsasaka sa bukid"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AnimoSpacing.xl,
    paddingTop: RING_GAP,
    backgroundColor: AnimoColors.background,
  },
  ring: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: AnimoSpacing.xl - RING_GAP,
    right: AnimoSpacing.xl - RING_GAP,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: AnimoColors.accentPrimaryLight,
  },
  arch: {
    width: '100%',
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: AnimoLoginColors.brandGreen,
  },
  art: {
    ...StyleSheet.absoluteFillObject,
    top: 16,
    paddingHorizontal: AnimoSpacing.md,
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
});
