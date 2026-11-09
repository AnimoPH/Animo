import { Pressable, StyleSheet, View } from 'react-native';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Spacing } from '@/constants/animo';

export type SegmentedTabsProps<K extends string> = {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
};

/** v2 segmented control: muted track, white selected segment. */
export function SegmentedTabs<K extends string>({ tabs, value, onChange }: SegmentedTabsProps<K>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const on = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(tab.key)}
            style={[styles.seg, on && styles.segOn]}>
            <AnimoText variant="bodyStrong" color={on ? AnimoV2Colors.textBrand : AnimoV2Colors.textSecondary}>
              {tab.label}
            </AnimoText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: AnimoV2Colors.surfaceMuted,
    borderRadius: AnimoV2Radius.md,
    padding: AnimoV2Spacing.xs,
    gap: AnimoV2Spacing.xs,
  },
  seg: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: AnimoV2Radius.sm },
  segOn: { backgroundColor: AnimoV2Colors.surfaceCard, borderBottomWidth: 2, borderBottomColor: AnimoV2Colors.edgeSoft },
});
