import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CheckCircle2,
  CloudRain,
  Droplets,
  HandCoins,
  Layers,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Wheat,
  X,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoButton } from '@/components/animo/animo-button';
import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';

export const TUTORIAL_STORAGE_KEY = 'animo.hasSeenTutorial';
export const FARMER_TUTORIAL_STORAGE_KEY = 'animo.hasSeenFarmerTutorial';

export type OnboardingWalkthroughModalProps = {
  visible: boolean;
  onClose: () => void;
  role?: 'magsasaka' | 'mamimili';
};

export function OnboardingWalkthroughModal({
  visible,
  onClose,
  role = 'mamimili',
}: OnboardingWalkthroughModalProps) {
  const { t, isTagalog } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const isFarmer = role === 'magsasaka';

  const buyerSlides = [
    {
      id: 0,
      icon: TrendingUp,
      badge: isTagalog ? 'Merkado · Market' : 'Market & Pricing',
      title: t('tutorial.step1Title'),
      description: t('tutorial.step1Desc'),
      color: AnimoColors.green,
      bgTint: AnimoColors.greenTint,
      features: [
        {
          icon: ShieldCheck,
          title: t('landing.feature1'),
          detail: isTagalog
            ? 'Real-time na presyo bawat araw batay sa opisyal na datos ng merkado.'
            : 'Real-time daily prices linked with official market benchmarks.',
        },
        {
          icon: Sparkles,
          title: t('landing.feature2'),
          detail: isTagalog
            ? 'Direktang transaksyon sa pagitan ng mga magsasaka sa Rizal at verified na mamimili.'
            : 'Direct deals between local Rizal/Antipolo farmers and verified buyers.',
        },
      ],
    },
    {
      id: 1,
      icon: Wheat,
      badge: isTagalog ? 'Palay at Grado' : 'Palay & Grading',
      title: t('tutorial.step2Title'),
      description: t('tutorial.step2Desc'),
      color: '#D97706',
      bgTint: '#FEF3C7',
      features: [
        {
          icon: Layers,
          title: isTagalog ? 'Inbred vs. Hybrid (High-Yield)' : 'Inbred vs. Hybrid (High-Yield)',
          detail: isTagalog
            ? 'Malinaw na barayti: Inbred (Rc218, Rc160) at Hybrid (Mataas na Ani tulad ng SL-8H).'
            : 'Clear varieties: Inbred (Rc218, Rc160) and Hybrid (High-Yield such as SL-8H).',
        },
        {
          icon: Droplets,
          title: isTagalog ? 'Moisture at Grado' : 'Moisture & Grade',
          detail: isTagalog
            ? 'Tukoy ang Tuyo (Dry) o Basa (Wet), at Grado A hanggang C.'
            : 'Specifies Dry or Wet condition, and Grade A through C.',
        },
      ],
    },
    {
      id: 2,
      icon: Receipt,
      badge: isTagalog ? 'Transaksyon at Kaligtasan' : 'Transaction & Safety',
      title: t('tutorial.step3Title'),
      description: t('tutorial.step3Desc'),
      color: '#2563EB',
      bgTint: '#EFF6FF',
      features: [
        {
          icon: Scale,
          title: isTagalog ? 'Malinaw na Timbang at Bayaran' : 'Clear Weight & Payment',
          detail: isTagalog
            ? 'May kumpirmasyon ng timbang sa sako at suporta para sa GCash at Cash.'
            : 'Sack weight confirmation with support for GCash and Cash.',
        },
        {
          icon: CheckCircle2,
          title: isTagalog ? 'Beripikadong Resibo' : 'Verifiable Receipts',
          detail: isTagalog
            ? 'Bawat transaksyon ay may digital na resibo at reference tracking.'
            : 'Every transaction includes a digital receipt and reference tracking.',
        },
      ],
    },
  ];

  const farmerSlides = [
    {
      id: 0,
      icon: Sprout,
      badge: isTagalog ? 'Aking Ani · Bagong Listing' : 'My Harvest · New Listing',
      title: t('tutorial.farmer.step1Title'),
      description: t('tutorial.farmer.step1Desc'),
      color: AnimoColors.green,
      bgTint: AnimoColors.greenTint,
      features: [
        {
          icon: Wheat,
          title: isTagalog ? 'Tamang Barayti ng Binhi' : 'Certified Seed Variety',
          detail: isTagalog
            ? 'Piliin kung Inbred (sertipikadong binhi tulad ng Rc222), Hybrid (SL-8H), o Tradisyonal.'
            : 'Select certified Inbred (such as Rc222), Hybrid (SL-8H), or Traditional.',
        },
        {
          icon: Scale,
          title: isTagalog ? 'Timbang at Antas ng Tuyot' : 'Weight & Moisture Level',
          detail: isTagalog
            ? 'Ilagay ang kabuuang timbang at ideklara kung Tuyo (Dry) o Basa (Wet).'
            : 'Enter gross/tare weight and declare Dry or Wet condition.',
        },
      ],
    },
    {
      id: 1,
      icon: TrendingUp,
      badge: isTagalog ? 'Presyo · Patas na Benchmark' : 'Pricing · Fair Benchmark',
      title: t('tutorial.farmer.step2Title'),
      description: t('tutorial.farmer.step2Desc'),
      color: '#059669',
      bgTint: '#ECFDF5',
      features: [
        {
          icon: ShieldCheck,
          title: isTagalog ? 'Opisyal na Presyo sa Merkado' : 'Official Market Price',
          detail: isTagalog
            ? 'Awtomatikong nakakandado ang patas na presyo kada kilo nang walang bawas ng ahente.'
            : 'Locks in fair market prices per kg without middleman cuts.',
        },
        {
          icon: Sparkles,
          title: isTagalog ? 'Variety Premium' : 'Variety Premium',
          detail: isTagalog
            ? 'May karagdagang halaga para sa mataas na kalidad at hybrid varieties.'
            : 'Premium pricing applied for high-quality and hybrid varieties.',
        },
      ],
    },
    {
      id: 2,
      icon: HandCoins,
      badge: isTagalog ? 'Mga Order at Bayad' : 'Orders & Payments',
      title: t('tutorial.farmer.step3Title'),
      description: t('tutorial.farmer.step3Desc'),
      color: '#2563EB',
      bgTint: '#EFF6FF',
      features: [
        {
          icon: Receipt,
          title: isTagalog ? 'Purchase Request mula sa Mamimili' : 'Purchase Requests from Buyers',
          detail: isTagalog
            ? 'Tingnan ang alok at dami ng sakong nais bilhin sa tab ng Transaksyon.'
            : 'Review buyer offers and requested quantities in the Transactions tab.',
        },
        {
          icon: CheckCircle2,
          title: isTagalog ? 'Kumpirmahin Bago I-release' : 'Confirm Before Release',
          detail: isTagalog
            ? 'Tiyaking nakumpirma ang bayad sa GCash o personal bago ibigay ang palay.'
            : 'Ensure payment is verified via GCash or cash before releasing palay.',
        },
      ],
    },
    {
      id: 3,
      icon: CloudRain,
      badge: isTagalog ? 'Panahon · LGU Advisory' : 'Weather · LGU Advisory',
      title: t('tutorial.farmer.step4Title'),
      description: t('tutorial.farmer.step4Desc'),
      color: '#D97706',
      bgTint: '#FEF3C7',
      features: [
        {
          icon: CloudRain,
          title: isTagalog ? 'Bantay-Panahon sa Bukid' : 'Farm Weather Watch',
          detail: isTagalog
            ? 'Alamin ang forecast ng ulan at monsoon para maagap ang pag-aani at pagpapatuyo.'
            : 'Stay updated on rain and monsoon forecasts to plan harvesting and drying.',
        },
        {
          icon: Layers,
          title: isTagalog ? 'Suporta mula sa LGU' : 'LGU Agriculture Support',
          detail: isTagalog
            ? 'Direktang gabay mula sa Tanggapan ng Pagsasaka (San Mateo & Rizal).'
            : 'Direct advisories from Municipal Agriculture Offices (San Mateo & Rizal).',
        },
      ],
    },
  ];

  const slides = isFarmer ? farmerSlides : buyerSlides;

  const handleFinish = async () => {
    try {
      const storageKey = isFarmer ? FARMER_TUTORIAL_STORAGE_KEY : TUTORIAL_STORAGE_KEY;
      await AsyncStorage.setItem(storageKey, 'true');
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } catch {
      // ignore storage error
    }
    setCurrentStep(0);
    onClose();
  };

  const handleNext = () => {
    if (currentStep < slides.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const activeSlide = slides[currentStep] || slides[0];
  const IconComponent = activeSlide.icon;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleFinish}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalCard} edges={['top', 'bottom']}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.guideBadge}>
              <AnimoText variant="tag" color={AnimoColors.accentPrimary}>
                {isFarmer ? t('tutorial.farmer.badge') : t('tutorial.badge')}
              </AnimoText>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tutorial.skip')}
              hitSlop={10}
              onPress={handleFinish}
              style={styles.skipButton}>
              <AnimoText variant="bodyEmphasis" color={AnimoColors.textLowEmphasis}>
                {t('tutorial.skip')}
              </AnimoText>
              <X size={16} color={AnimoColors.textLowEmphasis} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}>
            {/* Visual Header Banner */}
            <View style={[styles.visualHero, { backgroundColor: activeSlide.bgTint }]}>
              <View style={[styles.iconCircle, { backgroundColor: activeSlide.color }]}>
                <IconComponent size={34} color={AnimoColors.white} />
              </View>
              <View style={styles.tagPill}>
                <AnimoText variant="tag" color={activeSlide.color}>
                  {activeSlide.badge}
                </AnimoText>
              </View>
            </View>

            {/* Slide Title & Description */}
            <View style={styles.contentHeader}>
              <AnimoText variant="h1" color={AnimoColors.textHighEmphasis} style={styles.title}>
                {activeSlide.title}
              </AnimoText>
              <AnimoText
                variant="body"
                color={AnimoColors.textMediumEmphasis}
                style={styles.description}>
                {activeSlide.description}
              </AnimoText>
            </View>

            {/* Feature Bullet Cards */}
            <View style={styles.featuresContainer}>
              {activeSlide.features.map((feat, index) => {
                const FeatIcon = feat.icon;
                return (
                  <View key={index} style={styles.featureItem}>
                    <View style={[styles.featureIconWrap, { backgroundColor: activeSlide.bgTint }]}>
                      <FeatIcon size={18} color={activeSlide.color} />
                    </View>
                    <View style={styles.featureTextWrap}>
                      <AnimoText variant="bodyEmphasis" color={AnimoColors.textHighEmphasis}>
                        {feat.title}
                      </AnimoText>
                      <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis}>
                        {feat.detail}
                      </AnimoText>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Controls */}
          <View style={styles.footer}>
            {/* Dot Step Indicators */}
            <View style={styles.dotsRow}>
              {slides.map((slide, idx) => (
                <Pressable
                  key={slide.id}
                  hitSlop={8}
                  onPress={() => setCurrentStep(idx)}
                  style={[
                    styles.dot,
                    idx === currentStep && [
                      styles.dotActive,
                      { backgroundColor: activeSlide.color },
                    ],
                  ]}
                />
              ))}
            </View>

            {/* Primary Action Button */}
            <View style={styles.actionRow}>
              {currentStep > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCurrentStep((prev) => prev - 1)}
                  style={styles.backButton}>
                  <AnimoText variant="bodyEmphasis" color={AnimoColors.textMediumEmphasis}>
                    {t('common.previous')}
                  </AnimoText>
                </Pressable>
              ) : null}

              <View style={styles.flex}>
                <AnimoButton
                  label={
                    currentStep === slides.length - 1
                      ? t('tutorial.start')
                      : t('tutorial.next')
                  }
                  onPress={handleNext}
                />
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: AnimoSpacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: AnimoColors.surfacePrimary,
    borderRadius: AnimoRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.md,
    paddingBottom: AnimoSpacing.sm,
  },
  guideBadge: {
    backgroundColor: AnimoColors.greenTint,
    paddingHorizontal: AnimoSpacing.sm,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  scrollBody: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingBottom: AnimoSpacing.lg,
    gap: AnimoSpacing.md,
  },
  visualHero: {
    width: '100%',
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AnimoSpacing.sm,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tagPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 3,
    borderRadius: AnimoRadius.pill,
  },
  contentHeader: {
    gap: AnimoSpacing.xs,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  description: {
    fontSize: 14.5,
    lineHeight: 22,
  },
  featuresContainer: {
    gap: AnimoSpacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoSpacing.md,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.md,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
    gap: 2,
  },
  footer: {
    paddingHorizontal: AnimoSpacing.lg,
    paddingTop: AnimoSpacing.sm,
    paddingBottom: AnimoSpacing.md,
    borderTopWidth: 1,
    borderTopColor: AnimoColors.borderLowEmphasis,
    backgroundColor: AnimoColors.surfacePrimary,
    gap: AnimoSpacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoColors.borderLowEmphasis,
  },
  dotActive: {
    width: 22,
    borderRadius: AnimoRadius.pill,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.sm,
  },
  backButton: {
    paddingVertical: AnimoSpacing.md,
    paddingHorizontal: AnimoSpacing.md,
  },
  flex: {
    flex: 1,
  },
});
