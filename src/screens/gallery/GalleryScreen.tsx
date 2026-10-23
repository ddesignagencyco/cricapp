import React, { useState } from 'react';
import { FlatList, Image, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverArt, PHOTOS } from '../../components/cricket/Media';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Fade, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { shorts, videos } from '../../data/mock/media';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K` : String(n));

/** All media in one place: shorts, photo galleries and videos, as sections. */
export function GalleryScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data } = useQuery('media', repo.media);
  const tileW = (width - space.lg * 2 - space.md) / 2;

  return (
    <Screen>
      <Header title="Gallery" subtitle="Shorts, photos and videos" />
      {!data ? (
        <SkeletonList count={3} height={200} />
      ) : (
        <Body>
          <SectionHeader title="Shorts" overline="SWIPE-UP HIGHLIGHTS" style={{ marginTop: space.sm }} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
            {data.shorts.map(s => (
              <Touch key={s.id} scale onPress={() => nav.navigate('Shorts', { id: s.id })} style={styles.short}>
                <CoverArt photo={s.photo ?? s.slides[0].photo} teamIds={s.teamIds} />
                <View style={styles.shade} pointerEvents="none">
                  <Fade color="#03060C" height={150} flip opacity={0.9} />
                </View>
                {s.live ? (
                  <View style={[styles.liveTag, { backgroundColor: colors.live }]}>
                    <AppText variant="micro" color="#FFFFFF">
                      LIVE
                    </AppText>
                  </View>
                ) : null}
                <View style={styles.shortText}>
                  <AppText variant="headline" weight="700" color="#FFFFFF" numberOfLines={2}>
                    {s.slides[0].headline}
                  </AppText>
                  <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                    {s.title}
                  </AppText>
                  <View style={[styles.rowC, { marginTop: 6 }]}>
                    <Icon name="play" size={12} color="#FFFFFF" />
                    <AppText variant="micro" color="#FFFFFF" style={{ marginLeft: 4 }}>
                      {compact(s.views)}
                    </AppText>
                  </View>
                </View>
              </Touch>
            ))}
          </ScrollView>

          <SectionHeader title="Photo galleries" style={{ marginTop: space.xxl }} />
          <View style={styles.grid}>
            {data.galleries.map(g => (
              <Touch key={g.id} scale onPress={() => nav.navigate('MediaViewer', { id: g.id })} style={[styles.galleryTile, { width: tileW }]}>
                <View style={[styles.galleryImg, { backgroundColor: colors.elevated }]}>
                  <CoverArt photo={g.photo} teamIds={g.teamIds} />
                  <View style={styles.count}>
                    <Icon name="image" size={12} color="#FFFFFF" />
                    <AppText variant="micro" color="#FFFFFF" style={{ marginLeft: 4 }}>
                      {g.slides.length}
                    </AppText>
                  </View>
                </View>
                <AppText variant="label" weight="700" numberOfLines={2} style={{ marginTop: 8 }}>
                  {g.title}
                </AppText>
                <AppText variant="caption" weight="600" color="accent">
                  {ago(g.publishedAt)}
                </AppText>
              </Touch>
            ))}
          </View>

          <SectionHeader title="Videos" style={{ marginTop: space.xxl }} />
          <View style={{ gap: space.lg, paddingHorizontal: space.lg }}>
            {data.videos.map(v => (
              <Touch key={v.id} scale onPress={() => nav.navigate('MediaViewer', { id: v.id })} style={{ borderRadius: radius.lg }}>
                <View style={[styles.video, { backgroundColor: colors.elevated }]}>
                  <CoverArt photo={v.photo} teamIds={v.teamIds} dim={0.15} />
                  <View style={styles.play}>
                    <Icon name="play" size={22} color="#0E1525" />
                  </View>
                  <View style={styles.duration}>
                    <AppText variant="micro" color="#FFFFFF" tabular>
                      {v.duration}
                    </AppText>
                  </View>
                </View>
                <AppText variant="headline" numberOfLines={2} style={{ marginTop: 10 }}>
                  {v.title}
                </AppText>
                <AppText variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                  {v.category} · {compact(v.views)} views · {ago(v.publishedAt)}
                </AppText>
              </Touch>
            ))}
          </View>
        </Body>
      )}
    </Screen>
  );
}

/** Full-screen viewer: swipeable photos for a gallery, poster + player slot for a video. */
export function MediaViewerScreen() {
  const { id } = useParams('MediaViewer');
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const gallery = shorts.find(s => s.id === id);
  const video = videos.find(v => v.id === id);

  const close = (
    <View style={[styles.viewerTop, { paddingTop: insets.top + 8 }]}>
      <AppText variant="label" weight="700" color="#FFFFFF" style={{ flex: 1 }} numberOfLines={1}>
        {gallery?.title ?? video?.title}
      </AppText>
      {gallery ? (
        <AppText variant="label" color="#C9CFDD" tabular style={{ marginRight: 8 }}>
          {index + 1} / {gallery.slides.length}
        </AppText>
      ) : null}
      <Touch borderless onPress={nav.goBack} style={styles.closeBtn} accessibilityLabel="Close">
        <Icon name="x" size={24} color="#FFFFFF" />
      </Touch>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      {gallery ? (
        <FlatList
          data={gallery.slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              {item.photo ? (
                <Image source={PHOTOS[item.photo]} style={{ width, height: width / (1408 / 768) }} resizeMode="contain" />
              ) : (
                <View style={{ width, height: width * 0.75, overflow: 'hidden' }}>
                  <CoverArt teamIds={item.teamIds} />
                </View>
              )}
              <View style={[styles.caption, { paddingBottom: insets.bottom + space.xl }]}>
                <AppText variant="title" color="#FFFFFF">
                  {item.headline}
                </AppText>
                <AppText variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>
                  {item.caption}
                </AppText>
              </View>
            </View>
          )}
        />
      ) : video ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ width, height: (width * 9) / 16, overflow: 'hidden' }}>
            <CoverArt photo={video.photo} teamIds={video.teamIds} dim={0.3} />
            <View style={[styles.play, { width: 64, height: 64, borderRadius: 32 }]}>
              <Icon name="play" size={28} color="#0E1525" />
            </View>
          </View>
          <View style={{ padding: space.lg }}>
            <AppText variant="title" color="#FFFFFF">
              {video.title}
            </AppText>
            <AppText variant="caption" color="#C9CFDD" style={{ marginTop: 6 }}>
              {video.duration} · {compact(video.views)} views
            </AppText>
            <AppText variant="caption" color="#9AA3B8" style={{ marginTop: space.lg }}>
              Playback starts once the video player and streaming source are connected.
            </AppText>
          </View>
        </View>
      ) : null}
      {close}
    </View>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  short: { width: 150, height: 266, borderRadius: radius.lg, overflow: 'hidden' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  shortText: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  liveTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  galleryTile: { borderRadius: radius.md },
  galleryImg: { height: 120, borderRadius: radius.md, overflow: 'hidden' },
  count: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(3,6,12,0.65)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  video: { height: 190, borderRadius: radius.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { position: 'absolute', alignSelf: 'center', top: '50%', marginTop: -26, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(3,6,12,0.75)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  viewerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  caption: { position: 'absolute', left: space.lg, right: space.lg, bottom: 0 },
});
