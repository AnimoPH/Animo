import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay as rnDelay,
  withRepeat as rnRepeat,
  withTiming as rnTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors } from '@/constants/animo';
import { homeRouteForRole } from '@/constants/roles';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';

const MINIMUM_SPLASH_MS = 3000;

// The splash is brief, decorative and runs once, so it plays even when the OS
// or browser asks for reduced motion (Reanimated would otherwise skip it all).
const timing = (
  to: number,
  config: Parameters<typeof rnTiming>[1],
  cb?: Parameters<typeof rnTiming>[2],
): number => rnTiming(to, { ...config, reduceMotion: ReduceMotion.Never }, cb) as unknown as number;
const withDelay = (ms: number, anim: number): number =>
  rnDelay(ms, anim as never, ReduceMotion.Never) as unknown as number;
const repeat = (anim: number, reps: number, reverse: boolean): number =>
  rnRepeat(anim as never, reps, reverse, undefined, ReduceMotion.Never) as unknown as number;

/**
 * Splash screen.
 *
 * The Animo wordmark on a white field with a faint sunrise, and one memorable
 * moment: layered rice-terrace ridges rise from the bottom edge. The front
 * ridge is the same green as the login card, so the splash hands off to it.
 */
const RIDGE_VIEWBOX = { width: 400, height: 240 };

