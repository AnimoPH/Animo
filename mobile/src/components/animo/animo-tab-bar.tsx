import { Ionicons } from '@expo/vector-icons';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, StackActions } from '@react-navigation/native';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoText } from '@/components/animo/animo-text';
import { AnimoV2Colors, AnimoV2Radius, AnimoV2Size, AnimoV2Spacing } from '@/constants/animo';
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
  /** Legacy Ionicons pair, used when `lucide` is not provided. */
  icon: TabIonicon;
  /** v2 Lucide icon (DESIGN_SPEC section 7). Preferred over `icon`. */
  lucide?: LucideIcon;
  /** Red count badge (e.g. pending requests on Aking Ani). Takes precedence over `showBadge`. */
  badgeCount?: number;
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
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, AnimoV2Spacing.md) + AnimoV2Spacing.sm }]}>
      {state.routes.map((route, index) => {
        const item = items.find((i) => i.name === route.name);
        if (!item) return null;

        const focused = state.index === index;
        const color = focused ? AnimoV2Colors.textOnBrand : AnimoV2Colors.textSecondary;
        const displayLabel = item.labelKey ? t(item.labelKey) : item.label;
        const LucideGlyph = item.lucide;
        const count = item.badgeCount ?? 0;

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
            accessibilityLabel={count > 0 ? `${displayLabel}, ${count}` : displayLabel}
            onPress={onPress}
            style={styles.tabSlot}>
            <View style={[styles.tabEdge, focused && styles.tabEdgeOn]}>
              <View style={[styles.tab, focused && styles.tabOn]}>
                <View>
                  {LucideGlyph ? (
                    <LucideGlyph size={26} color={color} strokeWidth={focused ? 2.75 : 2.25} />
                  ) : (
                    <Ionicons name={focused ? item.icon.filled : item.icon.outline} size={26} color={color} />
                  )}
                  {count > 0 ? (
                    <View style={[styles.badge, focused && { borderColor: AnimoV2Colors.actionPrimary }]}>
                      <AnimoText variant="tagV2" color="#FFFFFF" style={styles.badgeText}>
                        {count > 99 ? '99+' : count}
                      </AnimoText>
                    </View>
                  ) : item.showBadge ? (
                    <View style={[styles.dot, focused && { borderColor: AnimoV2Colors.actionPrimary }]} />
                  ) : null}
                </View>
                <AnimoText
                  variant="tagV2"
                  color={color}
                  numberOfLines={1}
                  style={[styles.label, focused && styles.labelOn]}>
                  {displayLabel}
                </AnimoText>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  /** White bar, rounded top corners, 4px top edge and a soft upward shadow. */
  bar: {
    flexDirection: 'row',
    gap: AnimoV2Spacing.xs,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingTop: 10,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderTopLeftRadius: AnimoV2Radius.xl,
    borderTopRightRadius: AnimoV2Radius.xl,
    borderTopWidth: 4,
    borderTopColor: AnimoV2Colors.borderDefault,
    elevation: 16,
    shadowColor: AnimoV2Colors.textPrimary,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
  },
  tabSlot: { flex: 1, minWidth: 0 },
  tabEdge: { borderRadius: AnimoV2Radius.lg, paddingBottom: 0 },
  tabEdgeOn: { backgroundColor: AnimoV2Colors.actionPrimaryDepth, paddingBottom: AnimoV2Size.depth },
  tab: {
    minHeight: AnimoV2Size.tabItemMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: AnimoV2Radius.lg,
    paddingHorizontal: 2,
  },
  tabOn: { backgroundColor: AnimoV2Colors.actionPrimary },
  label: { fontFamily: 'Nunito_600SemiBold' },
  labelOn: { fontFamily: 'Nunito_800ExtraBold' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 16, fontFamily: 'Nunito_800ExtraBold' },
  /** Attention dot (no count). */
  dot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AnimoV2Colors.dangerSolid,
    borderWidth: 2,
    borderColor: AnimoV2Colors.surfaceCard,
  },
});
