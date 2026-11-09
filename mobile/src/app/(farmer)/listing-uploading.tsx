import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AnimoText } from "@/components/animo/animo-text";
import { AnimoV2Colors, AnimoV2Spacing } from "@/constants/animo";
import { useLanguage } from "@/hooks/use-language";

const RING_SIZE = 140;
const RING_THICKNESS = 12;
const RING_RADIUS = (RING_SIZE - RING_THICKNESS) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Uploading — shown right after publishing; animates 0-100% then advances to the result screen. */
export default function ListingUploadingScreen() {
  const { t } = useLanguage();
  const { listingId, price } = useLocalSearchParams<{
    listingId?: string;
    price?: string;
  }>();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setDisplayPercent(Math.round(value * 100));
    });

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      router.replace({
        pathname: "/(farmer)/listing-result",
        params: { listingId: listingId ?? "", price: price ?? "" },
      });
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim, listingId, price]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.screen}>
      <View
        style={styles.progressWrapper}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t("listing.uploadingTitle")}
        accessibilityValue={{ min: 0, max: 100, now: displayPercent }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={AnimoV2Colors.borderDefault}
            strokeWidth={RING_THICKNESS}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={AnimoV2Colors.actionPrimary}
            strokeWidth={RING_THICKNESS}
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            rotation="-90"
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          />
        </Svg>
        <View style={styles.progressCenter}>
          <AnimoText variant="title" color={AnimoV2Colors.textBrand}>
            {displayPercent}%
          </AnimoText>
        </View>
      </View>

      <AnimoText variant="title" style={styles.title} accessibilityRole="header">
        {t("listing.uploadingTitle")}
      </AnimoText>
      <AnimoText variant="bodyV2" color={AnimoV2Colors.textSecondary} style={styles.body}>
        {t("listing.uploadingSubtitle")}
      </AnimoText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoV2Colors.surfaceApp,
    paddingHorizontal: AnimoV2Spacing.xl,
  },
  progressWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AnimoV2Spacing.xl,
  },
  progressCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { textAlign: "center", marginBottom: AnimoV2Spacing.sm },
  body: { textAlign: "center" },
});
