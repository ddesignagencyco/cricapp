import React, { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';
import {
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

/** Nominal aspect ratio (width / height) of the wordmark lockup. */
export const LOGO_RATIO = 4.4;

/**
 * The Criczapp wordmark: a cricket-ball mark (a brand-blue disc with a white
 * seam) beside the name, with "app" picked out in brand blue. Drawn in views
 * and text so it stays crisp at any size and recolours with the theme.
 * `tone="light"` forces white letters for dark backgrounds (onboarding,
 * shorts); otherwise the name takes the theme's ink colour.
 */
export function BrandMark({ height = 28, tone }: { height?: number; tone?: 'light' | 'dark' }) {
  const { colors } = useTheme();
  const ink = tone === 'light' ? '#FFFFFF' : tone === 'dark' ? '#0C2A6B' : colors.text;
  const d = height * 0.94; // ball diameter
  const seam = Math.max(1.4, d * 0.075);
  const size = height * 0.64; // cap height of the word
  const letter = { fontSize: size, lineHeight: size * 1.06, letterSpacing: -height * 0.03 } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="image" accessibilityLabel="Criczapp">
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* seam: two stitched arcs across a blue ball */}
        <View style={{ width: d * 0.46, height: d * 1.3, borderLeftWidth: seam, borderRightWidth: seam, borderColor: 'rgba(255,255,255,0.92)', borderRadius: d, transform: [{ rotate: '34deg' }] }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginLeft: height * 0.2 }}>
        <AppText weight="700" color={ink} style={letter}>Cricz</AppText>
        <AppText weight="700" color={colors.brand} style={letter}>app</AppText>
      </View>
    </View>
  );
}

/**
 * Root header for tab screens. Home shows the Criczapp mark (no title); every
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
