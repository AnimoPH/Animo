import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy route redirect to bayad screen in new flow. */
export default function HulingBayadRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(buyer)/transaksyon/${id || 'pr-inspected'}/bayad`} />;
}
