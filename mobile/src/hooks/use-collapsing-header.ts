import { useCallback, useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Easing,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoV2Spacing } from '@/constants/animo';

/** How long the header takes to ease fully open/closed once scrolling stops. */
const SETTLE_MS = 260;
/** Content must slide this far (px) under the header before its divider is fully visible. */
const DIVIDER_FADE_PX = 16;

export type CollapsingHeaderOptions = {
  /** Pin the header fully open (e.g. while the spotlight tutorial measures its targets). */
  locked?: boolean;
  /**
   * iOS only: move the header down with the rubber band when the list is pulled past the top, so
   * a pull-to-refresh spinner stays visible instead of hiding behind the header.
   */
  followOverscroll?: boolean;
};

/**
 * Collapsing top block for a list screen.
 *
 * The header is rendered as an overlay (see `CollapsingHeader`) above a list that pads itself by
 * `headerHeight`. It slides up by exactly as many pixels as the list scrolls (so it behaves like
 * normal content, with no gap under it) and returns on scroll up.
 *
 * When it returns while the list is scrolled away from the top, only the compact controls come
 * back: the title row stays off-screen and slides in only as the list reaches the very top. The
 * title row is the element given `onTitleLayout`; everything below it is the compact bar.
 */
export function useCollapsingHeader({ locked = false, followOverscroll = false }: CollapsingHeaderOptions = {}) {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerHeightSV = useSharedValue(0);
  // Least the block may be slid up while scrolled away from the top: exactly the title row (minus
  // the status-bar inset and a little spacing), so the compact bar sits just under the status bar.
  const compactHiddenSV = useSharedValue(0);
  const hiddenPx = useSharedValue(0); // how far the block has slid up: 0 = shown, headerHeight = hidden
  const overscrollPx = useSharedValue(0); // iOS rubber band past the top (only if followOverscroll)
  const lastScrollY = useSharedValue(0);
  const lockedSV = useSharedValue(false); // pinned open

  /** Slide the header fully open. `resetScroll` is for a freshly mounted list, which starts at the top. */
  const showHeader = useCallback(
    (resetScroll = false) => {
      if (resetScroll) lastScrollY.value = 0;
      hiddenPx.value = withTiming(0, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) });
    },
    [hiddenPx, lastScrollY],
  );

  useEffect(() => {
    lockedSV.value = locked;
    if (locked) showHeader();
  }, [locked, lockedSV, showHeader]);

  // If scrolling stops with the block part-way, ease it to the nearer end: compact (controls only)
  // or fully hidden. Near the top it travels with the content (no snap, or a gap/overlap would
  // appear), so only settle past it.
  const settleHeader = () => {
    'worklet';
    const h = headerHeightSV.value;
    const compact = compactHiddenSV.value;
    const hidden = hiddenPx.value;
    if (lastScrollY.value < h || hidden <= compact || hidden >= h) return;
    hiddenPx.value = withTiming(hidden > (compact + h) / 2 ? h : compact, {
      duration: SETTLE_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (followOverscroll) overscrollPx.value = Math.max(-e.contentOffset.y, 0);

      // Clamp to the real scroll range so rubber-band bounce at either edge never moves the block.
      const maxY = Math.max(0, e.contentSize.height - e.layoutMeasurement.height);
      const y = Math.min(Math.max(e.contentOffset.y, 0), maxY);
      const dy = y - lastScrollY.value;
      lastScrollY.value = y;
      if (lockedSV.value) return;

      // react-native-web has no drag/momentum end events; it repeats the last scroll event once
      // scrolling has been idle for ~100ms. Treat that repeat as "stopped".
      if (dy === 0) {
        settleHeader();
        return;
      }

      // Follow the scroll 1:1, but never reveal more than the compact controls (the lower bound).
      // The final `y` bound keeps the block from sliding up faster than the content near the top,
      // which would leave a blank band under it; it also lets the title slide back in with the
      // content as the list reaches the top, because there `hidden` follows `y` down to 0.
      hiddenPx.value = Math.min(Math.max(hiddenPx.value + dy, compactHiddenSV.value), headerHeightSV.value, y);
    },
    onEndDrag: (e) => {
      // A fast release keeps coasting; onMomentumEnd settles it then.
      if (Math.abs(e.velocity?.y ?? 0) < 0.2) settleHeader();
    },
    onMomentumEnd: () => {
      settleHeader();
    },
  });

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hiddenPx.value + overscrollPx.value }],
  }));

  // The status-bar strip stands aside while the list is pulled past the top (iOS), or it would
  // cover the pull-to-refresh spinner. There is nothing to protect there: the block is fully open.
  const coverStyle = useAnimatedStyle(() => ({
    opacity: overscrollPx.value > 0 ? 0 : 1,
  }));

  // Divider under the block: fades in only while listings are scrolling underneath it. `scroll
  // offset - slid-up distance` is how far the content has moved under the block, so it is 0 at the
  // top and while the block travels with the content, and full once it floats over the cards.
  const dividerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max((lastScrollY.value - hiddenPx.value) / DIVIDER_FADE_PX, 0), 1),
  }));

  const onHeaderLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    headerHeightSV.value = h;
    setHeaderHeight(h);
  };

  // The title row's height includes the status-bar inset and some top spacing; the compact bar
  // keeps a small gap under the status bar and drops the rest.
  const onTitleLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    compactHiddenSV.value = Math.max(0, h - insets.top - AnimoV2Spacing.sm);
  };

  return {
    /** Measured height of the whole block; pad the list's content (and any non-scrolling state) by it. */
    headerHeight,
    /** Scroll handler for an Animated.ScrollView / Animated.FlatList. */
    onScroll,
    onHeaderLayout,
    /** Put on the title row (everything above the compact controls). */
    onTitleLayout,
    slideStyle,
    dividerStyle,
    coverStyle,
    showHeader,
  };
}

export type CollapsingHeaderController = ReturnType<typeof useCollapsingHeader>;
