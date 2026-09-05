import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimoColors, AnimoFontMap } from '@/constants/animo';
import { LanguageProvider } from '@/context/language-context';
import { SessionProvider, useSession } from '@/context/session-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(AnimoFontMap);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <SessionProvider>
        <RootNavigator />
      </SessionProvider>
    </LanguageProvider>
  );
}

// Animo is a light-only branded experience for now.
function RootNavigator() {
  const { status } = useSession();

  // Fonts are ready as soon as this tree mounts (gated above); hide the
  // native splash only once the session has hydrated too, so there's no
  // blank flash between "splash gone" and "index.tsx knows where to route".
  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AnimoColors.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding/role" />
      <Stack.Screen name="onboarding/register" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(buyer)" />
      <Stack.Screen name="(farmer)" />
    </Stack>
  );
}
