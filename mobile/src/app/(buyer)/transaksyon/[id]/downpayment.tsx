import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route redirect to pickup screen in new flow. */
export default function DownpaymentRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(buyer)/transaksyon/${id || 'pr-scheduled'}/pickup`} />;
}
