import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AnimoV2Colors } from '@/constants/animo';

const COLORS = [
  AnimoV2Colors.actionPrimary,
  AnimoV2Colors.warningSolid,
  AnimoV2Colors.brandMid,
  AnimoV2Colors.cautionSolid,
  AnimoV2Colors.brandLight,
];

const PIECE_COUNT = 26;
const FALL_MS = 2600;

function Piece({ index, height }: { index: number; height: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      (index % 9) * 120,
      withTiming(1, { duration: FALL_MS, easing: Easing.in(Easing.quad) }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value >= 1 ? 0 : 1,
    transform: [{ translateY: progress.value * (height + 40) }, { rotate: `${progress.value * 540 + index * 23}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        { left: `${(index * 37) % 100}%`, backgroundColor: COLORS[index % COLORS.length] },
        style,
      ]}
    />
  );
}

/** Falling confetti for the listing-published celebration. Renders nothing when reduced motion is on. */
export function Confetti() {
  const { height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pieces = useMemo(() => Array.from({ length: PIECE_COUNT }, (_, i) => i), []);

  if (reduceMotion !== false) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false} importantForAccessibility="no-hide-descendants">
      {pieces.map((i) => (
        <Piece key={i} index={i} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: -20, width: 10, height: 16, borderRadius: 3 },
});
