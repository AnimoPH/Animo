import type { Href } from 'expo-router';
import type { ImageSourcePropType } from 'react-native';

import { AnimoColors } from '@/constants/animo';

export type RoleId = 'magsasaka' | 'mamimili';

export type Role = {
  id: RoleId;
  title: string;
  description: string;
  /** Illustration shown on the role card. */
  image: ImageSourcePropType;
  /** Accent background color for the card. */
  accent: string;
};

/**
 * Selectable roles on the "Sino ka?" screen. The user's role is fixed after
 * verification, so this list is deliberately small and explicit.
 *
 * (Kooperatiba and Boluntaryo from the original mockup are intentionally
 * omitted for now.)
 */
export const ROLES: Role[] = [
  {
    id: 'magsasaka',
    title: 'Magsasaka',
    description: 'Nagbebenta ng palay at humihiling ng payo sa pagsasaka.',
    image: require('@/assets/images/animo/role-magsasaka.png'),
    accent: "#b8e7b8",
  },
  {
    id: 'mamimili',
    title: 'Mamimili',
    description: 'Bumibili ng palay nang direkta mula sa mga magsasaka.',
    image: require('@/assets/images/animo/role-mamimili.png'),
    accent: "#ffe5be",
  },
];

export function getRole(id: RoleId | null | undefined): Role | undefined {
  return ROLES.find((role) => role.id === id);
}

/**
 * Landing route for a role's module after login/registration.
 *
 * Cast to `Href`: the farmer module's home screen lives a level deeper, at
 * `(farmer)/(tabs)/index`, so the bare group path isn't part of the
 * generated route-string union the way `/(buyer)` is. It still resolves
 * correctly at runtime — Expo Router follows the nested default route.
 */
export function homeRouteForRole(id: RoleId | null | undefined): Href {
  return (id === 'magsasaka' ? '/(farmer)' : '/(buyer)') as Href;
}
