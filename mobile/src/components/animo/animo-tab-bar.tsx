import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { CommonActions, StackActions } from '@react-navigation/native';
import type { ComponentProps, ReactElement } from 'react';
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
  /** Outline when idle, filled when focused — the state cue that does not depend on color. */
  icon: TabIonicon;
  /** Red count badge (e.g. pending requests on Aking Ani). Takes precedence over `showBadge`. */
  badgeCount?: number;
  /** When true, shows a small attention dot on the icon (boolean, not a count). */
  showBadge?: boolean;
};

/**
 * A verb among the nouns. An action slot sits in the row but goes nowhere you can come back
 * from, so it carries no label and wears the solid brand fill: in a bar where the tabs are
 * quiet, it is the one thing to do rather than a place you are.
 */
export type TabAction = {
  icon: IoniconName;
  /** Spoken label — the button shows no text of its own. */
  accessibilityLabel: string;
  onPress: () => void;
  /** Where it sits among the tabs (0-based). */
  index: number;
};

const TAB_HEIGHT = AnimoV2Size.tabItemMinHeight;
const EDGE = AnimoV2Size.depth;
/** Full tappable height of a slot: the tab itself plus room for the action's bottom edge. */
const SLOT_HEIGHT = TAB_HEIGHT + EDGE;

const ICON_SIZE = 26;
const LABEL_HEIGHT = 16;
const ICON_LABEL_GAP = 2;

/** Sized to the icon row, so it lines up with the tab glyphs and leaves the label row empty. */
const ACTION_HEIGHT = 40;
const ACTION_WIDTH = 48;
const ACTION_SLOT_WIDTH = 56;
/** Where a tab glyph's centre lands once icon + label are centred in the slot. */
const ICON_CENTRE = (SLOT_HEIGHT - (ICON_SIZE + ICON_LABEL_GAP + LABEL_HEIGHT)) / 2 + ICON_SIZE / 2;
/** Offsets the action so its centre matches that of the tab glyphs beside it. */
const ACTION_TOP = Math.round(ICON_CENTRE - ACTION_HEIGHT / 2);

/**
 * Reusable bottom navigation bar. Pass it as the `tabBar` of an Expo Router
 * `Tabs` layout along with the `items` for that module (buyer or farmer):
 *
 *   <Tabs tabBar={(props) => <AnimoTabBar {...props} items={BUYER_TABS} />}>
 *
 * The focused tab is shown by a filled icon plus a brand-green, heavier label — no filled pill,
 * so the bar never competes with the primary action on the screen above it. Routing and active
 * state come from the navigator, so it works with the back button out of the box.
 */
export function AnimoTabBar({
  state,
  navigation,
  descriptors,
  items,
  action,
}: BottomTabBarProps & {
  items: TabItem[];
  /** Optional non-route button in the row (e.g. the farmer's "new listing"). */
  action?: TabAction;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  // Respect `tabBarStyle: { display: 'none' }` set per screen (e.g. focused
  // sub-flows that have their own bottom action button).
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const tabBarStyle = focusedOptions?.tabBarStyle as { display?: string } | undefined;
  if (tabBarStyle?.display === 'none') {
    return null;
  }

  const tabs: ReactElement[] = [];
  state.routes.forEach((route, index) => {
    const item = items.find((i) => i.name === route.name);
    if (!item) return;

    const focused = state.index === index;
    const color = focused ? AnimoV2Colors.textBrand : AnimoV2Colors.textSecondary;
    const displayLabel = item.labelKey ? t(item.labelKey) : item.label;
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

    tabs.push(
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={count > 0 ? `${displayLabel}, ${count}` : displayLabel}
        onPress={onPress}
        style={({ pressed }) => [styles.tabSlot, pressed && styles.pressed]}>
        <View style={styles.tab}>
          <View>
            <Ionicons name={focused ? item.icon.filled : item.icon.outline} size={ICON_SIZE} color={color} />
            {count > 0 ? (
              <View style={styles.badge}>
                <AnimoText variant="tagV2" color="#FFFFFF" style={styles.badgeText}>
                  {count > 99 ? '99+' : count}
                </AnimoText>
              </View>
            ) : item.showBadge ? (
              <View style={styles.dot} />
            ) : null}
          </View>
          <AnimoText
            variant="tagV2"
            color={color}
            numberOfLines={1}
            style={focused ? styles.labelOn : styles.label}>
            {displayLabel}
          </AnimoText>
        </View>
      </Pressable>,
    );
  });

  const row = action
    ? [
        ...tabs.slice(0, action.index),
        <ActionSlot
          key="tab-action"
          icon={action.icon}
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
        />,
        ...tabs.slice(action.index),
      ]
    : tabs;

  return (
    <View style={styles.rim}>
      <View
        style={[
          styles.bar,
          { paddingBottom: Math.max(insets.bottom, AnimoV2Spacing.sm) },
        ]}>
        {row}
      </View>
    </View>
  );
}

/** Solid brand square with the house 4px bottom edge, so it reads as pressable, not as a tab. */
function ActionSlot({ icon, accessibilityLabel, onPress }: Omit<TabAction, 'index'>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.actionSlot, pressed && styles.pressed]}>
      <View style={styles.actionStack}>
        <View style={styles.actionEdge} />
        <View style={styles.actionFace}>
          <Ionicons name={icon} size={ICON_SIZE} color={AnimoV2Colors.actionOnPrimary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** 2px beige hairline above the bar, drawn as its own view so the rounded corners are never cropped. */
  rim: {
    paddingTop: 2,
    backgroundColor: AnimoV2Colors.borderDefault,
    borderTopLeftRadius: AnimoV2Radius.xl,
    borderTopRightRadius: AnimoV2Radius.xl,
    elevation: 8,
    shadowColor: AnimoV2Colors.textPrimary,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AnimoV2Spacing.xs,
    paddingHorizontal: AnimoV2Spacing.sm,
    paddingTop: AnimoV2Spacing.sm,
    backgroundColor: AnimoV2Colors.surfaceCard,
    borderTopLeftRadius: AnimoV2Radius.xl,
    borderTopRightRadius: AnimoV2Radius.xl,
  },
  tabSlot: { flex: 1, minWidth: 0, height: SLOT_HEIGHT },
  pressed: { opacity: 0.6 },
  /** Fills the slot and centres icon + label in it, so the spare pixels sit evenly above and below. */
  tab: {
    height: SLOT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ICON_LABEL_GAP,
    paddingHorizontal: 2,
  },
  actionSlot: {
    width: ACTION_SLOT_WIDTH,
    height: SLOT_HEIGHT,
    alignItems: 'center',
    paddingTop: ACTION_TOP,
  },
  actionStack: { width: ACTION_WIDTH, height: ACTION_HEIGHT + EDGE },
  /** Darker edge below the face (absolutely positioned: Android can't do hard shadows). */
  actionEdge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: EDGE,
    height: ACTION_HEIGHT,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.actionPrimaryDepth,
  },
  actionFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ACTION_HEIGHT,
    borderRadius: AnimoV2Radius.md,
    backgroundColor: AnimoV2Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, lineHeight: 16 },
  labelOn: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, lineHeight: 16 },
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
