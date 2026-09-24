import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, StackActions } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoColors, AnimoRadius, AnimoSpacing } from '@/constants/animo';
import { useLanguage } from '@/hooks/use-language';
import type { TranslationKey } from '@/i18n/translations';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Outline (idle) + filled (focused) Ionicons pair for a single tab. */
export type TabIonicon = {
  outline: IoniconName;
  filled: IoniconName;
};

export type TabItem = {
  /**
   * If this tab is a nested navigator (e.g. a Stack), the route name of its
   * initial screen. Tapping the tab returns to this screen instead of restoring
   * wherever the user last was inside it.
   */
  rootScreen?: string;
  /** Route name registered in the Tabs layout (file name without extension). */
  name: string;
  label: string;
  labelKey?: TranslationKey;
  icon: TabIonicon;
  /** When true, shows a small attention dot on the icon (boolean, not a count). */
  showBadge?: boolean;
};

/**
 * Reusable bottom navigation bar. Pass it as the `tabBar` of an Expo Router
 * `Tabs` layout along with the `items` for that module (buyer or farmer):
 *
 *   <Tabs tabBar={(props) => <AnimoTabBar {...props} items={BUYER_TABS} />}>
 *
 * Rounded card, Ionicons (outline idle / filled focused), brand-green active
 * state. Routing/active state come from the navigator, so it works with the
 * back button out of the box.
 */
export function AnimoTabBar({
  state,
  navigation,
  descriptors,
  items,
}: BottomTabBarProps & { items: TabItem[] }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  // Respect `tabBarStyle: { display: 'none' }` set per screen (e.g. focused
  // sub-flows that have their own bottom action button).
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as { display?: string } | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, AnimoSpacing.md) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const item = items.find((i) => i.name === route.name);
          if (!item) return null;

          const focused = state.index === index;
          const color = focused ? AnimoColors.green : AnimoColors.muted;
          const displayLabel = item.labelKey ? t(item.labelKey) : item.label;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;

            // Tapping the tab you're already on does nothing.
            if (focused) return;

            if (item.rootScreen) {
              // Nested navigator (e.g. the Palengke stack): enter at its root
              // screen rather than restoring the last-visited sub-screen, and
              // clear any sub-screens left from a previous visit.
              navigation.dispatch(
                CommonActions.navigate({
                  name: route.name,
                  params: { screen: item.rootScreen },
                }),
              );
              if (route.state?.key) {
                navigation.dispatch({
                  ...StackActions.popToTop(),
                  target: route.state.key,
                });
              }
            } else {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={displayLabel}
              onPress={onPress}
              style={styles.tab}>
              <View style={styles.iconSlot}>
                <Ionicons
                  name={focused ? item.icon.filled : item.icon.outline}
                  size={24}
                  color={color}
                />
                {item.showBadge ? <View style={styles.needsActionDot} /> : null}
              </View>
              <AnimoText variant="tag" color={color} style={styles.label}>
                {displayLabel}
              </AnimoText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: AnimoSpacing.md,
    paddingTop: AnimoSpacing.sm,
    backgroundColor: AnimoColors.background,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: AnimoColors.white,
    borderWidth: 1,
    borderColor: AnimoColors.border,
    borderRadius: AnimoRadius.lg,
    paddingVertical: AnimoSpacing.sm,
    paddingHorizontal: AnimoSpacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: AnimoSpacing.xs,
  },
  /** Relative slot so the needs-action dot can sit on the glyph corner. */
  iconSlot: {
    position: 'relative',
  },
  /** Matches AppHeader notification bell unreadDot. */
  needsActionDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AnimoColors.danger,
    borderWidth: 1.5,
    borderColor: AnimoColors.white,
  },
  label: {
    fontSize: 12.5,
  },
});