/** One ridge of the terrace: its own SVG so each can rise on its own beat. */
function Ridge({
  height,
  fill,
  d,
  contours = 0,
  animStyle,
}: {
  height: number;
  fill: string;
  d: string;
  /** Number of faint terrace rows drawn below the ridge line. */
  contours?: number;
  animStyle: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View style={[styles.ridge, { height }, animStyle]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${RIDGE_VIEWBOX.width} ${RIDGE_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMax slice"
        accessibilityElementsHidden>
        <Path d={d} fill={fill} />
        {Array.from({ length: contours }, (_, i) => (
          <Path
            key={i}
            d={d.replace(/ L400 240 L0 240 Z$/, '')}
            transform={`translate(0 ${(i + 1) * 15})`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.16)"
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

// Far to near. Each ridge sits lower and darker, so the field recedes into haze.
const RIDGES = [
  { d: 'M0 70 C70 40 140 52 210 62 S340 36 400 44 L400 240 L0 240 Z', fill: '#E3F1E3', contours: 0, rise: 50 },
  { d: 'M0 98 C60 72 130 64 200 84 S340 66 400 56 L400 240 L0 240 Z', fill: AnimoColors.accentPrimaryLight, contours: 1, rise: 64 },
  { d: 'M0 128 C80 100 150 112 230 118 S350 100 400 96 L400 240 L0 240 Z', fill: AnimoColors.greenDisabled, contours: 2, rise: 78 },
  { d: 'M0 160 C70 126 150 132 220 142 S350 122 400 112 L400 240 L0 240 Z', fill: AnimoColors.accentPrimary, contours: 3, rise: 92 },
  { d: 'M0 202 C80 172 160 188 240 180 S360 166 400 160 L400 240 L0 240 Z', fill: AnimoColors.green, contours: 3, rise: 110 },
] as const;

/**
 * Sun in three stacked layers so each can move on its own: a halo that breathes,
 * rays that turn slowly, and a steady core.
 */
function Sun({
  size,
  haloStyle,
  raysStyle,
}: {
  size: number;
  haloStyle: StyleProp<ViewStyle>;
  raysStyle: StyleProp<ViewStyle>;
}) {
  const rays = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const box = { width: size, height: size };
  return (
    <View style={box}>
      <Animated.View style={[StyleSheet.absoluteFill, haloStyle]}>
        <Svg {...box} viewBox="-60 -60 120 120" accessibilityElementsHidden>
          <Circle r={58} fill="#FBE7A6" opacity={0.18} />
          <Circle r={44} fill="#FBE7A6" opacity={0.32} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, raysStyle]}>
        <Svg {...box} viewBox="-60 -60 120 120" accessibilityElementsHidden>
          {rays.map((a, i) => (
            <Path
              key={i}
              d={`M${Math.cos(a) * 33} ${Math.sin(a) * 33} L${Math.cos(a) * (i % 2 ? 40 : 44)} ${Math.sin(a) * (i % 2 ? 40 : 44)}`}
              stroke="#F5C84C"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </Animated.View>
      <View style={StyleSheet.absoluteFill}>
        <Svg {...box} viewBox="-60 -60 120 120" accessibilityElementsHidden>
          <Circle r={26} fill="#F9D56E" />
          <Circle r={26} fill="#FBE7A6" opacity={0.55} cx={-4} cy={-4} />
        </Svg>
      </View>
    </View>
  );
}

const CLOUD_W = 120;

function Cloud({ scale = 1 }: { scale?: number }) {
  return (
    <Svg width={CLOUD_W * scale} height={48 * scale} viewBox="0 0 120 48" accessibilityElementsHidden>
      {/* Flat, single-tone cloud: no highlight or shading, just a soft green shape. */}
      <Ellipse cx={34} cy={32} rx={28} ry={12} fill="#CFE8D0" />
      <Ellipse cx={62} cy={24} rx={26} ry={17} fill="#CFE8D0" />
      <Ellipse cx={90} cy={32} rx={26} ry={12} fill="#CFE8D0" />
      <Ellipse cx={62} cy={34} rx={44} ry={11} fill="#CFE8D0" />
    </Svg>
  );
}

// Mostly along the top of the sky, each at its own size, pace and starting point.
const CLOUDS = [
  { top: 0.03, scale: 1.15, phase: 0.55, opacity: 0.95 },
  { top: 0.075, scale: 0.7, phase: 0.05, opacity: 0.8 },
  { top: 0.045, scale: 0.9, phase: 0.82, opacity: 0.9 },
  { top: 0.12, scale: 0.95, phase: 0.3, opacity: 0.9 },
  { top: 0.19, scale: 0.7, phase: 0.72, opacity: 0.7 },
] as const;

function DriftingCloud({
  drift,
  travel,
  top,
  scale,
  phase,
  opacity,
}: {
  drift: SharedValue<number>;
  travel: number;
  top: number;
  scale: number;
  phase: number;
  opacity: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: ((drift.value + phase) % 1) * travel - CLOUD_W * 1.2 }],
  }));
  return (
    <Animated.View style={[styles.sky, { top, opacity }, style]}>
      <Cloud scale={scale} />
    </Animated.View>
  );
}

/**
 * One bird in profile, facing left. The body is static; the wings are separate
 * layers hinged at the shoulder so they can really beat up and down.
 */
function Bird({
  scale = 1,
  nearWing,
  farWing,
}: {
  scale?: number;
  nearWing: StyleProp<ViewStyle>;
  farWing: StyleProp<ViewStyle>;
}) {
  const ink = '#1A6E1E';
  const wing = 'M20 20 Q21 4 40 1 Q33 12 29 20 Z';
  return (
    <View style={{ width: 46 * scale, height: 30 * scale }}>
      <View style={{ width: 46, height: 30, transform: [{ scale }], transformOrigin: 'top left' }}>
        {/* Far wing sits behind the body, a touch paler. */}
        <Animated.View style={[styles.wingBox, { left: 2 }, farWing]}>
          <Svg width={40} height={40} viewBox="0 0 40 40" accessibilityElementsHidden>
            <Path d={wing} fill={ink} opacity={0.45} />
          </Svg>
        </Animated.View>

        <Svg width={46} height={30} viewBox="0 0 46 30" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
          {/* Tail, body, head, beak. */}
          <Path d="M30 16 L45 11 L43 16 L45 21 Z" fill={ink} opacity={0.85} />
          <Ellipse cx={22} cy={17} rx={12} ry={5.5} fill={ink} opacity={0.9} />
          <Circle cx={10} cy={15} r={4.2} fill={ink} opacity={0.9} />
          <Path d="M6.2 14 L1 16 L6.4 17 Z" fill="#F5C84C" />
          <Circle cx={9} cy={14} r={0.9} fill="#FFFFFF" />
        </Svg>

        <Animated.View style={[styles.wingBox, { left: -1 }, nearWing]}>
          <Svg width={40} height={40} viewBox="0 0 40 40" accessibilityElementsHidden>
            <Path d={wing} fill={ink} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

// V formation, leader first. x/y are offsets in dp from the leader.
const FLOCK = [
  { x: 0, y: 24, scale: 1, beat: 0 },
  { x: 40, y: 6, scale: 0.85, beat: 0.18 },
  { x: 40, y: 44, scale: 0.85, beat: 0.36 },
  { x: 78, y: -10, scale: 0.7, beat: 0.55 },
  { x: 78, y: 62, scale: 0.7, beat: 0.73 },
] as const;

function FlockBird({
  flap,
  beat,
  scale,
}: {
  flap: SharedValue<number>;
  beat: number;
  scale: number;
}) {
  // `flap` loops 0→1 once per wingbeat; each bird is offset so they never sync.
  const wing = (lag: number) => {
    'worklet';
    const v = 0.5 + 0.5 * Math.sin((flap.value + beat) * Math.PI * 2);
    return { transform: [{ rotate: `${-35 + v * 120 - lag}deg` }] };
  };
  const near = useAnimatedStyle(() => wing(0));
  const far = useAnimatedStyle(() => wing(14));
  return <Bird scale={scale} nearWing={near} farWing={far} />;
}

function Flock({ flap }: { flap: SharedValue<number> }) {
  return (
    <View style={styles.flock}>
      {FLOCK.map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.x, top: b.y }}>
          <FlockBird flap={flap} beat={b.beat} scale={b.scale} />
        </View>
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const { status, account } = useSession();
  const { t } = useLanguage();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const hasNavigated = useRef(false);

  // The terrace keeps its proportions on tablets and stays modest on short phones.
  const ridgeHeight = Math.min(
    windowHeight * 0.4,
    (windowWidth * RIDGE_VIEWBOX.height) / RIDGE_VIEWBOX.width,
  );

  const sunSize = Math.min(150, windowWidth * 0.36);

  const logoOpacity = useSharedValue(0);
  const logoTranslate = useSharedValue(14);
  const logoScale = useSharedValue(0.94);
  const tagOpacity = useSharedValue(0);
  const washOpacity = useSharedValue(0);
  const sunRise = useSharedValue(0);
  // Ambient loops that keep the scene alive after the entrance.
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  const sway = useSharedValue(0);
  const drift = useSharedValue(0);
  const fly = useSharedValue(0);
  const flap = useSharedValue(0);
  const r0 = useSharedValue(0);
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);
  const r4 = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  const navigateToDestination = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;

    // No animation callback: it would run on the UI thread, where router.replace
    // is not callable and the release build crashes when the fade ends.
    const FADE_MS = 450;
    screenOpacity.value = timing(0, { duration: FADE_MS, easing: Easing.inOut(Easing.ease) });
    setTimeout(() => {
      if (status === 'authenticated' && account) {
        router.replace(homeRouteForRole(account.role));
      } else {
        router.replace('/login');
      }
    }, FADE_MS);
  }, [account, screenOpacity, status]);

  // One orchestrated entrance: the wash warms, the mark settles, then the
  // ridges rise back-to-front and the tagline arrives last.
  useEffect(() => {
    const out = Easing.out(Easing.cubic);

    washOpacity.value = timing(1, { duration: 900, easing: Easing.out(Easing.ease) });
    logoOpacity.value = timing(1, { duration: 700, easing: out });
    logoTranslate.value = timing(0, { duration: 800, easing: out });
    logoScale.value = timing(1, { duration: 900, easing: out });

    // The sun climbs first, then the ridges follow far to near.
    sunRise.value = withDelay(150, timing(1, { duration: 1500, easing: out }));
    [r0, r1, r2, r3, r4].forEach((r, i) => {
      r.value = withDelay(250 + i * 130, timing(1, { duration: 900, easing: out }));
    });
    tagOpacity.value = withDelay(1000, timing(1, { duration: 600, easing: out }));

    // Ambient life: rays turn, halo breathes, ridges sway, clouds and birds drift.
    const inOut = Easing.inOut(Easing.sin);
    spin.value = repeat(timing(1, { duration: 12000, easing: Easing.linear }), -1, false);
    pulse.value = repeat(timing(1, { duration: 1700, easing: inOut }), -1, true);
    sway.value = repeat(timing(1, { duration: 2400, easing: inOut }), -1, true);
    drift.value = repeat(timing(1, { duration: 20000, easing: Easing.linear }), -1, false);
    fly.value = withDelay(900, repeat(timing(1, { duration: 7000, easing: Easing.linear }), -1, false));
    flap.value = repeat(timing(1, { duration: 700, easing: Easing.linear }), -1, false);
  }, [
    drift,
    flap,
    fly,
    pulse,
    spin,
    sway,
    logoOpacity,
    logoScale,
    logoTranslate,
    r0,
    r1,
    r2,
    r3,
    r4,
    sunRise,
    tagOpacity,
    washOpacity,
  ]);

  // Leave once the minimum dwell has passed and the session has hydrated.
  useEffect(() => {
    if (status === 'loading') return;

    const timer = setTimeout(navigateToDestination, MINIMUM_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [status, navigateToDestination]);

  const screenAnimStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const washAnimStyle = useAnimatedStyle(() => ({ opacity: washOpacity.value }));
  const tagAnimStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));
  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslate.value }, { scale: logoScale.value }],
  }));

  const riseStyle = (value: typeof r0, distance: number, amplitude: number) => {
    'worklet';
    return {
      opacity: value.value,
      transform: [
        { translateX: (sway.value - 0.5) * 2 * amplitude },
        { translateY: (1 - value.value) * distance },
      ],
    };
  };
  // Near ridges sway further than far ones, which reads as depth.
  const ridgeStyles = [
    useAnimatedStyle(() => riseStyle(r0, RIDGES[0].rise, 3)),
    useAnimatedStyle(() => riseStyle(r1, RIDGES[1].rise, 5)),
    useAnimatedStyle(() => riseStyle(r2, RIDGES[2].rise, 7)),
    useAnimatedStyle(() => riseStyle(r3, RIDGES[3].rise, 9)),
    useAnimatedStyle(() => riseStyle(r4, RIDGES[4].rise, 11)),
  ];
  const sunAnimStyle = useAnimatedStyle(() => ({
    opacity: sunRise.value,
    transform: [{ translateY: (1 - sunRise.value) * 90 }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + pulse.value * 0.25,
    transform: [{ scale: 1 + pulse.value * 0.1 }],
  }));
  const raysStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const travel = windowWidth + CLOUD_W * 2;
  const birdsStyle = useAnimatedStyle(() => ({
    opacity: fly.value > 0 ? 1 : 0,
    transform: [
      { translateX: windowWidth + 20 - fly.value * (windowWidth + 110) },
      { translateY: Math.sin(fly.value * Math.PI * 2) * 10 },
    ],
  }));

  return (
    <Pressable
      style={styles.container}
      onPress={() => {
        if (status !== 'loading') navigateToDestination();
      }}
      accessibilityLabel="Animo">
      <Animated.View style={[StyleSheet.absoluteFill, styles.content, screenAnimStyle]}>
        <StatusBar style="dark" />

        {/* Sunrise wash — the same warm horizon the login hero sits in. */}
        <Animated.View style={[StyleSheet.absoluteFill, washAnimStyle]} pointerEvents="none">
          <Svg width="100%" height="100%" accessibilityElementsHidden>
            <Defs>
              <RadialGradient id="splashSunrise" cx="50%" cy="100%" rx="90%" ry="55%">
                <Stop offset="0%" stopColor="#FBE7A6" stopOpacity={0.6} />
                <Stop offset="50%" stopColor="#F5E6BE" stopOpacity={0.28} />
                <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashSunrise)" />
          </Svg>
        </Animated.View>

        {/* Clouds along the top of the sky and a flock of birds crossing it. */}
        <Animated.View style={[StyleSheet.absoluteFill, washAnimStyle]} pointerEvents="none">
          {CLOUDS.map((c, i) => (
            <DriftingCloud
              key={i}
              drift={drift}
              travel={travel}
              top={windowHeight * c.top}
              scale={c.scale}
              phase={c.phase}
              opacity={c.opacity}
            />
          ))}
          <Animated.View style={[styles.sky, { top: windowHeight * 0.17 }, birdsStyle]}>
            <Flock flap={flap} />
          </Animated.View>
        </Animated.View>

        <View style={[styles.hero, { paddingBottom: ridgeHeight * 0.7 }]}>
          <Animated.View style={logoAnimStyle}>
            <Image
              source={require('@/assets/images/animo/Animo-Logo.png')}
              style={styles.logoImage}
              contentFit="contain"
              priority="high"
              accessibilityLabel="Animo"
            />
          </Animated.View>
          <Animated.View style={tagAnimStyle}>
            <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.tagline}>
              {t('landing.tagline')}
            </AnimoText>
          </Animated.View>
        </View>

        <Animated.View
          style={[styles.sun, { bottom: ridgeHeight * 0.62, width: sunSize, height: sunSize }, sunAnimStyle]}
          pointerEvents="none">
          <Sun size={sunSize} haloStyle={haloStyle} raysStyle={raysStyle} />
        </Animated.View>

        {RIDGES.map((ridge, i) => (
          <Ridge
            key={i}
            height={ridgeHeight}
            fill={ridge.fill}
            d={ridge.d}
            contours={ridge.contours}
            animStyle={ridgeStyles[i]}
          />
        ))}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AnimoColors.white,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  hero: {
    alignItems: 'center',
    gap: 14,
  },
  logoImage: {
    width: 252,
    height: 73,
  },
  tagline: {
    textAlign: 'center',
  },
  wingBox: {
    position: 'absolute',
    top: -4,
    width: 40,
    height: 40,
  },
  flock: {
    width: 130,
    height: 100,
  },
  sky: {
    position: 'absolute',
    left: 0,
  },
  sun: {
    position: 'absolute',
    right: '10%',
  },
  ridge: {
    position: 'absolute',
    left: -14,
    right: -14,
    bottom: 0,
  },
});
