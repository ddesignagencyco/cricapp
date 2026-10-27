import React, { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from './AppText';
import { IconButton } from './Primitives';

/** Height of every top bar below the status bar / notch, so all headers match. */
export const BAR_HEIGHT = 56;

/**
 * Light status-bar icons for dark, full-bleed screens (player, shorts, viewer).
 * Only while the screen is on top, so a screen opened over it gets the theme's bar back.
 */
export function LightStatusBar() {
  return useIsFocused() ? <StatusBar barStyle="light-content" /> : null;
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.background }, style]}>{children}</View>;
}

/** Width / height of the trimmed PCZ wordmark. */
export const LOGO_RATIO = 1337 / 686;

export function BrandMark({ height = 28 }: { height?: number }) {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={{ width: height * LOGO_RATIO, height }}
      resizeMode="contain"
      accessibilityLabel="PAK CRICZONE"
    />
  );
}

/**
 * Root header for tab screens. Home shows the PCZ mark (no title); every
 * other tab shows its own title. `flush`: no divider, for screens that
 * continue the bar (e.g. a pill row below).
 */
export function TabHeader({ title, right, flush }: { title?: string; right?: ReactNode; flush?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={[styles.tabHeader, styles.raised, { paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.hairline }, flush && styles.flush]}>
      {title ? null : <BrandMark />}
      {title ? (
        <AppText variant="section" style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

/** Pushed-screen header: back, title (+ subtitle), actions. */
export function Header({
  title,
  subtitle,
  right,
  transparent,
  onBack,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  transparent?: boolean;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const nav = useNavigation();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top },
        transparent
          ? { backgroundColor: 'transparent', borderBottomWidth: 0 }
          : [styles.raised, { backgroundColor: colors.surface, borderBottomColor: colors.hairline }],
      ]}
    >
      <IconButton icon="arrowLeft" label="Back" onPress={onBack ?? nav.goBack} />
      <View style={{ flex: 1, marginLeft: 4 }}>
        {title ? (
          <AppText variant={subtitle ? 'headline' : 'section'} numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        ) : null}
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.actions}>{right}</View>
    </View>
  );
}

type ViewType = React.ComponentRef<typeof View>;
type BodyScroll = { reveal: (target: ViewType | null, offset?: number) => void };
const BodyScrollContext = createContext<BodyScroll | null>(null);

/** Scrolls the nearest Body so `target` sits near the top (e.g. a just-posted comment). */
export function useBodyScroll() {
  return useContext(BodyScrollContext);
}

/** Vertical scroll body with pull-to-refresh and room for the tab bar. */
export function Body({
  children,
  onRefresh,
  refreshing = false,
  bottomInset = true,
  contentStyle,
  ...rest
}: ScrollViewProps & {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  bottomInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const y = useRef(0);
  const { onScroll } = rest;
  const handleScroll = useCallback<NonNullable<ScrollViewProps['onScroll']>>(
    e => {
      y.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    },
    [onScroll],
  );
  const reveal = useCallback((target: ViewType | null, offset = 96) => {
    const sv = scroll.current;
    if (!target || !sv) return;
    // Both positions on screen; the difference is how far to move from where we are.
    (sv as unknown as ViewType).measureInWindow((_x: number, top: number) => {
      target.measureInWindow((_tx: number, ty: number) => {
        sv.scrollTo({ y: Math.max(0, y.current + ty - top - offset), animated: true });
      });
    });
  }, []);
  const ctx = useMemo(() => ({ reveal }), [reveal]);
  return (
    <BodyScrollContext.Provider value={ctx}>
    <ScrollView
      ref={scroll}
      showsVerticalScrollIndicator={false}
      // Every page starts a step below its header; screens can override with contentStyle.
      contentContainerStyle={[{ paddingTop: space.md, paddingBottom: (bottomInset ? insets.bottom : 0) + 32 }, contentStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.brand]}
            progressBackgroundColor={colors.elevated}
          />
        ) : undefined
      }
      {...rest}
      onScroll={handleScroll}
      scrollEventThrottle={rest.scrollEventThrottle ?? 32}
    >
      {children}
    </ScrollView>
    </BodyScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    // Same bar height as pushed screens; the notch/status bar is added on top.
    minHeight: BAR_HEIGHT,
    boxSizing: 'content-box',
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xs,
    minHeight: BAR_HEIGHT,
    boxSizing: 'content-box',
    paddingRight: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  // A light lift so the bar reads as separate from the page it sits on.
  raised: { elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, zIndex: 2 },
  flush: { borderBottomWidth: 0, elevation: 0, shadowOpacity: 0 },
});
