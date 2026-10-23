import React, { useRef, useState } from 'react';
import { Animated, FlatList, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/ui/AppText';
import { BrandMark } from '../../components/ui/Layout';
import { PhotoHero } from '../../components/ui/PhotoHero';
import { Button } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { storage } from '../../utils/storage';

/** Welcome photos (Unsplash licence) are 1080 × 1350. */
const PHOTO_RATIO = 1080 / 1350;

const SLIDES = [
  {
    key: 'live',
    photo: require('../../assets/images/welcome_live.jpg'),
    overline: 'LIVE CRICKET',
    title: 'Every ball,\nas it happens',
    body: 'Live scores, ball-by-ball commentary and scorecards that update on their own.',
  },
  {
    key: 'hubs',
    photo: require('../../assets/images/welcome_hubs.jpg'),
    overline: 'PAKISTAN & PSL',
    title: 'Closer to the\ngame you love',
    body: 'Squads, fixtures, tables and records for Pakistan, the PSL and domestic cricket.',
  },
  {
    key: 'predict',
    photo: require('../../assets/images/welcome_predict.jpg'),
    overline: 'AI PREDICTIONS',
    title: 'Predictions\nyou can check',
    body: 'Win probabilities with the reasons behind every swing, plus a public record of how accurate they are.',
  },
];

function TopBar({ onSkip }: { onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.logoPill}>
        <BrandMark height={24} />
      </View>
      <View style={{ flex: 1 }} />
      <Touch onPress={onSkip} style={styles.skip} accessibilityLabel="Skip introduction">
        <AppText variant="label" weight="700" color="#FFFFFF">
          Skip
        </AppText>
      </Touch>
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

  const heroH = Math.round(height * 0.56);
  const last = index === SLIDES.length - 1;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {/* Photos cross-fade as the slides move; the edge stays straight. */}
      {SLIDES.map((s, i) => (
        <Animated.View
          key={s.key}
          pointerEvents="none"
          style={[
            styles.hero,
            { opacity: x.interpolate({ inputRange: [(i - 1) * width, i * width, (i + 1) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }) },
          ]}
        >
          <PhotoHero source={s.photo} ratio={PHOTO_RATIO} height={heroH} />
        </Animated.View>
      ))}

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
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={StyleSheet.absoluteFill}
        renderItem={({ item, index: i }) => {
          const range = [(i - 1) * width, i * width, (i + 1) * width];
          return (
            <View style={{ width, height }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  top: heroH + space.xl,
                  left: 0,
                  right: 0,
                  paddingHorizontal: space.xl,
                  opacity: x.interpolate({ inputRange: [(i - 0.6) * width, i * width, (i + 0.6) * width], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                  transform: [{ translateX: x.interpolate({ inputRange: range, outputRange: [60, 0, -60], extrapolate: 'clamp' }) }],
                }}
              >
                <AppText variant="overline" color="accent">
                  {item.overline}
                </AppText>
                <AppText variant="display" style={{ marginTop: space.sm }}>
                  {item.title}
                </AppText>
                <AppText variant="body" color="textSecondary" style={{ marginTop: space.md, maxWidth: 380 }}>
                  {item.body}
                </AppText>
              </Animated.View>
            </View>
          );
        }}
      />

      <TopBar onSkip={finish} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <Animated.View
              key={s.key}
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
  hero: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  logoPill: { backgroundColor: '#FFFFFF', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  skip: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', backgroundColor: 'rgba(5,8,16,0.45)' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: space.md },
  dots: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
