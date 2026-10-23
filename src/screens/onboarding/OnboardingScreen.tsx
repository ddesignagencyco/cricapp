import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { BrandMark } from '../../components/ui/Layout';
import { Button, Fade } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { Waves } from '../../components/ui/Waves';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { storage } from '../../utils/storage';

const SLIDES = [
  {
    photo: require('../../assets/images/onboard_live.jpg'),
    overline: 'LIVE CRICKET',
    title: 'Every ball,\nas it happens',
    body: 'Live scores, ball-by-ball commentary and scorecards that update on their own.',
  },
  {
    photo: require('../../assets/images/onboard_hubs.jpg'),
    overline: 'PAKISTAN & PSL',
    title: 'Closer to the\ngame you love',
    body: 'Squads, fixtures, tables and records for Pakistan, the PSL and domestic cricket.',
  },
  {
    photo: require('../../assets/images/onboard_predict.jpg'),
    overline: 'AI PREDICTIONS',
    title: 'Predictions\nyou can check',
    body: 'Win probabilities with the reasons behind every swing, plus a public record of how accurate they are.',
  },
];

/** Welcome photos are 1080 × 1620 (2:3 portrait). */
const ART_RATIO = 1080 / 1620;

/** Full-bleed photo with a very slow, subtle zoom, centred in its area on any screen size. */
function Photo({ source, opacity, height }: { source: number; opacity: Animated.AnimatedInterpolation<number> | number; height: number }) {
  const zoom = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zoom, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(zoom, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [zoom]);
  const { width } = useWindowDimensions();
  // Size explicitly so the photo always covers the area, then centre it
  // vertically so tall and short screens crop evenly.
  const w = Math.max(width, height * ART_RATIO);
  return (
    <View pointerEvents="none" style={[styles.artWrap, { height }]}>
      <Animated.Image
        source={source}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: Math.min(0, (height - w / ART_RATIO) / 2),
          height: w / ART_RATIO,
          width: w,
          left: (width - w) / 2,
          opacity,
          transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
        }}
      />
    </View>
  );
}

function TopBar({ onSkip }: { onSkip?: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
      {/* White system icons over the photo, whatever the theme. */}
      <StatusBar barStyle="light-content" />
      <View style={styles.logoPill}>
        <BrandMark height={26} />
      </View>
      <View style={{ flex: 1 }} />
      {onSkip ? (
        <Touch onPress={onSkip} style={styles.skip} accessibilityLabel="Skip introduction">
          <AppText variant="label" weight="700" color="#FFFFFF">
            Skip
          </AppText>
        </Touch>
      ) : null}
    </View>
  );
}

export default function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const nav = useNavigation();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const x = useRef(new Animated.Value(0)).current;

  const finish = () => {
    storage.set('onboarded', true);
    nav.reset('Tabs');
  };

  const photoH = height * 0.62;
  const panelH = height * 0.5;

  const last = index === SLIDES.length - 1;
  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <View style={[styles.artBackdrop, { height: photoH }]} />
      {SLIDES.map((s, i) => (
        <Photo
          key={i}
          source={s.photo}
          height={photoH}
          opacity={x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' })}
        />
      ))}
      <View style={styles.topShade} pointerEvents="none">
        <Fade color="#03060C" height={200} opacity={0.75} />
      </View>
      <Waves color={colors.background} accent={colors.brand} height={panelH} />

      <Animated.FlatList
        ref={list as never}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={s => s.overline}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={StyleSheet.absoluteFill}
        renderItem={({ item, index: i }) => (
          <View style={{ width, height, paddingTop: height - panelH + 64 }}>
            <Animated.View
              style={{
                paddingHorizontal: space.xl,
                opacity: x.interpolate({ inputRange: [(i - 0.6) * width, i * width, (i + 0.6) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                transform: [{ translateX: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [60, 0, -60], extrapolate: 'clamp' }) }],
              }}
            >
              <AppText variant="overline" color="accent">
                {item.overline}
              </AppText>
              <AppText variant="hero" style={{ marginTop: space.sm }}>
                {item.title}
              </AppText>
              <AppText variant="body" color="textSecondary" style={{ marginTop: space.md, maxWidth: 360 }}>
                {item.body}
              </AppText>
            </Animated.View>
          </View>
        )}
      />

      <TopBar onSkip={finish} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.overline}
              style={[
                styles.dot,
                {
                  backgroundColor: colors.brand,
                  opacity: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0.25, 1, 0.25], extrapolate: 'clamp' }),
                  transform: [{ scaleX: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [1, 2.6, 1], extrapolate: 'clamp' }) }],
                },
              ]}
            />
          ))}
        </View>
        <Button
          label={last ? 'Get started' : 'Next'}
          onPress={() => (last ? finish() : list.current?.scrollToOffset({ offset: (index + 1) * width, animated: true }))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0 },
  artWrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  artBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#0B1631' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  logoPill: { backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  skip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: 'rgba(3,6,12,0.35)' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md },
  dots: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
