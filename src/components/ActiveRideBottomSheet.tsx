import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, Dimensions, LayoutChangeEvent, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_PEEK = 112;
const SPRING = { damping: 22, stiffness: 220, mass: 0.8 };

type Props = {
  bottomInset?: number;
  children: React.ReactNode;
  /** Reports visible sheet height so map controls can sit above it */
  onVisibleHeightChange?: (height: number) => void;
};

/**
 * Draggable ride panel: pull down to peek (handle + summary), pull up to expand.
 * Tap the handle to toggle.
 */
export function ActiveRideBottomSheet({
  bottomInset = 0,
  children,
  onVisibleHeightChange,
}: Props) {
  const expandedHeight = useSharedValue(Math.min(320, SCREEN_HEIGHT * 0.42) + bottomInset);
  const dragY = useSharedValue(0); // 0 = fully expanded, positive = collapsed toward bottom
  const startY = useSharedValue(0);
  const measured = useSharedValue(false);

  const reportHeight = useCallback(
    (h: number) => {
      onVisibleHeightChange?.(Math.max(COLLAPSED_PEEK + bottomInset, h));
    },
    [onVisibleHeightChange, bottomInset]
  );

  useEffect(() => {
    reportHeight(expandedHeight.value - dragY.value);
  }, [reportHeight]);

  const onContentLayout = (e: LayoutChangeEvent) => {
    const contentH = e.nativeEvent.layout.height;
    const next = Math.min(
      Math.max(contentH + 28 + bottomInset, COLLAPSED_PEEK + bottomInset + 48),
      SCREEN_HEIGHT * 0.55
    );
    if (!measured.value || Math.abs(next - expandedHeight.value) > 8) {
      expandedHeight.value = next;
      measured.value = true;
      reportHeight(next - dragY.value);
    }
  };

  const snapTo = (collapse: boolean) => {
    'worklet';
    const maxDrag = Math.max(0, expandedHeight.value - (COLLAPSED_PEEK + bottomInset));
    const target = collapse ? maxDrag : 0;
    dragY.value = withSpring(target, SPRING, (finished) => {
      if (finished) {
        runOnJS(reportHeight)(expandedHeight.value - target);
      }
    });
  };

  const toggle = () => {
    const maxDrag = Math.max(0, expandedHeight.value - (COLLAPSED_PEEK + bottomInset));
    const collapse = dragY.value < maxDrag * 0.5;
    dragY.value = withSpring(collapse ? maxDrag : 0, SPRING, (finished) => {
      if (finished) {
        runOnJS(reportHeight)(expandedHeight.value - (collapse ? maxDrag : 0));
      }
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onBegin(() => {
      startY.value = dragY.value;
    })
    .onUpdate((e) => {
      const maxDrag = Math.max(0, expandedHeight.value - (COLLAPSED_PEEK + bottomInset));
      const next = Math.min(Math.max(startY.value + e.translationY, 0), maxDrag);
      dragY.value = next;
      runOnJS(reportHeight)(expandedHeight.value - next);
    })
    .onEnd((e) => {
      const maxDrag = Math.max(0, expandedHeight.value - (COLLAPSED_PEEK + bottomInset));
      const mid = maxDrag / 2;
      const shouldCollapse =
        e.velocityY > 500 || (e.velocityY >= -350 && dragY.value > mid);
      snapTo(shouldCollapse);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(toggle)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const sheetStyle = useAnimatedStyle(() => ({
    height: expandedHeight.value,
    transform: [{ translateY: dragY.value }],
  }));

  const collapsedHintStyle = useAnimatedStyle(() => {
    const maxDrag = Math.max(0, expandedHeight.value - (COLLAPSED_PEEK + bottomInset));
    return {
      opacity: interpolate(dragY.value, [0, maxDrag * 0.55, maxDrag], [0, 0, 1]),
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[styles.sheet, { paddingBottom: bottomInset + 8 }, sheetStyle]}
      >
        <Pressable onPress={toggle} style={styles.handleHit} hitSlop={8}>
          <View style={styles.dragHandle} />
          <Animated.View style={[styles.collapsedHint, collapsedHintStyle]} pointerEvents="none">
            <View style={styles.hintBar} />
          </Animated.View>
        </Pressable>
        <View onLayout={onContentLayout} style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    borderTopWidth: 3,
    borderTopColor: Colors.primary,
    overflow: 'hidden',
    zIndex: 50,
  },
  handleHit: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#C4C4C4',
  },
  collapsedHint: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    opacity: 0.35,
  },
  content: {
    flexGrow: 0,
  },
});
