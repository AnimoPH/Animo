import { Search, SlidersHorizontal, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';

export type SearchFilterBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** When false, the sliders button is hidden. Defaults to true. */
  showFilterButton?: boolean;
  /** Count shown in the red badge when filters are applied. Defaults to 0. */
  activeFilterCount?: number;
  onFilterPress?: () => void;
};

/**
 * Search field with an optional side-by-side filter button.
 * Presentational only — the parent owns query state and the filter modal.
 */
export function SearchFilterBar({
  value,
  onChangeText,
  placeholder,
  showFilterButton = true,
  activeFilterCount = 0,
  onFilterPress,
}: SearchFilterBarProps) {
  const filtersActive = activeFilterCount > 0;

  return (
    <View style={styles.searchFilterRow}>
      <View style={styles.searchBar}>
        <Search size={18} color={AnimoColors.objectMediumEmphasis} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={AnimoColors.textLowEmphasis}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="I-clear ang hanap"
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={styles.clearSearchBtn}>
            <X size={16} color={AnimoColors.objectLowEmphasis} />
          </Pressable>
        ) : null}
      </View>

      {showFilterButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mga filter"
          onPress={onFilterPress}
          style={[styles.filterIconButton, filtersActive && styles.filterIconButtonActive]}>
          <SlidersHorizontal
            size={18}
            color={filtersActive ? AnimoColors.white : AnimoColors.accentPrimary}
          />
          {filtersActive ? (
            <View style={styles.filterBadge}>
              <AnimoText variant="tag" color={AnimoColors.white} style={styles.filterBadgeText}>
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
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AnimoSpacing.lg,
    paddingVertical: AnimoSpacing.sm,
    gap: AnimoSpacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    borderRadius: AnimoRadius.md,
    paddingHorizontal: AnimoSpacing.md,
    height: 50,
  },
  searchIcon: {
    marginRight: AnimoSpacing.xs,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_400Regular',
    color: AnimoColors.textHighEmphasis,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterIconButton: {
    width: 50,
    height: 50,
    borderRadius: AnimoRadius.md,
    backgroundColor: AnimoColors.surfacePrimary,
    borderWidth: 1,
    borderColor: AnimoColors.borderLowEmphasis,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterIconButtonActive: {
    backgroundColor: AnimoColors.accentPrimary,
    borderColor: AnimoColors.accentPrimary,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    lineHeight: 12,
  },
});
