import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { RouteName, Routes } from './routes';
import { ScreenBoundary } from '../components/ui/ScreenBoundary';
import { reduceMotion } from '../utils/motion';

/**
 * A small animated stack navigator in plain JS: push / replace / back /
 * reset and the Android back gesture, without the native modules a full
 * navigation library compiles.
 */

interface Entry {
  key: string;
  name: RouteName;
  params: unknown;
  progress: Animated.Value;
}

type ParamArgs<K extends RouteName> = undefined extends Routes[K] ? [params?: Routes[K]] : [params: Routes[K]];

export interface Navigation {
  navigate: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  replace: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  reset: <K extends RouteName>(name: K, ...params: ParamArgs<K>) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

const NavigationContext = createContext<Navigation | null>(null);
const RouteContext = createContext<{ name: RouteName; params: unknown; focused: boolean } | null>(null);

let seed = 0;
const makeEntry = (name: RouteName, params: unknown, shown: boolean): Entry => ({
  key: `${name}-${++seed}`,
  name,
  params,
  progress: new Animated.Value(shown ? 1 : 0),
});

const IN = { duration: 320, easing: Easing.bezier(0.2, 0.9, 0.25, 1), useNativeDriver: true };
const OUT = { duration: 240, easing: Easing.bezier(0.4, 0, 0.8, 0.6), useNativeDriver: true };

export function Stack({
  screens,
  initialRoute,
}: {
  screens: { [K in RouteName]: ComponentType };
  initialRoute: RouteName;
}) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [stack, setStack] = useState<Entry[]>(() => [makeEntry(initialRoute, undefined, true)]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const animating = useRef(false);

  const push = useCallback((entry: Entry, after?: () => void) => {
    animating.current = true;
    setStack(s => [...s, entry]);
    Animated.timing(entry.progress, { toValue: 1, ...IN, duration: reduceMotion() ? 0 : IN.duration }).start(() => {
      animating.current = false;
      after?.();
    });
  }, []);

  const navigation = useMemo<Navigation>(
    () => ({
      navigate: (name, ...[params]) => {
        if (animating.current) return;
        push(makeEntry(name, params, false));
      },
      replace: (name, ...[params]) => {
        if (animating.current) return;
        const entry = makeEntry(name, params, false);
        push(entry, () => setStack(s => [...s.slice(0, -2), entry]));
      },
      reset: (name, ...[params]) => {
        animating.current = false;
        setStack([makeEntry(name, params, true)]);
      },
      goBack: () => {
        const current = stackRef.current;
        if (animating.current || current.length < 2) return;
        const top = current[current.length - 1];
        animating.current = true;
        Animated.timing(top.progress, { toValue: 0, ...OUT, duration: reduceMotion() ? 0 : OUT.duration }).start(() => {
          animating.current = false;
          setStack(s => s.filter(e => e.key !== top.key));
        });
      },
      canGoBack: () => stackRef.current.length > 1,
    }),
    [push],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stackRef.current.length > 1) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  return (
    <NavigationContext.Provider value={navigation}>
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        {stack.map((entry, index) => {
          const Screen = screens[entry.name];
          const isTop = index === stack.length - 1;
          const next = stack[index + 1];
          // The screen underneath drifts left and dims as the next slides in.
          const under = next
            ? {
                transform: [
                  { translateX: next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, -width * 0.22] }) },
                ],
              }
            : null;
          const own =
            index > 0
              ? {
                  transform: [
                    { translateX: entry.progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) },
                  ],
                }
              : null;
          return (
            <Animated.View
              key={entry.key}
              pointerEvents={isTop ? 'auto' : 'none'}
              importantForAccessibility={isTop ? 'auto' : 'no-hide-descendants'}
              style={[styles.screen, { backgroundColor: colors.background }, index > 0 && styles.raised, own, under]}
            >
              <RouteContext.Provider value={{ name: entry.name, params: entry.params, focused: isTop }}>
                {/* A crash stays inside this screen; earlier screens remain usable. */}
                <ScreenBoundary onBack={index > 0 ? navigation.goBack : undefined}>
                  <Screen />
                </ScreenBoundary>
              </RouteContext.Provider>
              {next ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    styles.dim,
                    { opacity: next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
                  ]}
                />
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </NavigationContext.Provider>
  );
}

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext);
  if (!nav) throw new Error('useNavigation must be used inside a Stack');
  return nav;
}

export function useParams<K extends RouteName>(_name: K): Routes[K] {
  return useContext(RouteContext)?.params as Routes[K];
}

/** False while another screen is pushed on top (pause timers, etc.). */
export function useIsFocused() {
  return useContext(RouteContext)?.focused ?? true;
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  screen: { ...StyleSheet.absoluteFill },
  raised: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, elevation: 14 },
  dim: { backgroundColor: '#000' },
});
