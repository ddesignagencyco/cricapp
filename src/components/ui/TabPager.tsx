import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from './AppText';
import { Touch } from './Touch';

export interface PagerTab {
  key: string;
  label: string;
}

interface Layout {
  x: number;
  w: number;
}

/** Scrollable row of section pills; the selected one is filled and kept in view. */
function TabStrip({ tabs, index, onSelect }: { tabs: PagerTab[]; index: number; onSelect: (i: number) => void }) {
  const { colors } = useTheme();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const strip = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const onTabLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts(prev => {
      const next = [...prev];
      next[i] = { x, w: width };
      return next;
    });
  };

  useEffect(() => {
    const l = layouts[index];
    if (l) strip.current?.scrollTo({ x: Math.max(0, l.x - 48), animated: true });
  }, [index, layouts]);

  return (
    <View style={[styles.stripWrap, { backgroundColor: colors.surface, borderBottomColor: colors.hairline }]}>
      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {tabs.map((t, i) => {
          const on = i === index;
          return (
            <Touch
              key={t.key}
              onLayout={onTabLayout(i)}
              onPress={() => onSelect(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={[styles.pill, { backgroundColor: on ? colors.brand : colors.elevated }]}
            >
              <AppText variant="label" weight={on ? '700' : '600'} color={on ? '#FFFFFF' : 'textSecondary'}>
                {t.label}
              </AppText>
            </Touch>
          );
        })}
      </ScrollView>
    </View>
  );
}

/**
 * Swipeable pages under a tab strip. Pages render on first visit and stay
 * mounted, so switching back is instant and keeps scroll position.
 */
export function TabPager({
  tabs,
  renderPage,
  initialKey,
  header,
}: {
  tabs: PagerTab[];
  renderPage: (key: string) => ReactNode;
  initialKey?: string;
  header?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const initial = Math.max(0, tabs.findIndex(t => t.key === initialKey));
  const [index, setIndex] = useState(initial);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([initial]));
  const scrollX = useRef(new Animated.Value(initial * width)).current;
  const list = useRef<FlatList<PagerTab>>(null);

  const go = useCallback(
    (i: number) => {
      setIndex(i);
      setVisited(v => (v.has(i) ? v : new Set(v).add(i)));
      list.current?.scrollToOffset({ offset: i * width, animated: true });
    },
    [width],
  );

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
      setVisited(v => (v.has(i) ? v : new Set(v).add(i)));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {header}
      <TabStrip tabs={tabs} index={index} onSelect={go} />
      <Animated.FlatList
        ref={list as never}
        data={tabs}
        keyExtractor={t => t.key}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initial}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={onEnd}
        scrollEventThrottle={16}
        windowSize={3}
        renderItem={({ item, index: i }) => (
          <View style={{ width, flex: 1 }}>{visited.has(i) ? renderPage(item.key) : null}</View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stripWrap: { borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  strip: { paddingHorizontal: space.lg, paddingVertical: 10, gap: space.sm },
  pill: { height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center', overflow: 'hidden' },
});
