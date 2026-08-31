import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { Role } from '@/constants/roles';

export type RoleCardProps = {
  role: Role;
  selected: boolean;
  onPress: () => void;
};

/** Convert a hex color to rgba so only the fill fades, not the card content. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * A selectable role option on the "Sino ka?" screen: illustration on a colored
 * tile, with a title and description. The whole card highlights with the role
 * accent fill and a green border when selected.
 */
export function RoleCard({ role, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={role.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: selected ? withAlpha(role.accent, 0.5) : AnimoColors.white },
        selected ? styles.cardSelected : styles.cardDefault,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.imageTile, { backgroundColor: role.accent }]}>
        <Image source={role.image} style={styles.image} contentFit="contain" />
      </View>
      <View style={styles.textCol}>
        <AnimoText variant="h3" color={AnimoColors.black}>
          {role.title}
        </AnimoText>
        <AnimoText variant="caption" color={AnimoColors.blackSecondary} style={styles.description}>
          {role.description}
        </AnimoText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoSpacing.lg,
    padding: AnimoSpacing.md,
    borderRadius: AnimoRadius.lg,
  },
  cardDefault: {
    borderWidth: 1,
    borderColor: AnimoColors.border,
  },
  cardSelected: {
    // borderWidth: 1,
    // borderColor: AnimoColors.borderSelected,
  },
  pressed: {
    opacity: 0.8,
  },
  imageTile: {
    width: 90,
    height: 90,
    borderRadius: AnimoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 90,
    height: 90,
  },
  textCol: {
    flex: 1,
    gap: 6,
  },
  description: {
    flexShrink: 1,
  },
});
