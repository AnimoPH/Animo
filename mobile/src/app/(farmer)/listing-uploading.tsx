import { router, Stack, type Href } from "expo-router";
import { Check, Clock, ShoppingBasket } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { BackHeader } from "@/components/animo/back-header";
import { ProgressSteps } from "@/components/animo/farmer/progress-steps";
import { AnimoText } from "@/components/animo/animo-text";
import {
  AnimoColors,
  AnimoType,
  AnimoSpacing,
  AnimoRadius,
} from "@/constants/animo";

const SCREEN_PADDING = AnimoSpacing.lg;

const RING_SIZE = 140;
const RING_THICKNESS = 8;
const RING_RADIUS = (RING_SIZE - RING_THICKNESS) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Uploading — shown right after "Ipasa na"; animates 0-100% then advances to the result screen. */
export default function ListingUploadingScreen() {
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
      router.replace("/(farmer)/listing-result" as Href);
    });

    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [RING_CIRCUMFERENCE, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          title: "Gumawa ng Listing",
          headerTitleStyle: {
            ...AnimoType.h3,
            color: AnimoColors.textHighEmphasis,
          },
          headerStyle: { backgroundColor: AnimoColors.surfacePrimary },
          headerTintColor: AnimoColors.textHighEmphasis,
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <BackHeader title="Gumawa ng Listing" />

      {/* Progress Bar */}
      <ProgressSteps currentStep={1} />

      <View style={styles.content}>
        <View style={styles.progressWrapper}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={AnimoColors.borderLowEmphasis}
              strokeWidth={RING_THICKNESS}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={AnimoColors.accentPrimary}
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
            <AnimoText variant="h2" color={AnimoColors.accentPrimary}>
              {displayPercent}%
            </AnimoText>
          </View>
        </View>

        <AnimoText
          variant="h1"
          color={AnimoColors.textHighEmphasis}
          style={styles.title}
        >
          Uploading
        </AnimoText>
        <AnimoText
          variant="body"
          color={AnimoColors.textMediumEmphasis}
          style={styles.body}
        >
          Mangyaring maghintay habang pino-proseso ang pag-upload ng iyong palay
          listing sa palengke.
        </AnimoText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AnimoColors.appBackground,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: SCREEN_PADDING,
    paddingVertical: AnimoSpacing.md,
    backgroundColor: AnimoColors.surfacePrimary,
  },
  stepItem: {
    alignItems: "center",
    width: 72,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: AnimoRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleFilled: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  stepCircleUpcoming: {
    borderWidth: 1.5,
    borderColor: AnimoColors.borderLowEmphasis,
    backgroundColor: "transparent",
  },
  stepLabel: {
    marginTop: AnimoSpacing.xs,
    textAlign: "center",
  },
  stepConnector: {
    flex: 1,
    height: 2,
    marginTop: 13,
  },
  stepConnectorDone: {
    backgroundColor: AnimoColors.accentPrimary,
  },
  stepConnectorUpcoming: {
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AnimoColors.appBackground,
  },
  progressWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AnimoSpacing.xl,
  },
  progressCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: AnimoSpacing.sm,
  },
  body: {
    textAlign: "center",
    paddingHorizontal: SCREEN_PADDING,
  },
});
