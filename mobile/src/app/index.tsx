import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { useOnboarding } from '@/hooks/use-onboarding';

/**
 * Landing / splash screen.
 *
 * Full-bleed brand green with the Animo logo and tagline. Tapping continues to
 * the right place: first-run users go to role selection + registration;
 * returning users go to the app (login lands here once it's built).
 */
export default function LandingScreen() {
  const { hasRegistered } = useOnboarding();

  const handleContinue = () => {
    // Still loading persisted state — ignore taps until we know.
    if (hasRegistered === null) return;

    if (hasRegistered) {
      // Returning user — sign in with phone + OTP.
      router.replace('/login');
    } else {
      router.push('/onboarding/role');
    }
  };

  return (
    <Pressable style={styles.pressable} onPress={handleContinue}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <View style={styles.logoBadge}>
            <Image
              source={require('@/assets/images/animo/icon-green.png')}
              style={styles.logo}
              contentFit="contain"
            />
          </View>
          <AnimoText variant="display" color={AnimoColors.white} style={styles.title}>
            Animo
          </AnimoText>
          <AnimoText variant="body" color={AnimoColors.white} style={styles.tagline}>
            Para sa Makatarungang Palengke{'\n'}at Pagbangon ng Bukid
          </AnimoText>
        </View>
      </SafeAreaView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    backgroundColor: AnimoColors.green,
  },
  safeArea: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AnimoSpacing.xl,
  },
  logoBadge: {
    width: 128,
    height: 128,
    borderRadius: 28,
    backgroundColor: AnimoColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AnimoSpacing.xl,
  },
  logo: {
    width: 88,
    height: 88,
  },
  title: {
    textAlign: 'center',
    marginBottom: AnimoSpacing.sm,
  },
  tagline: {
    textAlign: 'center',
    opacity: 0.92,
  },
});
