import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Image, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { BrandMark } from '../../components/ui/Layout';
import { Fade } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { radius, space } from '../../theme/tokens';
import { storage } from '../../utils/storage';

/*
 * Welcome: one fixed full-screen artwork, a soft light shade behind the
 * text, small cricket icons drifting upward, the PCZ mark at the top and a
 * two-tone headline above the controls. Slides 1–2 offer Next / Skip; the
 * last offers Create account or Login.
 */

/** Artwork is 1080 × 1935 (from w2). */
const RATIO = 1080 / 1935;

const INK = '#0B0D12';
const ACCENT = '#2A4FE0';
const BODY = '#3F4656';
const MUTED = '#4A5160';
const BRAND = '#3B68FC';
const SHADE = '#F4F7FF';

const SLIDES = [
  {
    key: 'companion',
    title: 'Your ultimate',
    accent: 'cricket companion',
    body: 'Live scores, latest news, match updates, predictions and everything cricket.',
  },
  {
    key: 'live',
    title: 'Every ball,',
    accent: 'as it happens',
    body: 'Ball-by-ball commentary, full scorecards and live win probability that update on their own.',
  },
  {
    key: 'account',
    title: 'The cricket world',
    accent: 'in your hands',
    body: 'Create a free account to save favourites, get alerts and join the conversation.',
  },
];

/* Control sizes, so each slide's text sits just above its own buttons. */
const BUTTON = 54;
const GAP = 12;
const SKIP_FOR_NOW = 44;
const DOTS = 28;
const groupHeight = (last: boolean) => (last ? BUTTON + GAP + BUTTON : BUTTON + SKIP_FOR_NOW);

/** 0 → 1 forever. */
function useLoop(duration: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return v;
}

const PARTICLES: { icon: IconName; x: number; size: number; duration: number; phase: number }[] = [
  { icon: 'circleDot', x: 0.08, size: 20, duration: 17000, phase: 0.1 },
  { icon: 'trophy', x: 0.82, size: 22, duration: 21000, phase: 0.55 },
  { icon: 'star', x: 0.34, size: 14, duration: 15000, phase: 0.8 },
  { icon: 'zap', x: 0.62, size: 16, duration: 19000, phase: 0.3 },
  { icon: 'circleDot', x: 0.9, size: 14, duration: 16000, phase: 0.05 },
  { icon: 'medal', x: 0.22, size: 18, duration: 23000, phase: 0.45 },
];

/** A small icon rising slowly from the bottom of the screen to the top. */
function Particle({ p, width, height }: { p: (typeof PARTICLES)[number]; width: number; height: number }) {
  const t = useLoop(p.duration);
  // Start each icon part-way through its rise so the screen is never empty.
  const pos = Animated.modulo(Animated.add(t, p.phase), 1);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: p.x * width,
        top: 0,
        opacity: pos.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: pos.interpolate({ inputRange: [0, 1], outputRange: [height + 40, -60] }) },
          { rotate: pos.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '35deg'] }) },
        ],
      }}
    >
      <Icon name={p.icon} size={p.size} color="rgba(59,104,252,0.22)" />
    </Animated.View>
  );
}

