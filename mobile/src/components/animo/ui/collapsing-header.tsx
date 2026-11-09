import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimoV2Colors } from '@/constants/animo';
import type { CollapsingHeaderController } from '@/hooks/use-collapsing-header';

/**
 * Overlay that holds a list screen's top block (title, search, tabs, ...) and slides it away as the
 * list scrolls. Render it AFTER the list so it sits on top, and drive it with `useCollapsingHeader`.
 *
 * Also draws a hairline under the block (visible only while content scrolls beneath it) and an
 * opaque strip over the status bar so listings never show behind it while the block is hidden.
 */
export function CollapsingHeader({
  header,
  children,
}: {
  header: CollapsingHeaderController;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Animated.View style={[styles.container, header.slideStyle]} onLayout={header.onHeaderLayout}>
        {children}
        <Animated.View style={[styles.divider, header.dividerStyle]} />
      </Animated.View>
      <Animated.View style={[styles.statusBarCover, { height: insets.top }, header.coverStyle]} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: AnimoV2Colors.surfaceApp,
  },
  divider: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -2,
    height: 2,
    backgroundColor: AnimoV2Colors.edgeSoft,
    pointerEvents: 'none',
  },
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    backgroundColor: AnimoV2Colors.surfaceApp,
    pointerEvents: 'none',
  },
});
