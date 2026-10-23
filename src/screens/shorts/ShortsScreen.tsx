import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, Pressable, Share, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TeamBadge } from '../../components/cricket/Badges';
import { CoverArt, seenShorts } from '../../components/cricket/Media';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Fade } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { shorts } from '../../data/mock/media';
import type { Short } from '../../data/types';
import { useNavigation, useParams } from '../../navigation/Stack';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';

const SLIDE_MS = 5000;

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

function Progress({ count, index, value }: { count: number; index: number; value: Animated.Value }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          {i < index ? <View style={[styles.fill, { width: '100%' }]} /> : null}
          {i === index ? (
            <Animated.View style={[styles.fill, { width: value.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function ShortPage({
  short,
  active,
  height,
  onDone,
  onClose,
}: {
  short: Short;
  active: boolean;
  height: number;
  onDone: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const nav = useNavigation();
  const [slide, setSlide] = useState(0);
  const [liked, setLiked] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const s = short.slides[slide];

  const run = useCallback(
    (from = 0) => {
      progress.setValue(from);
      anim.current = Animated.timing(progress, {
        toValue: 1,
        duration: SLIDE_MS * (1 - from),
        easing: Easing.linear,
        useNativeDriver: false,
      });
      anim.current.start(({ finished }) => {
        if (!finished) return;
        if (slide < short.slides.length - 1) setSlide(slide + 1);
        else onDone();
      });
    },
    [progress, slide, short.slides.length, onDone],
  );

  useEffect(() => {
    if (!active) {
      anim.current?.stop();
      progress.setValue(0);
      return;
    }
    seenShorts.add(short.id);
    run(0);
    return () => anim.current?.stop();
  }, [active, slide, run, progress, short.id]);

  // Coming back to a short restarts it from the first frame.
  useEffect(() => {
    if (!active) setSlide(0);
  }, [active]);

  const go = (dir: 1 | -1) => {
    anim.current?.stop();
    if (dir === 1) {
      if (slide < short.slides.length - 1) setSlide(slide + 1);
      else onDone();
    } else if (slide > 0) setSlide(slide - 1);
    else run(0);
  };

  const pause = () => anim.current?.stop();
  const resume = () => {
    progress.stopAnimation(v => run(v));
  };

  return (
    <View style={{ height, backgroundColor: '#03060C' }}>
      <CoverArt photo={s.photo} teamIds={s.teamIds} dim={s.photo ? 0.25 : 0} frame={{ width, height }} />
      <View style={styles.bottomShade} pointerEvents="none">
        <Fade color="#03060C" height={height * 0.55} flip opacity={0.95} />
      </View>
      <View style={styles.topShade} pointerEvents="none">
        <Fade color="#03060C" height={160} opacity={0.7} />
      </View>

      {/* Tap left for back, right for next; hold to pause. */}
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Pressable style={{ flex: 3 }} onPress={() => go(-1)} onLongPress={pause} onPressOut={resume} delayLongPress={220} accessibilityLabel="Previous" />
          <Pressable style={{ flex: 7 }} onPress={() => go(1)} onLongPress={pause} onPressOut={resume} delayLongPress={220} accessibilityLabel="Next" />
        </View>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Progress count={short.slides.length} index={slide} value={progress} />
        <View style={styles.headerRow} pointerEvents="box-none">
          <TeamBadge id={short.teamIds[0]} size={32} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText variant="label" weight="700" color="#FFFFFF">
              {short.title}
            </AppText>
            <AppText variant="caption" color="#C9CFDD">
              {short.kind === 'gallery' ? 'Gallery' : 'Short'} · {ago(short.publishedAt)} · {compact(short.views)} views
            </AppText>
          </View>
          <Touch borderless onPress={onClose} style={styles.close} accessibilityLabel="Close">
            <Icon name="x" size={24} color="#FFFFFF" />
          </Touch>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.xl }]} pointerEvents="box-none">
        <View style={{ flex: 1, paddingRight: space.lg }} pointerEvents="none">
          {short.live ? (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <AppText variant="micro" color="#FF4256">
                FROM A LIVE MATCH
              </AppText>
            </View>
          ) : null}
          <AppText variant="hero" color="#FFFFFF" style={{ fontSize: 52, lineHeight: 58, letterSpacing: -1.5 }} tabular>
            {s.headline}
          </AppText>
          {s.stat ? (
            <AppText variant="label" weight="700" color="rgba(255,255,255,0.85)" style={{ marginTop: 2 }}>
              {s.stat}
            </AppText>
          ) : null}
          <AppText variant="body" color="rgba(255,255,255,0.9)" style={{ marginTop: space.md }}>
            {s.caption}
          </AppText>
          {short.matchId ? <View style={{ height: 52 }} /> : null}
        </View>
        <View style={styles.actions}>
          <Touch borderless onPress={() => setLiked(l => !l)} style={styles.action} accessibilityLabel={liked ? 'Unlike' : 'Like'}>
            <Icon name={liked ? 'heartFill' : 'heart'} size={28} color={liked ? '#FF4256' : '#FFFFFF'} />
            <AppText variant="micro" color="#FFFFFF" style={{ marginTop: 4 }}>
              {compact(Math.round(short.views / 9) + (liked ? 1 : 0))}
            </AppText>
          </Touch>
          <Touch
            borderless
            onPress={() => Share.share({ message: `${short.title} — PAK CRICZONE\nhttps://pakcriczone.com/shorts/${short.id}` })}
            style={styles.action}
            accessibilityLabel="Share"
          >
            <Icon name="send" size={26} color="#FFFFFF" />
            <AppText variant="micro" color="#FFFFFF" style={{ marginTop: 4 }}>
              SHARE
            </AppText>
          </Touch>
        </View>
      </View>

      {short.matchId ? (
        <View style={[styles.matchLinkWrap, { bottom: insets.bottom + space.xl }]}>
          <Touch onPress={() => nav.navigate('Match', { id: short.matchId! })} style={styles.matchLink}>
            <Icon name="radio" size={16} color="#0E1525" />
            <AppText variant="label" weight="700" color="#0E1525" style={{ marginLeft: 8 }}>
              Open match centre
            </AppText>
          </Touch>
        </View>
      ) : null}
    </View>
  );
}

export default function ShortsScreen() {
  const { id } = useParams('Shorts');
  const nav = useNavigation();
  const { height } = useWindowDimensions();
  const start = Math.max(0, shorts.findIndex(s => s.id === id));
  const [active, setActive] = useState(start);
  const list = useRef<FlatList<Short>>(null);

  const next = useCallback(
    (i: number) => {
      if (i >= shorts.length - 1) nav.goBack();
      else list.current?.scrollToOffset({ offset: (i + 1) * height, animated: true });
    },
    [height, nav],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#03060C' }}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={list}
        data={shorts}
        keyExtractor={s => s.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        onMomentumScrollEnd={e => setActive(Math.round(e.nativeEvent.contentOffset.y / height))}
        windowSize={3}
        renderItem={({ item, index }) => (
          <ShortPage short={item} active={index === active} height={height} onDone={() => next(index)} onClose={nav.goBack} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topShade: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.md },
  progress: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 3, backgroundColor: '#FFFFFF' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: space.lg, paddingRight: space.sm },
  actions: { alignItems: 'center', gap: space.lg, paddingBottom: 4 },
  action: { width: 56, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4256', marginRight: 6 },
  matchLinkWrap: { position: 'absolute', left: space.lg },
  matchLink: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: '#FFFFFF', overflow: 'hidden' },
});
