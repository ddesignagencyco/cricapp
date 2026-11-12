import React, { useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, FlatList, Image, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { Icon, type IconName } from '../../components/ui/Icon';
import { BrandMark } from '../../components/ui/Layout';
import { Fade } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { radius, space, control } from '../../theme/tokens';
import { storage } from '../../utils/storage';

/*
 * Welcome: the fixed w2 artwork (a batter in the top half, a ball in the
 * corner) with the copy in the clear lower half. Each slide names three real
 * parts of the app. Progress is three cricket balls, filled as you go, since
 * the slides are a sequence. Nothing moves unless you swipe or tap.
 */

/** Artwork is 1080 × 1935 (from w2). */
const RATIO = 1080 / 1935;

/* Navy from the artwork's own corners, so the type belongs to the picture. */
const NAVY = '#0C2A6B';
const BODY = '#3A4A6B';
const MUTED = '#55627D';
const BLUE = '#3B68FC';
const PAPER = '#F3F7FF';

type Seg = { t: string; accent?: boolean };
type Feature = { icon: IconName; label: string; sub: string };
type Slide = { key: string; eyebrow: string; title: Seg[][]; body: string; features: Feature[] };

const SLIDES: Slide[] = [
  {
    key: 'scores',
    eyebrow: 'Live scores & news',
    title: [[{ t: 'All your ' }, { t: 'cricket', accent: true }], [{ t: 'in one place' }]],
    body: 'Live scores, fixtures and news from every series we cover, with the PSL front and centre.',
    features: [
      { icon: 'radio', label: 'Live scores', sub: 'Ball-by-ball, refreshing on its own' },
      { icon: 'trophy', label: 'PSL table', sub: 'Standings, fixtures and results' },
      { icon: 'languages', label: 'English & Urdu', sub: 'Read the game in your language' },
    ],
  },
  {
    key: 'live',
    eyebrow: 'Live match centre',
    title: [[{ t: 'Follow ' }, { t: 'every ball', accent: true }], [{ t: 'as it’s bowled' }]],
    body: 'Commentary, scorecards and win probability update on their own while the match is on.',
    features: [
      { icon: 'messageCircle', label: 'Live commentary', sub: 'Every delivery, as it happens' },
      { icon: 'table2', label: 'Full scorecards', sub: 'Batting, bowling and extras' },
      { icon: 'chartLine', label: 'Win probability', sub: 'See the match swing live' },
    ],
  },
  {
    key: 'account',
    eyebrow: 'Your cricket, saved',
    title: [[{ t: 'Make the app' }], [{ t: 'yours', accent: true }]],
    body: 'Sign up to save teams and players, get the newsletter and chat during live matches.',
    features: [
      { icon: 'heart', label: 'Favourites', sub: 'Save your teams and players' },
      { icon: 'mail', label: 'Newsletter', sub: 'The week’s cricket, in your inbox' },
      { icon: 'users', label: 'Match chat', sub: 'Talk to fans during live games' },
    ],
  },
];

/** A feature as a little card: a tinted icon tile beside a title and one line. */
function FeatureCard({ icon, label, sub }: Feature) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name={icon} size={20} color={BLUE} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" weight="700" color={NAVY}>
          {label}
        </AppText>
        <AppText variant="caption" color={MUTED} style={{ marginTop: 1 }} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
    </View>
  );
}

/* Control sizes, so each slide's copy sits just above its own buttons. */
const BUTTON = control.lg;
const GAP = 12;
const SKIP = 44;
const BALLS = 24;
const controlsHeight = (last: boolean) => BALLS + space.lg + (last ? BUTTON + GAP + BUTTON : BUTTON + SKIP);

