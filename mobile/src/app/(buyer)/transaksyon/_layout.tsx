import { Stack } from 'expo-router';

/** Transaction stack: history list → one request's status and its sub-flows. */
export default function TransaksyonLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
