import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AppText } from './AppText';
import { Chip } from './Primitives';
import { Touch } from './Touch';
import type { IconName } from './Icon';

/** Two-to-four option switch with a sliding thumb. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex(o => o.key === value));
  const x = useRef(new Animated.Value(index)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, speed: 22, bounciness: 2 }).start();
  }, [index, x]);
  const seg = w / options.length;
  return (
    <View
      onLayout={e => setW(e.nativeEvent.layout.width - 6)}
      style={[styles.segmented, { backgroundColor: colors.elevated, borderColor: colors.hairline }, style]}
      accessibilityRole="tablist"
    >
      {w > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            {
              width: seg,
              backgroundColor: colors.scheme === 'dark' ? colors.pressed : colors.surface,
              borderColor: colors.border,
              transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
            },
          ]}
        />
      ) : null}
      {options.map(o => (
        <Touch
          key={o.key}
          onPress={() => onChange(o.key)}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
          style={styles.segment}
        >
          <AppText variant="label" weight="600" color={o.key === value ? 'text' : 'textMuted'}>
            {o.label}
          </AppText>
        </Touch>
      ))}
    </View>
  );
}

/** Horizontally scrolling chip filter. */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[{ paddingHorizontal: space.lg, gap: space.sm }, style]}
    >
      {options.map(o => (
        <Chip key={o.key} label={o.label} icon={o.icon} selected={o.key === value} onPress={() => onChange(o.key)} />
      ))}
    </ScrollView>
  );
}

export function Skeleton({ width, height, r = radius.sm, style }: { width?: number | `${number}%`; height: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: r, backgroundColor: colors.skeleton },
        { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        style,
      ]}
    />
  );
}

/** A card-shaped placeholder list while a screen's first fetch runs. */
export function SkeletonList({ count = 4, height = 92 }: { count?: number; height?: number }) {
  return (
    <View style={{ paddingHorizontal: space.lg, gap: space.md, paddingTop: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} r={radius.lg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    height: 40,
    borderRadius: radius.sm + 2,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  thumb: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: radius.sm - 1,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
});
