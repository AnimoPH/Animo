import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Font, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';

export type V2SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  clearLabel: string;
  /** Required when `onFilterPress` is given. */
  filterLabel?: string;
  /** Number of applied filters, shown as a count badge on the filter button. */
  activeFilterCount?: number;
  onFilterPress?: () => void;
};

/**
 * v2 search row: 56px field with a 2px strong border plus a square filter button of the same height.
 * The filter button turns solid green with a count badge while filters are applied.
 */
export function V2SearchBar({
  value,
  onChangeText,
  placeholder,
  clearLabel,
  filterLabel,
  activeFilterCount = 0,
  onFilterPress,
}: V2SearchBarProps) {
  const active = activeFilterCount > 0;
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Search size={22} color={AnimoV2Colors.textTertiary} strokeWidth={2.5} />
        <TextInput
          accessibilityLabel={placeholder}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={AnimoV2Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} onPress={() => onChangeText('')} hitSlop={10}>
            <X size={20} color={AnimoV2Colors.textSecondary} strokeWidth={2.75} />
          </Pressable>
        ) : null}
      </View>

      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={filterLabel}
          onPress={onFilterPress}
          style={[styles.filterBtn, active && styles.filterBtnOn]}>
          <SlidersHorizontal
            size={24}
            color={active ? AnimoV2Colors.textOnBrand : AnimoV2Colors.textBrand}
            strokeWidth={2.5}
          />
          {active ? (
            <View style={styles.badge}>
              <AnimoText variant="tagV2" color={AnimoV2Colors.textOnBrand} style={styles.badgeText}>
                {activeFilterCount}
              </AnimoText>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: AnimoV2Spacing.sm },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AnimoV2Spacing.sm,
    height: AnimoV2Size.controlHeight,
    paddingHorizontal: AnimoV2Spacing.lg,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.surfaceCard,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    fontFamily: AnimoV2Font.regular,
    fontSize: 16,
    color: AnimoV2Colors.textPrimary,
  },
  filterBtn: {
    width: AnimoV2Size.controlHeight,
    height: AnimoV2Size.controlHeight,
    borderRadius: AnimoV2Radius.md,
    borderWidth: 2,
    borderColor: AnimoV2Colors.borderStrong,
    backgroundColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnOn: { backgroundColor: AnimoV2Colors.actionPrimary, borderColor: AnimoV2Colors.actionPrimary },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: AnimoV2Font.extrabold },
});
