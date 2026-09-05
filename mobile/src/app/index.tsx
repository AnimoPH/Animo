import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  Globe,
  Handshake,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { DevLoginBar } from '@/components/animo/dev-login-bar';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole, type RoleId } from '@/constants/roles';
import { useLanguage } from '@/hooks/use-language';
import { useSession } from '@/hooks/use-session';
import { signInDevAccount } from '@/services/auth-service';

/**
 * Elevated Landing / Splash Screen.
 *
 * Rich branded aesthetic with dynamic bilingual support (TL/EN),
 * value proposition highlights, clear call-to-action buttons,
 * seamless role/session routing, and dev bypass shortcuts.
 */
export default function LandingScreen() {
  const { status, account, hasRegisteredOnDevice, refresh } = useSession();
  const { language, setLanguage, t, isTagalog } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [devRole, setDevRole] = useState<RoleId | null>(null);
  const [devError, setDevError] = useState<string | undefined>();

  const handleGetStarted = () => {
    router.replace('/login');
  };

  const handleRegister = () => {
    router.push('/onboarding/role');
  };

  const handleDevLogin = async (role: RoleId) => {
    setSubmitting(true);
    setDevRole(role);
    setDevError(undefined);
    try {
      const profile = await signInDevAccount(role);
      await refresh();
      router.replace(homeRouteForRole(profile.role));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Dev login failed.';
      setDevError(message);
      setSubmitting(false);
      setDevRole(null);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'tl' ? 'en' : 'tl');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Ambient background decoration shapes */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar with Language Toggle */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch language to ${isTagalog ? 'English' : 'Tagalog'}`}
            onPress={toggleLanguage}
            style={({ pressed }) => [styles.langToggle, pressed && styles.pressed]}>
            <Globe size={15} color={AnimoColors.white} />
            <AnimoText variant="tag" color={AnimoColors.white} style={styles.langText}>
              {isTagalog ? '🇵🇭 Tagalog' : '🌐 English'}
            </AnimoText>
          </Pressable>
        </View>

        {/* Center Hero Area */}
        <View style={styles.centerHero}>
          <View style={styles.logoGlowRing}>
            <View style={styles.logoBadge}>
              <Image
                source={require('@/assets/images/animo/icon-green.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </View>

          <AnimoText variant="display" color={AnimoColors.white} style={styles.title}>
            {t('app.name')}
          </AnimoText>

          <AnimoText variant="h3" color={AnimoColors.white} style={styles.tagline}>
            {t('landing.tagline')}
          </AnimoText>

          <AnimoText variant="body" color="rgba(255,255,255,0.85)" style={styles.subtitle}>
            {t('landing.subtitle')}
          </AnimoText>

          {/* Value Proposition Pills */}
          <View style={styles.pillsContainer}>
            <View style={styles.featurePill}>
              <TrendingUp size={13} color={AnimoColors.white} />
              <AnimoText variant="tag" color={AnimoColors.white}>
                {t('landing.feature1')}
              </AnimoText>
            </View>

            <View style={styles.featurePill}>
              <Handshake size={13} color={AnimoColors.white} />
              <AnimoText variant="tag" color={AnimoColors.white}>
                {t('landing.feature2')}
              </AnimoText>
            </View>

            <View style={styles.featurePill}>
              <ShieldCheck size={13} color={AnimoColors.white} />
              <AnimoText variant="tag" color={AnimoColors.white}>
                {t('landing.feature3')}
              </AnimoText>
            </View>
          </View>
        </View>

        {/* Bottom CTA Area & Dev Bypass */}
        <View style={styles.bottomArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('landing.signIn')}
            onPress={handleGetStarted}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <AnimoText variant="button" color={AnimoColors.green}>
              {t('landing.getStarted')} / {t('landing.signIn')}
            </AnimoText>
            <ArrowRight size={18} color={AnimoColors.green} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('role.title')}
            onPress={handleRegister}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
            <AnimoText variant="bodyEmphasis" color={AnimoColors.white}>
              {t('landing.roleSelect')}
            </AnimoText>
          </Pressable>

          {/* Development Quick Bypass */}
          {__DEV__ ? (
            <View style={styles.devBarContainer}>
              <DevLoginBar
                onSelect={handleDevLogin}
                submitting={submitting}
                activeRole={devRole}
                error={devError}
              />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#145319', // deep rich emerald brand green
  },
  bgGlowTop: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 125, 50, 0.4)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: AnimoSpacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: AnimoSpacing.sm,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 6,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  langText: {
    fontSize: 12.5,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  centerHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.sm,
    gap: AnimoSpacing.sm,
  },
  logoGlowRing: {
    width: 116,
    height: 116,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 66,
    height: 66,
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    opacity: 0.95,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AnimoSpacing.xs,
    marginTop: AnimoSpacing.xs,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: AnimoSpacing.md,
    paddingVertical: 5,
    borderRadius: AnimoRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  bottomArea: {
    paddingBottom: AnimoSpacing.md,
    gap: AnimoSpacing.xs,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AnimoColors.white,
    borderRadius: AnimoRadius.md,
    paddingVertical: 14,
    gap: AnimoSpacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: AnimoSpacing.xs,
  },
  devBarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: AnimoRadius.md,
    padding: AnimoSpacing.sm,
    marginTop: AnimoSpacing.xs,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
