import { Stack } from 'expo-router';

/**
 * One purchase request: status screen plus the revised buyer flow sub-screens.
 *
 * status → pickup at inspeksyon → bayad → kumpirmasyon → resibo → review
 */
export default function RequestLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pickup" />
      <Stack.Screen name="bayad" />
      <Stack.Screen name="kumpirmasyon" />
      <Stack.Screen name="resibo" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
