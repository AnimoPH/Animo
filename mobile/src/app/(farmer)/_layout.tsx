import { Stack } from 'expo-router';

import { AnimoColors } from '@/constants/animo';

/** Farmer stack: tab module plus listing and transaction detail screens. */
export default function FarmerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: AnimoColors.appBackground },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="account-information" />
      <Stack.Screen name="advisory" />
      <Stack.Screen name="creation-listing" />
      <Stack.Screen name="listing-detail" />
      <Stack.Screen name="listing-result" />
      <Stack.Screen name="listing-uploading" />
      <Stack.Screen name="resibo" />
      <Stack.Screen name="transaksyon/[id]" />
    </Stack>
  );
}
