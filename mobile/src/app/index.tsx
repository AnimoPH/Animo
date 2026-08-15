import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoSpacing } from '@/constants/animo';
import { homeRouteForRole } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';

/**
 * Landing / splash screen.
 *
 * Full-bleed brand green with the Animo logo and tagline. Tapping continues
 * to the right place: an already-authenticated session (within the 30-day
 * window) goes straight to Home, a verified-but-incomplete registration
 * resumes at the profile step, a device that's registered before goes to
 * login, and a first-run device goes to role selection.
 */
export default function LandingScreen() {
  const { status, account, hasRegisteredOnDevice } = useSession();

  const handleContinue = () => {
    if (status === 'authenticated' && account) {
      router.replace(homeRouteForRole(account.role));
    } else if (status === 'needs-profile') {
      router.replace('/onboarding/register?resume=1');
    } else if (hasRegisteredOnDevice) {
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
