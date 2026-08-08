import { Stack } from 'expo-router';

/** Marketplace stack: list → listing detail → bid. */
export default function PalengkeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="bid" />
    </Stack>
  );
}
