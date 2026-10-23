import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TouchProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Shrink slightly while pressed — for cards and tiles, not list rows. */
  scale?: boolean;
  /** Draw the ripple outside the bounds (icon buttons). */
  borderless?: boolean;
  children?: React.ReactNode;
}

/**
 * The single pressable used across the app: Material ripple on Android,
 * optional press-scale for cards, and accessibility role "button".
 */
export function Touch({
  style,
  scale,
  borderless,
  children,
  onPressIn,
  onPressOut,
  ...rest
}: TouchProps) {
  const { colors } = useTheme();
  const value = useRef(new Animated.Value(1)).current;

  const to = (v: number) =>
    Animated.spring(value, {
      toValue: v,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      android_ripple={{ color: colors.ripple, borderless, foreground: true }}
      onPressIn={e => {
        if (scale) to(0.97);
        onPressIn?.(e);
      }}
      onPressOut={e => {
        if (scale) to(1);
        onPressOut?.(e);
      }}
      style={[style, scale && { transform: [{ scale: value }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
