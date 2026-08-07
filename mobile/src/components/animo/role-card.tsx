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

/**
 * A selectable role option on the "Sino ka?" screen: illustration on a colored
 * tile, with a title and description. The whole card highlights (green tint +
 * green border) when selected.
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
        { backgroundColor: selected ? AnimoColors.greenTint : AnimoColors.white },
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
        <AnimoText variant="body" color={AnimoColors.blackSecondary} style={styles.description}>
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
    borderWidth: 1.5,
    borderColor: AnimoColors.borderSelected,
  },
  pressed: {
    opacity: 0.9,
  },
  imageTile: {
    width: 72,
    height: 72,
    borderRadius: AnimoRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 60,
    height: 60,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  description: {
    flexShrink: 1,
  },
});
