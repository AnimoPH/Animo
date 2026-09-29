import { Redirect, useLocalSearchParams } from 'expo-router';

/** Preserve saved purchase links after renaming the buy route. */
export default function LegacyBidRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/(buyer)/palengke/buy', params: id ? { id } : {} }} />;
}
