import { router, type Href } from 'expo-router';

import { ProfileScreen } from '@/components/animo/profile-screen';

export default function FarmerProfileScreen() {
  return (
    <ProfileScreen
      role="magsasaka"
      onPersonalInfoPress={() => router.push('/(farmer)/profile-edit' as Href)}
    />
  );
}