export default function OnboardingScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const x = useRef(new Animated.Value(0)).current;
  const last = index === SLIDES.length - 1;

  // The current slide comes from the scroll position itself, so the
  // buttons always match what is on screen.
  useEffect(() => {
    const id = x.addListener(({ value }) => {
      const i = Math.max(0, Math.min(SLIDES.length - 1, Math.round(value / width)));
      setIndex(prev => (prev === i ? prev : i));
    });
    return () => x.removeListener(id);
  }, [x, width]);

  const finish = (then?: 'SignIn' | 'SignUp') => {
    storage.set('onboarded', true);
    nav.reset('Tabs');
    if (then) nav.navigate(then);
  };
  const next = () => list.current?.scrollToOffset({ offset: Math.min(index + 1, SLIDES.length - 1) * width, animated: true });
  const around = (i: number) => [(i - 1) * width, i * width, (i + 1) * width];

  // Cover the screen exactly, whatever its shape.
  const w = Math.max(width, height * RATIO);
  const h = w / RATIO;
  const bottom = insets.bottom + space.lg;

  return (
    <View style={styles.fill}>
      <StatusBar barStyle="dark-content" />
      <Image
        source={require('../../assets/images/welcome_2.jpg')}
        resizeMode="cover"
        style={{ position: 'absolute', width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }}
      />
      {/* Readability: the lower half fades to a near-solid light shade behind the text and buttons. */}
      <Fade color={SHADE} height={height * 0.62} flip opacity={1} style={styles.bottomFade} />
      <View style={[styles.bottomSolid, { height: height * 0.3 }]} />

      {PARTICLES.map((p, i) => (
        <Particle key={i} p={p} width={width} height={height} />
      ))}

      <View style={[styles.brand, { paddingTop: insets.top + space.xl }]} pointerEvents="none">
        <BrandMark height={52} />
        <AppText variant="micro" color={MUTED} style={styles.tagline}>
          CRICKET  •  SCORES  •  NEWS  •  PREDICTIONS
        </AppText>
      </View>

      <Animated.FlatList
        ref={list as never}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={s => s.key}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
        renderItem={({ item, index: i }) => (
          <View
            style={{
              width,
              height,
              justifyContent: 'flex-end',
              paddingBottom: bottom + groupHeight(i === SLIDES.length - 1) + DOTS + space.lg + space.xl,
            }}
          >
            <Animated.View
              style={{
                paddingHorizontal: space.xl,
                opacity: x.interpolate({ inputRange: [(i - 0.6) * width, i * width, (i + 0.6) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                transform: [{ translateX: x.interpolate({ inputRange: around(i), outputRange: [60, 0, -60], extrapolate: 'clamp' }) }],
              }}
            >
              <AppText variant="hero" color={INK} style={styles.title} accessibilityRole="header">
                {item.title}
                {'\n'}
                <AppText variant="hero" color={ACCENT} style={styles.title}>
                  {item.accent}
                </AppText>
              </AppText>
              <AppText variant="body" color={BODY} style={styles.body}>
                {item.body}
              </AppText>
            </Animated.View>
          </View>
        )}
      />

      <View style={[styles.controls, { paddingBottom: bottom }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.key}
              style={[
                styles.dot,
                {
                  opacity: x.interpolate({ inputRange: around(i), outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
                  transform: [{ scaleX: x.interpolate({ inputRange: around(i), outputRange: [1, 3, 1], extrapolate: 'clamp' }) }],
                },
              ]}
            />
          ))}
        </View>

        {/* Separate keys so a pressed Next never hands its press state to Login. */}
        {last ? (
          <View key="final">
            <Touch scale onPress={() => finish('SignUp')} style={[styles.button, styles.primary]} accessibilityLabel="Create account">
              <AppText variant="headline" weight="700" color="#FFFFFF">
                Create account
              </AppText>
              <Icon name="arrowRight" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </Touch>
            <Touch onPress={() => finish('SignIn')} style={[styles.button, styles.outline]} accessibilityLabel="Login">
              <AppText variant="headline" weight="700" color={ACCENT}>
                Login
              </AppText>
            </Touch>
          </View>
        ) : (
          <View key="steps">
            <Touch scale onPress={next} style={[styles.button, styles.primary]} accessibilityLabel="Next">
              <AppText variant="headline" weight="700" color="#FFFFFF">
                Next
              </AppText>
              <Icon name="arrowRight" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </Touch>
            <Touch onPress={() => finish()} style={styles.skipForNow} accessibilityLabel="Skip">
              <AppText variant="label" weight="600" color={MUTED}>
                Skip
              </AppText>
            </Touch>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: SHADE, overflow: 'hidden' },
  bottomFade: { position: 'absolute', bottom: 0 },
  bottomSolid: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: SHADE },
  brand: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  tagline: { marginTop: space.md, letterSpacing: 1.6 },
  title: { fontSize: 36, lineHeight: 42, letterSpacing: -1 },
  body: { marginTop: space.md, fontSize: 16, lineHeight: 24, maxWidth: 380 },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10, height: DOTS, alignItems: 'center', marginBottom: space.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND },
  button: { height: BUTTON, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', overflow: 'hidden' },
  primary: { backgroundColor: BRAND },
  outline: { marginTop: GAP, borderWidth: 1.5, borderColor: BRAND, backgroundColor: '#FFFFFF' },
  skipForNow: { height: SKIP_FOR_NOW, alignItems: 'center', justifyContent: 'center' },
});
