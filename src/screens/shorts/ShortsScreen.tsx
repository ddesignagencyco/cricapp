import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Pressable, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TeamBadge } from '../../components/cricket/Badges';
import { BrandMark, LightStatusBar } from '../../components/ui/Layout';
import { CoverArt, seenShorts } from '../../components/cricket/Media';
import { ClipPlayer } from '../../components/media/Players';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Fade } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import type { Short } from '../../data/types';
import { useNavigation, useParams } from '../../navigation/Stack';
import { radius, space, control } from '../../theme/tokens';
import { ago } from '../../utils/format';

const SLIDE_MS = 5000;

function Progress({ count, index, value }: { count: number; index: number; value: Animated.Value }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          {i < index ? <View style={[styles.fill, { width: '100%' }]} /> : null}
          {i === index ? (
            // Scaled from the left edge rather than resized, so it runs on the native thread.
            <Animated.View style={[styles.fill, styles.fillGrow, { transform: [{ scaleX: value }] }]} />
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
        useNativeDriver: true,
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
    if (short.videoUrl) {
      progress.setValue(1);
      return;
    }
    run(0);
    return () => anim.current?.stop();
  }, [active, slide, run, progress, short.id, short.videoUrl]);

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
      {short.videoUrl && active ? (
        // Reels-style: the clip fills the screen and loops while this short is on screen.
        <ClipPlayer uri={short.videoUrl} poster={s.photo} loop controls={false} cover style={StyleSheet.absoluteFill} />
      ) : (
        <CoverArt photo={s.photo} teamIds={s.teamIds} dim={s.photo ? 0.25 : 0} frame={{ width, height }} />
      )}
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
          {short.teamIds[0] ? <TeamBadge id={short.teamIds[0]} size={32} /> : <View style={styles.brand}><BrandMark height={16} /></View>}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText variant="label" weight="700" color="#FFFFFF" numberOfLines={1}>
              {short.title || 'PAK CRICZONE'}
            </AppText>
            <AppText variant="caption" color="#C9CFDD">
              {short.kind === 'gallery' ? `Gallery · ${short.slides.length} photos` : 'Short'} · {ago(short.publishedAt)}
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
          <AppText variant="hero" color="#FFFFFF" style={s.headline.length > 12 ? styles.headlineLong : styles.headline} tabular>
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
  const { data } = useQuery('shorts', repo.shorts);
  if (!data) {
    return (
      <View style={styles.loading}>
        <LightStatusBar />
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }
  return <ShortsPager shorts={data} startId={id} />;
}

function ShortsPager({ shorts, startId }: { shorts: Short[]; startId: string }) {
  const nav = useNavigation();
  const { width, height } = useWindowDimensions();
  const start = Math.max(0, shorts.findIndex(s => s.id === startId));
  const [active, setActive] = useState(start);
  const list = useRef<FlatList<Short>>(null);

  // Stories run sideways; the last one closes the viewer.
  const goTo = useCallback(
    (i: number) => {
      if (i >= shorts.length) nav.goBack();
      else if (i >= 0) {
        list.current?.scrollToOffset({ offset: i * width, animated: true });
        setActive(i);
      }
    },
    [width, nav, shorts.length],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#03060C' }}>
      <LightStatusBar />
      <FlatList
        ref={list}
        data={shorts}
        keyExtractor={s => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={start}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={e => setActive(Math.round(e.nativeEvent.contentOffset.x / width))}
        windowSize={3}
        renderItem={({ item, index }) => (
          <View style={{ width }}>
            <ShortPage short={item} active={index === active} height={height} onDone={() => goTo(index + 1)} onClose={nav.goBack} />
          </View>
        )}
      />
      {/* Arrows to step between stories, for anyone who doesn't swipe. */}
      {active > 0 ? (
        <Touch borderless onPress={() => goTo(active - 1)} style={[styles.arrow, { left: space.sm, top: height / 2 - 22 }]} accessibilityLabel="Previous story">
          <Icon name="chevronLeft" size={24} color="#FFFFFF" />
        </Touch>
      ) : null}
      {active < shorts.length - 1 ? (
        <Touch borderless onPress={() => goTo(active + 1)} style={[styles.arrow, { right: space.sm, top: height / 2 - 22 }]} accessibilityLabel="Next story">
          <Icon name="chevronRight" size={24} color="#FFFFFF" />
        </Touch>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  arrow: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(3,6,12,0.45)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  loading: { flex: 1, backgroundColor: '#03060C', alignItems: 'center', justifyContent: 'center' },
  brand: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headline: { fontSize: 52, lineHeight: 58, letterSpacing: -1.5 },
  headlineLong: { fontSize: 34, lineHeight: 40, letterSpacing: -1 },
  topShade: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: space.md },
  progress: { flexDirection: 'row', gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 3, backgroundColor: '#FFFFFF' },
  fillGrow: { width: '100%', transformOrigin: 'left' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', paddingLeft: space.lg, paddingRight: space.sm },
  actions: { alignItems: 'center', gap: space.lg, paddingBottom: 4 },
  action: { width: 56, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md },
  liveRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4256', marginRight: 6 },
  matchLinkWrap: { position: 'absolute', left: space.lg },
  matchLink: { flexDirection: 'row', alignItems: 'center', height: control.md, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: '#FFFFFF', overflow: 'hidden' },
});
