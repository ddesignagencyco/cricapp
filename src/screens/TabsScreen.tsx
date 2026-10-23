import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Icon } from '../components/ui/Icon';
import { Touch } from '../components/ui/Touch';
import { useIsFocused, useParams } from '../navigation/Stack';
import { TABS, type TabKey } from '../navigation/tabs';
import { useTheme } from '../theme/ThemeProvider';
import HomeScreen from './home/HomeScreen';
import LiveScreen from './live/LiveScreen';
import MoreScreen from './more/MoreScreen';
import NewsScreen from './news/NewsScreen';
import PredictScreen from './predict/PredictScreen';

const SCREENS: Record<TabKey, React.ComponentType> = {
  home: HomeScreen,
  live: LiveScreen,
  predict: PredictScreen,
  news: NewsScreen,
  more: MoreScreen,
};

export const BAR_HEIGHT = 64;

function TabButton({ tab, active, onPress }: { tab: (typeof TABS)[number]; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: active ? 1 : 0, useNativeDriver: true, speed: 24, bounciness: 6 }).start();
  }, [active, v]);
  return (
    <Touch
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      style={styles.tab}
    >
      <View style={styles.iconWrap}>
        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: colors.brandSoft, opacity: v, transform: [{ scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
          ]}
        />
        <Icon name={tab.icon} size={22} color={active ? colors.accent : colors.textMuted} />
      </View>
      <AppText variant="micro" weight={active ? '700' : '500'} color={active ? 'text' : 'textMuted'} style={{ marginTop: 4, letterSpacing: 0.1 }}>
        {tab.label}
      </AppText>
    </Touch>
  );
}

export default function TabsScreen() {
  const params = useParams('Tabs');
  const focused = useIsFocused();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>(params?.tab ?? 'home');
  const [mounted, setMounted] = useState<Set<TabKey>>(() => new Set([params?.tab ?? 'home']));

  const select = (k: TabKey) => {
    setTab(k);
    setMounted(m => (m.has(k) ? m : new Set(m).add(k)));
  };

  // Back on a non-home tab returns to Home before leaving the app.
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab !== 'home') {
        select('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [focused, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {TABS.map(t => {
          if (!mounted.has(t.key)) return null;
          const S = SCREENS[t.key];
          const on = t.key === tab;
          return (
            <View
              key={t.key}
              style={[StyleSheet.absoluteFill, { display: on ? 'flex' : 'none' }]}
              importantForAccessibility={on ? 'auto' : 'no-hide-descendants'}
            >
              <S />
            </View>
          );
        })}
      </View>
      <View
        style={[
          styles.bar,
          { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, backgroundColor: colors.tabBar, borderTopColor: colors.hairline },
        ]}
        accessibilityRole="tablist"
      >
        {TABS.map(t => (
          <TabButton key={t.key} tab={t} active={t.key === tab} onPress={() => select(t.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth * 2 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFill, borderRadius: 16 },
});
