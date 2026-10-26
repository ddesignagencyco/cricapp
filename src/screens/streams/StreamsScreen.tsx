import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { LoadMore, nearEnd } from '../../components/ui/LoadMore';
import { EmptyState, ErrorState, Hairline, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo, type Stream } from '../../data/repo';
import { usePaged } from '../../data/usePaged';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago, dayLabel, time } from '../../utils/format';

/** Where to watch: streams and official channels from the CMS. Tapping plays them in the app. */
export default function StreamsScreen() {
  const list = usePaged('streams', repo.streamsPage);
  return (
    <Screen>
      <Header title="Live streams" />
      {list.loading ? (
        <SkeletonList count={4} height={88} />
      ) : list.error && !list.items.length ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : !list.items.length ? (
        <EmptyState icon="tv" title="No streams listed" body="Streams and watch links appear here when they are published." />
      ) : (
        <Body onRefresh={list.refresh} refreshing={list.refreshing} scrollEventThrottle={250} onScroll={e => nearEnd(e) && list.loadMore()}>
          {list.items.map((s, i) => (
            <View key={s.id}>
              {i > 0 ? <Hairline inset={space.lg} /> : null}
              <StreamRow stream={s} />
            </View>
          ))}
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onPress={list.loadMore} count={list.items.length} />
        </Body>
      )}
    </Screen>
  );
}

function StreamRow({ stream }: { stream: Stream }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const when = stream.status === 'upcoming' && stream.scheduledAt ? `${dayLabel(stream.scheduledAt)} · ${time(stream.scheduledAt)}` : ago(stream.scheduledAt ?? stream.createdAt);
  return (
    <Touch onPress={() => nav.navigate('Watch', { url: stream.streamUrl, title: stream.title, subtitle: stream.provider ?? undefined })} style={styles.row} accessibilityLabel={`Watch ${stream.title}`}>
      <View style={[styles.thumb, { backgroundColor: colors.elevated }]}>
        {stream.thumbnailUrl ? <Image source={{ uri: stream.thumbnailUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={styles.play}>
          <Icon name="play" size={14} color="#0E1525" />
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <AppText variant="label" weight="700" numberOfLines={2}>
          {stream.title}
        </AppText>
        <View style={[styles.meta, { marginTop: 6 }]}>
          {stream.status === 'live' ? <Tag label="LIVE" tone="danger" /> : stream.status === 'upcoming' ? <Tag label="UPCOMING" tone="brand" /> : null}
          <AppText variant="caption" color="textMuted" style={{ marginLeft: stream.status === 'ended' ? 0 : 8 }}>
            {[stream.provider === 'youtube' ? 'YouTube' : stream.provider, when].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        {stream.matchId ? (
          <Touch onPress={() => nav.navigate('Match', { id: stream.matchId! })} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            <AppText variant="caption" weight="700" color="accent">
              Match centre
            </AppText>
          </Touch>
        ) : null}
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Touch>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  thumb: { width: 112, height: 63, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  meta: { flexDirection: 'row', alignItems: 'center' },
});
