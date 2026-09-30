import { Stack } from 'expo-router';

/** Marketplace stack: list → listing detail → purchase. */
export default function PalengkeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="reviews" />
      <Stack.Screen name="buy" />
      <Stack.Screen name="bid" />
      <Stack.Screen name="magsasaka/[id]" />
    </Stack>
  );
}
