import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AnimoColors, AnimoFontMap } from '@/constants/animo';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts(AnimoFontMap);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Animo is a light-only branded experience for now.
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
