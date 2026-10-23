import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { team as teamOf } from '../../data/refs';
import type { Banner, Photo, Short } from '../../data/types';
import { useIsFocused, useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Fade, Glow } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { badgeFill, readableOn } from '../../utils/color';

export const PHOTOS: Record<Photo, number> = {
  stadium: require('../../assets/images/stadium.jpg'),
  pitch: require('../../assets/images/pitch.jpg'),
};

/** Graphite with a faint brand glow for generated covers: calm, consistent, not loud. */
export const COVER_GLOW = '#4F74F0';
export const COVER_SHADE = '#353B48';
export const COVER_BASE = '#1B1F27';

/** Width / height of the bundled photos. */
const PHOTO_RATIO = 1408 / 768;

/** Photo when there is one, otherwise a brand-blue composition. `teamIds` is kept for team artwork from the CMS. */
export function CoverArt({
  photo,
  teamIds: _teamIds,
  style,
  dim = 0,
  frame,
}: {
  photo?: Photo;
  teamIds: string[];
  style?: object;
  dim?: number;
  /** Container size for full-screen use: the photo is sized explicitly so it always covers. */
  frame?: { width: number; height: number };
}) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: photo ? '#0B1120' : COVER_BASE, overflow: 'hidden' }, style]}>
      {photo ? (
        <Image
          source={PHOTOS[photo]}
          style={
            frame
              ? { position: 'absolute', height: frame.height, width: frame.height * PHOTO_RATIO, left: (frame.width - frame.height * PHOTO_RATIO) / 2 }
              : StyleSheet.absoluteFill
          }
          resizeMode="cover"
        />
      ) : (
        <>
          <Glow color={COVER_GLOW} size={520} opacity={0.45} style={{ left: -260, top: -220 }} />
          <Glow color={COVER_SHADE} size={520} opacity={0.8} style={{ right: -280, bottom: -260 }} />
        </>
      )}
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(3,6,12,${dim})` }]} /> : null}
    </View>
  );
}

/** Seen shorts this session, so rings dim once watched. */
export const seenShorts = new Set<string>();

/** Instagram-style row of circular story covers. */
export function ShortsRow({ shorts }: { shorts: Short[] }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const focused = useIsFocused();
  const [, force] = useState(0);
  // Re-render when coming back from the viewer so watched rings update.
  useEffect(() => {
    if (focused) force(n => n + 1);
  }, [focused]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortsRow}>
      {shorts.map(s => {
        const seen = seenShorts.has(s.id);
        const ring = s.live ? colors.live : seen ? colors.border : colors.brand;
        return (
          <Touch key={s.id} onPress={() => nav.navigate('Shorts', { id: s.id })} style={styles.short} accessibilityLabel={`${s.kind === 'gallery' ? 'Gallery' : 'Short'}: ${s.title}`}>
            <View style={[styles.ring, { borderColor: ring }]}>
              <View style={[styles.cover, { borderColor: colors.background }]}>
                {s.photo ?? s.slides[0].photo ? (
                  <CoverArt photo={s.photo ?? s.slides[0].photo} teamIds={s.teamIds} />
                ) : (
                  // No photo: the team's colour with its code, like a crest.
                  <>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: badgeFill(teamOf(s.teamIds[0]).color) }]} />
                    <AppText variant="label" weight="700" color={readableOn(badgeFill(teamOf(s.teamIds[0]).color))} style={{ fontSize: 15 }}>
                      {teamOf(s.teamIds[0]).short}
                    </AppText>
                  </>
                )}
              </View>
              {s.live ? (
                <View style={[styles.liveTag, { backgroundColor: colors.live, borderColor: colors.background }]}>
                  <AppText variant="micro" color="#FFFFFF" style={{ fontSize: 9, lineHeight: 11 }}>
                    LIVE
                  </AppText>
                </View>
              ) : (
                <View style={[styles.kind, { backgroundColor: colors.elevated, borderColor: colors.background }]}>
                  <Icon name={s.kind === 'gallery' ? 'image' : 'play'} size={11} color={colors.text} />
                </View>
              )}
            </View>
            <AppText variant="caption" color={seen ? 'textMuted' : 'textSecondary'} numberOfLines={1} align="center" style={{ marginTop: 6, width: 76 }}>
              {s.title}
            </AppText>
          </Touch>
        );
      })}
    </ScrollView>
  );
}

/** Full-width promotional banners that advance on their own. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const nav = useNavigation();
  const focused = useIsFocused();
  const list = useRef<FlatList<Banner>>(null);
  const [index, setIndex] = useState(0);
  const w = width - space.lg * 2;

  useEffect(() => {
    if (!focused || banners.length < 2) return;
    const t = setTimeout(() => {
      const next = (index + 1) % banners.length;
      list.current?.scrollToOffset({ offset: next * (w + space.md), animated: true });
      setIndex(next);
    }, 5000);
    return () => clearTimeout(t);
  }, [index, focused, banners.length, w]);

  const open = (b: Banner) => {
    const r = b.route;
    if (r.name === 'Match' && r.id) nav.navigate('Match', { id: r.id });
    else if (r.name === 'Prediction' && r.id) nav.navigate('Prediction', { id: r.id });
    else if (r.name === 'Article' && r.id) nav.navigate('Article', { id: r.id });
    else if (r.name === 'Psl') nav.navigate('Psl');
    else nav.navigate('Pakistan');
  };

  return (
    <View>
      <FlatList
        ref={list}
        horizontal
        data={banners}
        keyExtractor={b => b.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={w + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / (w + space.md)))}
        getItemLayout={(_, i) => ({ length: w + space.md, offset: (w + space.md) * i, index: i })}
        renderItem={({ item }) => (
          <Touch scale onPress={() => open(item)} style={[styles.banner, { width: w }]} accessibilityLabel={`${item.title}. ${item.cta}`}>
            <CoverArt photo={item.photo} teamIds={item.teamIds} />
            <View style={styles.bannerShade} pointerEvents="none">
              <Fade color="#03060C" height={170} flip opacity={0.95} />
            </View>
            <View style={styles.bannerText}>
              <AppText variant="overline" color="#DCE3F8">
                {item.overline}
              </AppText>
              <AppText variant="title" color="#FFFFFF" numberOfLines={2} style={{ marginTop: 4 }}>
                {item.title}
              </AppText>
              <View style={styles.cta}>
                <AppText variant="label" weight="700" color="#0E1525">
                  {item.cta}
                </AppText>
                <Icon name="arrowRight" size={15} color="#0E1525" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </Touch>
        )}
      />
      <View style={styles.dots}>
        {banners.map((b, i) => (
          <View key={b.id} style={[styles.dot, { width: i === index ? 16 : 6, backgroundColor: i === index ? colors.text : colors.border }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shortsRow: { paddingHorizontal: space.md, gap: 4 },
  short: { alignItems: 'center', paddingHorizontal: 4, paddingVertical: 4, borderRadius: radius.md },
  ring: { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  cover: { width: 63, height: 63, borderRadius: 32, overflow: 'hidden', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  liveTag: { position: 'absolute', bottom: -6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 2 },
  kind: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 190, borderRadius: radius.xl, overflow: 'hidden' },
  bannerShade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bannerText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 34,
    marginTop: 12,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
});
