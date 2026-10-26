import React, { useState } from 'react';
import { FlatList, Image, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CoverArt } from '../../components/cricket/Media';
import { ClipPlayer } from '../../components/media/Players';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { EmptyState, ErrorState, Fade, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';

/** All media in one place: reels up top, a photo wall, then videos. */
export function GalleryScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { data, error, refresh, refreshing } = useQuery('media', repo.media);
  // Photo wall: one feature tile, then a three-up grid with hairline gaps.
  const gap = 4;
  // Floor so three cells plus two gaps never exceed the row (sub-pixel overflow wraps to two).
  const cell = Math.floor((width - space.lg * 2 - gap * 2) / 3);
  const gallery = data?.galleries[0];
  const photos = gallery?.slides ?? [];

  return (
    <Screen>
      <Header title="Gallery" />
      {!data && error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : !data ? (
        <SkeletonList count={3} height={200} />
      ) : !data.shorts.length && !photos.length && !data.videos.length ? (
        <EmptyState icon="image" title="Nothing here yet" body="Shorts, photos and videos appear here as soon as they are published." />
      ) : (
        <Body onRefresh={refresh} refreshing={refreshing}>
          {data.shorts.length ? (
            <>
              <SectionHeader title="Shorts" action={`${data.shorts.length}`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
                {data.shorts.map(s => (
                  <Touch key={s.id} scale onPress={() => nav.navigate('Shorts', { id: s.id })} style={styles.short} accessibilityLabel={`Short: ${s.title}`}>
                    <CoverArt photo={s.photo ?? s.slides[0].photo} teamIds={s.teamIds} />
                    <View style={styles.shade} pointerEvents="none">
                      <Fade color="#03060C" height={120} flip opacity={0.9} />
                    </View>
                    <View style={styles.reelPlay}>
                      <Icon name="play" size={14} color="#FFFFFF" />
                    </View>
                    <View style={styles.shortText}>
                      <AppText variant="label" weight="700" color="#FFFFFF" numberOfLines={2}>
                        {s.title}
                      </AppText>
                      <AppText variant="micro" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>
                        {ago(s.publishedAt).toUpperCase()}
                      </AppText>
                    </View>
                  </Touch>
                ))}
              </ScrollView>
            </>
          ) : null}

          {gallery && photos.length ? (
            <>
              <SectionHeader title="Photos" action={`${photos.length}`} style={{ marginTop: data.shorts.length ? space.xxl : 0 }} />
              <View style={{ paddingHorizontal: space.lg }}>
                <Touch onPress={() => nav.navigate('MediaViewer', { id: gallery.id, index: 0 })} style={[styles.feature, { backgroundColor: colors.elevated }]} accessibilityLabel={photos[0].headline || 'Photo'}>
                  {photos[0].photo ? <Image source={{ uri: photos[0].photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                  <View style={styles.shade} pointerEvents="none">
                    <Fade color="#03060C" height={110} flip opacity={0.85} />
                  </View>
                  {photos[0].headline ? (
                    <View style={styles.featureText}>
                      <AppText variant="headline" weight="700" color="#FFFFFF" numberOfLines={1}>
                        {photos[0].headline}
                      </AppText>
                      {photos[0].caption ? (
                        <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                          {photos[0].caption}
                        </AppText>
                      ) : null}
                    </View>
                  ) : null}
                </Touch>
                <View style={[styles.wall, { gap, marginTop: gap }]}>
                  {photos.slice(1).map((p, i) => (
                    <Touch
                      key={i}
                      onPress={() => nav.navigate('MediaViewer', { id: gallery.id, index: i + 1 })}
                      style={{ width: cell, height: cell, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.elevated }}
                      accessibilityLabel={p.headline || 'Photo'}
                    >
                      {p.photo ? <Image source={{ uri: p.photo }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
                    </Touch>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {data.videos.length ? (
            <>
              <SectionHeader title="Videos" style={{ marginTop: space.xxl }} />
              <View style={{ gap: space.lg, paddingHorizontal: space.lg }}>
                {data.videos.map(v => (
                  <Touch key={v.id} scale onPress={() => v.url && nav.navigate('Watch', { url: v.url, title: v.title })} style={{ borderRadius: radius.lg }}>
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
                      {ago(v.publishedAt)}
                    </AppText>
                  </Touch>
                ))}
              </View>
            </>
          ) : null}
        </Body>
      )}
    </Screen>
  );
}

/** Full-screen viewer: swipeable photos for a gallery, poster + player slot for a video. */
export function MediaViewerScreen() {
  const { id, index: start = 0 } = useParams('MediaViewer');
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(start);
  const { data } = useQuery('media', repo.media);
  const gallery = data && [...data.galleries, ...data.shorts].find(s => s.id === id);
  const video = data?.videos.find(v => v.id === id);

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
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: 'center' }}>
              {item.photo ? (
                <Image source={{ uri: item.photo }} style={{ width, height: height * 0.72 }} resizeMode="contain" />
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
          {video.url ? (
            <ClipPlayer uri={video.url} style={{ width, height: (width * 9) / 16 }} />
          ) : (
            <View style={{ width, height: (width * 9) / 16, overflow: 'hidden' }}>
              <CoverArt photo={video.photo} teamIds={video.teamIds} dim={0.3} />
            </View>
          )}
          <View style={{ padding: space.lg }}>
            <AppText variant="title" color="#FFFFFF">
              {video.title}
            </AppText>
            <AppText variant="caption" color="#C9CFDD" style={{ marginTop: 6 }}>
              {video.duration} · {ago(video.publishedAt)}
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
  short: { width: 132, height: 234, borderRadius: radius.lg, overflow: 'hidden' },
  reelPlay: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(3,6,12,0.55)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  feature: { height: 220, borderRadius: radius.lg, overflow: 'hidden' },
  featureText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md },
  wall: { flexDirection: 'row', flexWrap: 'wrap' },
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