/** Progress marker: a ball with its seam; bowled balls are filled, the current one is larger. */
function Ball({ state }: { state: 'done' | 'current' | 'next' }) {
  const size = state === 'current' ? 22 : 15;
  const filled = state !== 'next';
  return (
    <View
      style={[
        styles.ball,
        { width: size, height: size, borderRadius: size / 2 },
        filled ? { backgroundColor: BLUE, borderColor: BLUE } : { borderColor: 'rgba(59,104,252,0.45)' },
      ]}
    >
      {/* The seam: two stitched arcs, like the ball in the artwork. */}
      <View style={[styles.seam, { width: size * 0.5, height: size * 1.4, borderRadius: size, borderColor: filled ? 'rgba(255,255,255,0.9)' : 'rgba(59,104,252,0.4)' }]} />
    </View>
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

  // Android back steps to the previous slide before it leaves the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index === 0) return false;
      list.current?.scrollToOffset({ offset: (index - 1) * width, animated: true });
      return true;
    });
    return () => sub.remove();
  }, [index, width]);

  // Cover the screen exactly, whatever its shape.
  const w = Math.max(width, height * RATIO);
  const h = w / RATIO;
  const bottom = insets.bottom + space.lg;
  // Headline scales with the screen so two lines always fit on small phones.
  const titleSize = Math.max(28, Math.min(38, width * 0.092));

  return (
    <View style={styles.fill}>
      <StatusBar barStyle="dark-content" />
      <Image
        source={require('../../assets/images/welcome_2.jpg')}
        resizeMode="cover"
        style={{ position: 'absolute', width: w, height: h, left: (width - w) / 2, top: (height - h) / 2 }}
      />
      {/* The lower half settles to paper so the copy and buttons read cleanly over the ball. */}
      <Fade color={PAPER} height={height * 0.6} flip opacity={1} style={styles.bottomFade} />
      <View style={[styles.bottomSolid, { height: height * 0.32 }]} />

      <View style={[styles.brand, { paddingTop: insets.top + space.lg }]} pointerEvents="none">
        <BrandMark height={40} />
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
          <View style={{ width, height, justifyContent: 'center', paddingTop: insets.top + 72, paddingBottom: bottom + controlsHeight(i === SLIDES.length - 1) + space.lg }}>
            {/* Copy follows the finger: it fades with the swipe instead of animating on its own. */}
            <Animated.View
              style={{
                paddingHorizontal: space.xl,
                opacity: x.interpolate({ inputRange: [(i - 0.7) * width, i * width, (i + 0.7) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
              }}
            >
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowBar} />
                <AppText variant="micro" weight="700" color={BLUE} uppercase style={{ letterSpacing: 1.4 }}>
                  {item.eyebrow}
                </AppText>
              </View>
              <View accessibilityRole="header">
                {item.title.map((line, li) => (
                  <View key={li} style={styles.titleLine}>
                    {line.map((seg, si) => (
                      <AppText key={si} variant="hero" weight="700" color={seg.accent ? BLUE : NAVY} style={{ fontSize: titleSize, lineHeight: titleSize * 1.1, letterSpacing: -1 }}>
                        {seg.t}
                      </AppText>
                    ))}
                  </View>
                ))}
              </View>
              <AppText variant="body" color={BODY} style={styles.body}>
                {item.body}
              </AppText>
              <View style={styles.cards}>
                {item.features.map(f => (
                  <FeatureCard key={f.label} {...f} />
                ))}
              </View>
            </Animated.View>
          </View>
        )}
      />

      <View style={[styles.controls, { paddingBottom: bottom }]}>
        <View style={styles.balls} accessibilityLabel={`Step ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <Ball key={s.key} state={i < index ? 'done' : i === index ? 'current' : 'next'} />
          ))}
        </View>

        {/* Separate keys so a pressed Next never hands its press state to Login. */}
        {last ? (
          <View key="final">
            {/* Get started enters the app as a guest; sign-in stays optional. */}
            <Touch scale onPress={() => finish()} style={[styles.button, styles.primary]} accessibilityLabel="Get started">
              <AppText variant="headline" weight="700" color="#FFFFFF">
                Get Started
              </AppText>
            </Touch>
            <Touch onPress={() => finish('SignIn')} style={[styles.button, styles.outline]} accessibilityLabel="Log in">
              <AppText variant="headline" weight="700" color={BLUE}>
                Log in
              </AppText>
            </Touch>
          </View>
        ) : (
          <View key="steps">
            <Touch scale onPress={next} style={[styles.button, styles.primary]} accessibilityLabel="Next">
              <AppText variant="headline" weight="700" color="#FFFFFF">
                Next
              </AppText>
            </Touch>
            <Touch onPress={() => finish()} style={styles.skip} accessibilityLabel="Skip">
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
  fill: { flex: 1, backgroundColor: PAPER, overflow: 'hidden' },
  bottomFade: { position: 'absolute', bottom: 0 },
  bottomSolid: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: PAPER },
  brand: { position: 'absolute', top: 0, left: space.xl },
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eyebrowBar: { width: 18, height: 3, borderRadius: 2, backgroundColor: BLUE, marginRight: 8 },
  titleLine: { flexDirection: 'row', flexWrap: 'wrap' },
  body: { marginTop: space.md, fontSize: 16, lineHeight: 24, maxWidth: 400 },
  cards: { marginTop: space.lg, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(12,42,107,0.08)',
    shadowColor: '#0C2A6B',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(59,104,252,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  controls: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl },
  balls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: BALLS, marginBottom: space.lg },
  ball: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  seam: { borderLeftWidth: 1.5, borderRightWidth: 1.5, transform: [{ rotate: '35deg' }] },
  button: { height: BUTTON, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', overflow: 'hidden' },
  primary: { backgroundColor: BLUE },
  outline: { marginTop: GAP, borderWidth: 1.5, borderColor: BLUE, backgroundColor: '#FFFFFF' },
  skip: { height: SKIP, minWidth: 120, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
});
