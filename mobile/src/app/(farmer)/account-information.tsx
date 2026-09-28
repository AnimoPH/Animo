import { Redirect } from 'expo-router';

/**
 * Account information redirects to the live profile edit screen.
 */
export default function AccountInformationScreen() {
  return <Redirect href="/(farmer)/profile-edit" />;
}
