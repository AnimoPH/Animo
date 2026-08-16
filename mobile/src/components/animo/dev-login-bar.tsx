import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import type { RoleId } from '@/constants/roles';

type DevLoginBarProps = {
  onSelect: (role: RoleId) => void;
  submitting?: boolean;
  activeRole?: RoleId | null;
  error?: string;
};

/**
 * Quiet __DEV__-only shortcuts onto seeded farmer/buyer accounts.
 * Intentionally not an AnimoButton — it must not compete with Magpatuloy.
 */
export function DevLoginBar({
  onSelect,
  submitting = false,
  activeRole = null,
  error,
}: DevLoginBarProps) {
  if (!__DEV__) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <AnimoText variant="tag" color={AnimoColors.textLowEmphasis} style={styles.label}>
        Development
      </AnimoText>
      <View style={styles.row}>
        <DevChip
          label="Magsasaka"
          disabled={submitting}
          loading={submitting && activeRole === 'magsasaka'}
          onPress={() => onSelect('magsasaka')}
        />
        <DevChip
          label="Mamimili"
          disabled={submitting}
          loading={submitting && activeRole === 'mamimili'}
          onPress={() => onSelect('mamimili')}
        />
      </View>
      {error ? (
        <AnimoText variant="caption" color={AnimoColors.danger} style={styles.error}>
          {error}
        </AnimoText>
      ) : null}
    </View>
  );
}

function DevChip({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Development login as ${label}`}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        pressed && !disabled && styles.chipPressed,
        disabled && !loading && styles.chipDisabled,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={AnimoColors.textMediumEmphasis} />
      ) : (
        <AnimoText variant="caption" color={AnimoColors.textMediumEmphasis} style={styles.chipLabel}>
          {label}
        </AnimoText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: AnimoSpacing.sm,
    paddingTop: AnimoSpacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AnimoColors.borderLowEmphasis,
    marginBottom: AnimoSpacing.xs,
  },
  label: {
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: AnimoSpacing.sm,
  },
  chip: {
    flex: 1,
    height: 40,
    borderRadius: AnimoRadius.pill,
    backgroundColor: AnimoColors.surfaceTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: AnimoColors.surfaceQuaternary,
  },
  chipDisabled: {
    opacity: 0.55,
  },
  chipLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  error: {
    textAlign: 'center',
  },
});
