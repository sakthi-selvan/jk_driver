import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Colors } from '../constants/theme';

type Props = {
  bottomInset?: number;
  /** Always visible (ETA / status / customer) */
  summary: React.ReactNode;
  /** Expandable details (addresses) — hidden when collapsed */
  details?: React.ReactNode;
  /** Always visible primary actions (End Ride / Start / OTP) */
  actions: React.ReactNode;
  onVisibleHeightChange?: (height: number) => void;
};

/**
 * Bottom ride panel that sizes to content.
 * Summary + End Ride/actions always stay visible; drag/tap handle toggles details.
 */
export function ActiveRideBottomSheet({
  bottomInset = 0,
  summary,
  details,
  actions,
  onVisibleHeightChange,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const reportHeight = useCallback(
    (h: number) => {
      onVisibleHeightChange?.(Math.round(h));
    },
    [onVisibleHeightChange]
  );

  const onSheetLayout = (e: LayoutChangeEvent) => {
    reportHeight(e.nativeEvent.layout.height);
  };

  useEffect(() => {
    // height reported via onLayout after expand/collapse
  }, [expanded]);

  const toggle = () => setExpanded((v) => !v);

  const pan = Gesture.Pan()
    .activeOffsetY([-16, 16])
    .onEnd((e) => {
      if (e.translationY > 40 || e.velocityY > 500) {
        runOnJS(setExpanded)(false);
      } else if (e.translationY < -40 || e.velocityY < -500) {
        runOnJS(setExpanded)(true);
      }
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(toggle)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 8) + 8 }]}
        onLayout={onSheetLayout}
      >
        <Pressable onPress={toggle} style={styles.handleHit} hitSlop={8}>
          <View style={[styles.dragHandle, expanded && styles.dragHandleActive]} />
        </Pressable>

        <View style={styles.summary}>{summary}</View>

        {expanded && details ? <View style={styles.details}>{details}</View> : null}

        <View style={styles.actions}>{actions}</View>
      </View>
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
  dragHandleActive: {
    backgroundColor: Colors.primary,
    opacity: 0.45,
  },
  summary: {
    marginBottom: 4,
  },
  details: {
    marginBottom: 8,
  },
  actions: {
    marginTop: 2,
  },
});
