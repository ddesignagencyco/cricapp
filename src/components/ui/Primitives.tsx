import React, { useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { Touch } from './Touch';

export function Hairline({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth * 2, marginLeft: inset, backgroundColor: colors.hairline },
        style,
      ]}
    />
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const { colors } = useTheme();
  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.hairline },
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <Touch scale onPress={onPress} style={base}>
        {children}
      </Touch>
    );
  }
  return <View style={base}>{children}</View>;
}

/** Red dot + text. Live state is never shown as a filled pill. */
export function LiveIndicator({ label = 'LIVE', size = 'sm' }: { label?: string; size?: 'sm' | 'md' }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const dot = size === 'md' ? 8 : 6;
  return (
    <View style={styles.row} accessibilityLabel="Live">
      <View style={{ width: dot * 2.4, height: dot * 2.4, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: dot * 2.4,
            height: dot * 2.4,
            borderRadius: dot * 1.2,
            backgroundColor: colors.live,
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        />
        <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: colors.live }} />
      </View>
      <AppText variant={size === 'md' ? 'label' : 'micro'} weight="700" color="live" style={{ marginLeft: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'pakistan' | 'psl';

/** Small rounded label for status and metadata (never for live). */
export function Tag({ label, tone = 'neutral', icon, style }: { label: string; tone?: Tone; icon?: IconName; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const map: Record<Tone, [string, string]> = {
    neutral: [colors.elevated, colors.textSecondary],
    brand: [colors.brandSoft, colors.accent],
    success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    danger: [colors.dangerSoft, colors.danger],
    pakistan: [colors.pakistanSoft, colors.pakistan],
    psl: [colors.pslSoft, colors.psl],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={fg} style={{ marginRight: 4 }} /> : null}
      <AppText variant="micro" color={fg}>
        {label}
      </AppText>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <Touch
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.text : colors.elevated,
          borderColor: selected ? colors.text : colors.border,
        },
      ]}
    >
      {icon ? (
        <Icon name={icon} size={15} color={selected ? colors.background : colors.textSecondary} style={{ marginRight: 6 }} />
      ) : null}
      <AppText variant="label" weight="600" color={selected ? colors.background : colors.textSecondary}>
        {label}
      </AppText>
    </Touch>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  size = 22,
  badge,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  color?: string;
  size?: number;
  badge?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Touch borderless onPress={onPress} accessibilityLabel={label} style={styles.iconBtn} hitSlop={4}>
      <Icon name={icon} size={size} color={color ?? colors.text} />
      {badge ? (
        <View style={[styles.badgeDot, { backgroundColor: colors.live, borderColor: colors.background }]} />
      ) : null}
    </Touch>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  compact,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const bg = variant === 'primary' ? colors.brand : variant === 'secondary' ? colors.elevated : 'transparent';
  const fg = variant === 'primary' ? colors.onBrand : variant === 'secondary' ? colors.text : colors.accent;
  return (
    <Touch
      scale
      onPress={onPress}
      style={[
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? colors.border : 'transparent' },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={18} color={fg} style={{ marginRight: 8 }} /> : null}
      <AppText variant={compact ? 'label' : 'headline'} weight="600" color={fg}>
        {label}
      </AppText>
    </Touch>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  overline,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  overline?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flex: 1 }}>
        {overline ? (
          <AppText variant="overline" color="textMuted" style={{ marginBottom: 4 }}>
            {overline}
          </AppText>
        ) : null}
        <AppText variant="section" accessibilityRole="header">
          {title}
        </AppText>
      </View>
      {action ? (
        <Touch onPress={onAction} style={styles.sectionAction} hitSlop={8}>
          <AppText variant="label" weight="600" color="accent">
            {action}
          </AppText>
          <Icon name="chevronRight" size={16} color={colors.accent} />
        </Touch>
      ) : null}
    </View>
  );
}

/** A soft colour bloom from a tinted radial image (no gradient module). */
export function Glow({
  color,
  size = 260,
  opacity = 0.35,
  style,
}: {
  color: string;
  size?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Image
        source={require('../../assets/images/glow.png')}
        style={{ width: size, height: size, tintColor: color, opacity }}
        resizeMode="stretch"
      />
    </View>
  );
}

/** Vertical fade from `color` to transparent (top → bottom unless flipped). */
export function Fade({
  color,
  height,
  flip,
  opacity = 1,
  style,
}: {
  color: string;
  height: number;
  flip?: boolean;
  opacity?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      pointerEvents="none"
      source={require('../../assets/images/fade.png')}
      resizeMode="stretch"
      style={[
        { width: '100%', height, tintColor: color, opacity },
        flip && { transform: [{ scaleY: -1 }] },
        style,
      ]}
    />
  );
}

export function ProgressBar({
  value,
  color,
  track,
  height = 6,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, value]);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? colors.elevated, overflow: 'hidden' }}>
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color ?? colors.brand,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.elevated }]}>
        <Icon name={icon} size={26} color={colors.textMuted} />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: 6, maxWidth: 280 }}>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

export function Row({ children, style, gap }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[styles.row, gap != null && { gap }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  padded: { padding: space.lg },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  button: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: space.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  buttonCompact: { height: 40, paddingHorizontal: space.lg, borderRadius: radius.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  sectionAction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, minHeight: 32 },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
});
