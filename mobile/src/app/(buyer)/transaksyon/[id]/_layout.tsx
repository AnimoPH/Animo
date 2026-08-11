import { Stack } from 'expo-router';

/**
 * One purchase request: status screen plus the payment and pickup sub-flows.
 *
 * status → downpayment → pickup → huling bayad → resibo
 */
export default function RequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="downpayment" />
      <Stack.Screen name="pickup" />
      <Stack.Screen name="huling-bayad" />
      <Stack.Screen name="resibo" />
    </Stack>
  );
}
