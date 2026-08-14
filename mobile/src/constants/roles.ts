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
    description: 'Nagbebenta ng palay at humihiling ng tulong pagkatapos ng bagyo.',
    image: require('@/assets/images/animo/role-magsasaka.png'),
    accent: AnimoColors.roleFarmer,
  },
  {
    id: 'mamimili',
    title: 'Mamimili',
    description: 'Bumibili ng palay mula sa mga verified na magsasaka.',
    image: require('@/assets/images/animo/role-mamimili.png'),
    accent: AnimoColors.roleBuyer,
  },
];

export function getRole(id: RoleId | null | undefined): Role | undefined {
  return ROLES.find((role) => role.id === id);
}

/** Landing route for a role's module after login/registration. */
export function homeRouteForRole(id: RoleId | null | undefined): '/(buyer)' | '/(farmer)' {
  return id === 'magsasaka' ? '/(farmer)' : '/(buyer)';
}
