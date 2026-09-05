import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Flame,
  LayoutGrid,
  ShoppingBag,
  Sparkles,
  Sprout,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export const TUTORIAL_STORAGE_KEY = 'animo.hasSeenTutorial';
export const FARMER_TUTORIAL_STORAGE_KEY = 'animo.hasSeenFarmerTutorial';

export type SpotlightStep = {
  id: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  targetRef?: React.RefObject<any>;
  fallbackLayout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  shape?: 'rectangle' | 'circle' | 'pill';
  borderRadius?: number;
  padding?: number;
  scrollTargetY?: number;
};

export type SpotlightTourProps = {
  visible: boolean;
  onClose: () => void;
  role?: 'magsasaka' | 'mamimili';
  steps?: SpotlightStep[];
  scrollViewRef?: React.RefObject<any>;
  storageKey?: string;
};

interface TargetLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SpotlightTour({
  visible,
  onClose,
  role = 'mamimili',
  steps: customSteps,
  scrollViewRef,
  storageKey,
}: SpotlightTourProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { t } = useLanguage();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [measuredLayout, setMeasuredLayout] = useState<TargetLayout | null>(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;

  const isFarmer = role === 'magsasaka';
  const effectiveStorageKey =
    storageKey || (isFarmer ? FARMER_TUTORIAL_STORAGE_KEY : TUTORIAL_STORAGE_KEY);

  // Setup default steps for Farmer & Buyer if not provided
  const defaultSteps: SpotlightStep[] = isFarmer
    ? [
        {
          id: 'farmer-advisory',
          title: t('spotlight.farmer.step1Title'),
          description: t('spotlight.farmer.step1Desc'),
          icon: CloudRain,
          shape: 'rectangle',
          borderRadius: 20,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 90,
            width: windowWidth - 32,
            height: 120,
          },
        },
        {
          id: 'farmer-stats',
          title: t('spotlight.farmer.step2Title'),
          description: t('spotlight.farmer.step2Desc'),
          icon: LayoutGrid,
          shape: 'rectangle',
          borderRadius: 16,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 225,
            width: windowWidth - 32,
            height: 90,
          },
        },
        {
          id: 'farmer-sell-cta',
          title: t('spotlight.farmer.step3Title'),
          description: t('spotlight.farmer.step3Desc'),
          icon: Sprout,
          shape: 'rectangle',
          borderRadius: 20,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 330,
            width: windowWidth - 32,
            height: 100,
          },
        },
        {
          id: 'farmer-bell',
          title: t('spotlight.farmer.step4Title'),
          description: t('spotlight.farmer.step4Desc'),
          icon: Bell,
          shape: 'circle',
          padding: 6,
          fallbackLayout: {
            x: windowWidth - 62,
            y: 44,
            width: 44,
            height: 44,
          },
        },
      ]
    : [
        {
          id: 'buyer-market-trends',
          title: t('spotlight.buyer.step1Title'),
          description: t('spotlight.buyer.step1Desc'),
          icon: Flame,
          shape: 'rectangle',
          borderRadius: 20,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 140,
            width: windowWidth - 32,
            height: 160,
          },
        },
        {
          id: 'buyer-quick-actions',
          title: t('spotlight.buyer.step2Title'),
          description: t('spotlight.buyer.step2Desc'),
          icon: ShoppingBag,
          shape: 'rectangle',
          borderRadius: 16,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 315,
            width: windowWidth - 32,
            height: 80,
          },
        },
        {
          id: 'buyer-varieties',
          title: t('spotlight.buyer.step3Title'),
          description: t('spotlight.buyer.step3Desc'),
          icon: Wheat,
          shape: 'rectangle',
          borderRadius: 20,
          padding: 6,
          fallbackLayout: {
            x: 16,
            y: 410,
            width: windowWidth - 32,
            height: 170,
          },
        },
        {
          id: 'buyer-bell',
          title: t('spotlight.buyer.step4Title'),
          description: t('spotlight.buyer.step4Desc'),
          icon: Bell,
          shape: 'circle',
          padding: 6,
          fallbackLayout: {
            x: windowWidth - 62,
            y: 44,
            width: 44,
            height: 44,
          },
        },
      ];

  const steps = customSteps && customSteps.length > 0 ? customSteps : defaultSteps;
  const currentStep = steps[currentStepIndex] || steps[0];

  // Pulse animation loop
  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  // Measure target on step change
  useEffect(() => {
    if (!visible) return;

    fadeAnim.setValue(0);
    slideAnim.setValue(8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Scroll if needed
    if (currentStep?.scrollTargetY !== undefined && scrollViewRef?.current) {
      try {
        scrollViewRef.current.scrollTo({
          y: currentStep.scrollTargetY,
          animated: true,
        });
      } catch {
        // ignore scroll error
      }
    }

    const timer = setTimeout(() => {
      if (currentStep?.targetRef?.current?.measureInWindow) {
        currentStep.targetRef.current.measureInWindow(
          (x: number, y: number, width: number, height: number) => {
            if (width > 0 && height > 0) {
              setMeasuredLayout({ x, y, width, height });
            } else if (currentStep.fallbackLayout) {
              setMeasuredLayout(currentStep.fallbackLayout);
            }
          },
        );
      } else if (currentStep?.fallbackLayout) {
        setMeasuredLayout(currentStep.fallbackLayout);
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [visible, currentStepIndex, currentStep, fadeAnim, slideAnim, scrollViewRef]);

  if (!visible || !currentStep) return null;

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(effectiveStorageKey, 'true');
    } catch {
      // ignore
    }
    setCurrentStepIndex(0);
    onClose();
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Compute spotlight cutout geometry
  const pad = currentStep.padding ?? 6;
  const layout = measuredLayout || currentStep.fallbackLayout || {
    x: 16,
    y: 100,
    width: windowWidth - 32,
    height: 100,
  };

  const cutoutX = Math.max(4, layout.x - pad);
  const cutoutY = Math.max(4, layout.y - pad);
  const cutoutW = Math.min(windowWidth - 8, layout.width + pad * 2);
  const cutoutH = layout.height + pad * 2;

  const isCircle = currentStep.shape === 'circle';
  const targetRadius = isCircle
    ? Math.max(cutoutW, cutoutH) / 2
    : (currentStep.borderRadius ?? 16);

  const targetCenterX = cutoutX + cutoutW / 2;
  const targetCenterY = cutoutY + cutoutH / 2;

  // Compute Tooltip position
  const estimatedTooltipHeight = 220;
  const spaceBelow = windowHeight - (cutoutY + cutoutH);
  const isBelow = spaceBelow >= estimatedTooltipHeight || cutoutY < 200;

  const tooltipWidth = Math.min(windowWidth - 32, 400);
  const tooltipLeft = (windowWidth - tooltipWidth) / 2;

  const tooltipTop = isBelow
    ? cutoutY + cutoutH + 14
    : Math.max(36, cutoutY - estimatedTooltipHeight - 14);

  const StepIcon = currentStep.icon || Sparkles;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Arrow position pointing at target center
  const arrowLeft = Math.max(20, Math.min(tooltipWidth - 36, targetCenterX - tooltipLeft - 8));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleFinish}>
      <View style={styles.container}>
        {/* Dimmed Focus Backdrop with SVG Cutout */}
        <Svg
          width={windowWidth}
          height={windowHeight}
          style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id={`spotlight-mask-${currentStepIndex}`}>
              {/* White fills everything (dark overlay applies) */}
              <Rect x="0" y="0" width={windowWidth} height={windowHeight} fill="white" />
              {/* Black cutout creates transparent hole */}
              {isCircle ? (
                <Circle
                  cx={targetCenterX}
                  cy={targetCenterY}
                  r={targetRadius}
                  fill="black"
                />
              ) : (
                <Rect
                  x={cutoutX}
                  y={cutoutY}
                  width={cutoutW}
                  height={cutoutH}
                  rx={targetRadius}
                  ry={targetRadius}
                  fill="black"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={windowWidth}
            height={windowHeight}
            fill="rgba(15, 23, 42, 0.82)"
            mask={`url(#spotlight-mask-${currentStepIndex})`}
          />
        </Svg>

        {/* Pulsing Outer Ring (GCash Focus Ring) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            isCircle
              ? {
                  left: targetCenterX - targetRadius - 4,
                  top: targetCenterY - targetRadius - 4,
                  width: (targetRadius + 4) * 2,
                  height: (targetRadius + 4) * 2,
                  borderRadius: targetRadius + 4,
                }
              : {
                  left: cutoutX - 4,
                  top: cutoutY - 4,
                  width: cutoutW + 8,
                  height: cutoutH + 8,
                  borderRadius: targetRadius + 4,
                },
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.08],
                outputRange: [0.9, 0.25],
              }),
            },
          ]}
        />

        {/* Highlighting Encircled Focus Ring */}
        <View
          pointerEvents="none"
          style={[
            styles.focusBorder,
            isCircle
              ? {
                  left: targetCenterX - targetRadius,
                  top: targetCenterY - targetRadius,
                  width: targetRadius * 2,
                  height: targetRadius * 2,
                  borderRadius: targetRadius,
                }
              : {
                  left: cutoutX,
                  top: cutoutY,
                  width: cutoutW,
                  height: cutoutH,
                  borderRadius: targetRadius,
                },
          ]}
        />

        {/* Backdrop Tap to Advance (Outside Cutout) */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleNext}
          accessibilityLabel="Magpatuloy sa susunod na gabay"
        />

        {/* Floating Tooltip Card */}
        <Animated.View
          style={[
            styles.tooltipCard,
            {
              width: tooltipWidth,
              left: tooltipLeft,
              top: tooltipTop,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          {/* Directional Pointer Arrow */}
          <View
            style={[
              styles.pointerArrow,
              isBelow ? styles.arrowTop : styles.arrowBottom,
              { left: arrowLeft },
            ]}
          />

          {/* Header Row: Badge, Step Pill, Close Button */}
          <View style={styles.tooltipHeader}>
            <View style={styles.stepPill}>
              <AnimoText variant="tag" color={AnimoColors.green} style={styles.stepPillText}>
                {t('spotlight.step')} {currentStepIndex + 1} / {steps.length}
              </AnimoText>
            </View>

            <View style={styles.headerRight}>
              {/* Step indicator dots */}
              <View style={styles.dotsRow}>
                {steps.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.dot,
                      idx === currentStepIndex && styles.activeDot,
                    ]}
                  />
                ))}
              </View>

              <Pressable
                onPress={handleFinish}
                hitSlop={8}
                style={styles.closeButton}
                accessibilityLabel={t('common.close')}>
                <X size={16} color={AnimoColors.muted} />
              </Pressable>
            </View>
          </View>

          {/* Title Row with Icon */}
          <View style={styles.titleRow}>
            <View style={styles.iconBadge}>
              <StepIcon size={20} color={AnimoColors.green} />
            </View>
            <View style={styles.titleWrap}>
              <AnimoText variant="h3" color={AnimoColors.black} style={styles.tooltipTitle}>
                {currentStep.title}
              </AnimoText>
            </View>
          </View>

          {/* Description */}
          <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.tooltipDesc}>
            {currentStep.description}
          </AnimoText>

          {/* Footer Controls */}
          <View style={styles.footerRow}>
            {/* Skip / Back Button */}
            {currentStepIndex > 0 ? (
              <Pressable
                onPress={handlePrev}
                hitSlop={8}
                style={styles.secondaryButton}>
                <ChevronLeft size={16} color={AnimoColors.muted} />
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {t('spotlight.prev')}
                </AnimoText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleFinish}
                hitSlop={8}
                style={styles.secondaryButton}>
                <AnimoText variant="caption" color={AnimoColors.muted}>
                  {t('spotlight.skip')}
                </AnimoText>
              </Pressable>
            )}

            {/* Next / Got It Button */}
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}>
              <AnimoText
                variant="bodyEmphasis"
                color={AnimoColors.white}
                style={styles.primaryButtonText}>
                {isLastStep ? t('spotlight.finish') : t('spotlight.next')}
              </AnimoText>
              <ChevronRight size={16} color={AnimoColors.white} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#34D399',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  focusBorder: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  tooltipCard: {
    position: 'absolute',
    backgroundColor: AnimoColors.white,
    borderRadius: 20,
    padding: AnimoSpacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    zIndex: 9999,
  },
  pointerArrow: {
    position: 'absolute',
    width: 14,
    height: 14,
    backgroundColor: AnimoColors.white,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    transform: [{ rotate: '45deg' }],
    zIndex: 10000,
  },
  arrowTop: {
    top: -7,
  },
  arrowBottom: {
    bottom: -7,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AnimoSpacing.sm,
  },
  stepPill: {
    backgroundColor: AnimoColors.greenTint,
    paddingHorizontal: AnimoSpacing.sm + 2,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  activeDot: {
    width: 16,
    backgroundColor: AnimoColors.green,
  },
  closeButton: {
    padding: 4,
    borderRadius: AnimoRadius.pill,
    backgroundColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
    marginBottom: AnimoSpacing.xs,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: AnimoColors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  tooltipDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: AnimoSpacing.md,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: AnimoSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: AnimoSpacing.xs,
    paddingHorizontal: AnimoSpacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AnimoColors.green,
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.sm - 2,
    borderRadius: AnimoRadius.pill,
    shadowColor: AnimoColors.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
