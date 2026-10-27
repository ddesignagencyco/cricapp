import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MatchHeroCard, MatchRow } from '../../components/cricket/MatchCards';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { TabPager } from '../../components/ui/TabPager';
import { Body, Header, Screen, TabHeader } from '../../components/ui/Layout';
import { LoadMore, nearEnd } from '../../components/ui/LoadMore';
import { EmptyState, ErrorState, IconButton, LiveIndicator, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { seriesOf, team } from '../../data/refs';
import { repo } from '../../data/repo';
import type { Match, Prediction } from '../../data/types';
import { usePaged } from '../../data/usePaged';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { usePrefs } from '../../state/prefs';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const offsetOf = (iso: string) => Math.round((dayStart(new Date(iso)) - dayStart(new Date())) / 86_400_000);

/** Native date strip: a week either side of today, live dot on days in play. */
function DateStrip({ value, onChange, liveDays }: { value: number; onChange: (d: number) => void; liveDays: Set<number> }) {
  const { colors } = useTheme();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offsets = Array.from({ length: 22 }, (_, i) => i - 10);
  const CELL = 56;
  const GAP = 6;
  const centred = useRef(false);
  // Centre the selected day once the strip knows its real width.
  const centre = (w: number) => {
    if (centred.current || !w) return;
    centred.current = true;
    const x = space.md + (value + 10) * (CELL + GAP) + CELL / 2 - w / 2;
    scroll.current?.scrollTo({ x: Math.max(0, x), animated: false });
  };
  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      onLayout={e => centre(e.nativeEvent.layout.width)}
    >
      {offsets.map(o => {
        const d = new Date(Date.now() + o * 86_400_000);
        const on = o === value;
        return (
          <Touch
            key={o}
            onPress={() => onChange(o)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o === 0 ? 'Today' : `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`}
            style={[styles.day, { width: CELL }, on && { backgroundColor: colors.text }]}
          >
            <AppText variant="micro" color={on ? colors.background : 'textMuted'}>
              {o === 0 ? 'TODAY' : DAYS[d.getDay()]}
            </AppText>
            <AppText variant="headline" weight="700" tabular color={on ? colors.background : 'text'} style={{ marginTop: 2 }}>
              {d.getDate()}
            </AppText>
            {/* Only a day with play in progress gets a dot; a dot on every day said nothing. */}
            <View style={[styles.dayDot, { backgroundColor: liveDays.has(o) ? colors.live : 'transparent' }]} />
          </Touch>
        );
      })}
    </ScrollView>
  );
}

/** One competition block: header row linking to the series, then its matches. */
function CompetitionSection({ seriesId, matches }: { seriesId: string; matches: Match[] }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const s = seriesOf(seriesId);
  return (
    <View style={{ marginTop: space.lg }}>
      <Touch onPress={() => nav.navigate('Series', { id: seriesId })} style={styles.compHead}>
        <View style={[styles.compMark, { backgroundColor: colors.elevated }]}>
          <Icon name="trophy" size={14} color={s?.color ?? colors.accent} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText variant="label" weight="700" numberOfLines={1}>
            {s?.name ?? 'Other matches'}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {[s?.formatKnown === false ? undefined : s?.format, `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </Touch>
      <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
        {matches.map(m => (
          <MatchRow key={m.id} match={m} showSeries={false} dated={false} />
        ))}
      </View>
    </View>
  );
}

/** Followed teams first, then internationals, leagues, domestic. */
function rankSeries(seriesId: string, list: Match[], favourites: string[]) {
  const m = list[0];
  if (list.some(x => favourites.includes(x.teamA) || favourites.includes(x.teamB))) return 0;
  const kinds = [team(m.teamA).kind, team(m.teamB).kind];
  if (kinds.every(k => k === 'international')) return 1;
  if (seriesId.startsWith('psl')) return 2;
  return 3;
}

/** Every day on the strip counts as a match day: fixtures load per day, on demand. */

export function MatchesView({ initialDay = 0 }: { initialDay?: number }) {
  const { colors } = useTheme();
  const favourites = usePrefs().favouritesOf('team');
  const [day, setDay] = useState(initialDay);
  const date = useMemo(() => new Date(dayStart(new Date()) + day * 86_400_000 + 12 * 3_600_000), [day]);
  const liveQ = useQuery('matches:live', repo.liveMatches, { live: true });
  // One day at a time, a page at a time.
  const list = usePaged(`day:${date.toDateString()}`, p => repo.matchesOn(date, p));

  const { live, sections, liveDays } = useMemo(() => {
    const liveNow = liveQ.data ?? [];
    const mine = (m: Match) => (favourites.includes(m.teamA) || favourites.includes(m.teamB) ? 0 : 1);
    const shownLive = day === 0 ? [...liveNow].sort((a, b) => mine(a) - mine(b)) : [];
    const liveIds = new Set(shownLive.map(m => m.id));
    const groups = new Map<string, Match[]>();
    list.items.filter(m => !liveIds.has(m.id)).forEach(m => groups.set(m.seriesId, [...(groups.get(m.seriesId) ?? []), m]));
    const ordered = [...groups.entries()].sort((a, b) => rankSeries(a[0], a[1], favourites) - rankSeries(b[0], b[1], favourites));
    return { live: shownLive, sections: ordered, liveDays: new Set<number>(liveNow.length ? [0] : []) };
  }, [liveQ.data, list.items, day, favourites]);

  const refresh = () => {
    liveQ.refresh();
    list.refresh();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.stripBar, { backgroundColor: colors.surface, borderBottomColor: colors.hairline }]}>
        <DateStrip value={day} onChange={setDay} liveDays={liveDays} />
      </View>
      {list.loading && !live.length ? (
        <SkeletonList count={3} height={160} />
      ) : list.error && !list.items.length && !live.length ? (
        <ErrorState error={list.error} onRetry={refresh} />
      ) : !live.length && !sections.length ? (
        <EmptyState icon="calendar" title="No matches on this day" body="Pick another date, or follow teams to get notified when fixtures are announced." />
      ) : (
        <Body
          onRefresh={refresh}
          refreshing={list.refreshing}
          bottomInset={false}
          scrollEventThrottle={250}
          onScroll={e => nearEnd(e) && list.loadMore()}
        >
          {live.length ? (
            <>
              <View style={styles.liveHead}>
                <LiveIndicator label="LIVE NOW" size="md" />
                <AppText variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
                  {live.length} {live.length === 1 ? 'match' : 'matches'}
                </AppText>
              </View>
              <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
                {live.map(m => (
                  <MatchHeroCard key={m.id} match={m} />
                ))}
              </View>
            </>
          ) : null}
          {sections.length && live.length ? <SectionHeader title="All matches today" style={{ marginTop: space.xxl, marginBottom: 0 }} /> : null}
          {sections.map(([sid, ms]) => (
            <CompetitionSection key={sid} seriesId={sid} matches={ms} />
          ))}
          {list.error && !list.items.length ? (
            <ErrorState error={list.error} onRetry={list.refresh} />
          ) : (
            <LoadMore hasMore={list.hasMore} loading={list.loadingMore || list.loading} onPress={list.loadMore} count={list.items.length} />
          )}
        </Body>
      )}
    </View>
  );
}

/** Matches in play now, refreshed with every live tick. */
function LiveNow() {
  const q = useQuery('matches:live', repo.liveMatches, { live: true });
  // Cards show at once; win probability fills in when it arrives.
  const ids = q.data?.map(m => m.id).join(',') ?? '';
  const odds = useQuery(`matches:live-odds:${ids}`, () => (q.data?.length ? repo.livePredictions(q.data) : Promise.resolve({})), { live: true });
  if (!q.data && q.error) return <ErrorState error={q.error} onRetry={q.refresh} />;
  if (!q.data) return <SkeletonList count={2} height={180} />;
  if (!q.data.length) {
    return <EmptyState icon="radio" title="No live matches" body="Matches appear here the moment play starts. Check Upcoming for what’s next." />;
  }
  return (
    <Body onRefresh={q.refresh} refreshing={q.refreshing} bottomInset={false} contentStyle={{ gap: space.md, paddingHorizontal: space.lg, paddingTop: space.lg }}>
      {q.data.map(m => (
        <MatchHeroCard key={m.id} match={m} prediction={(odds.data as Record<string, Prediction> | undefined)?.[m.id]} />
      ))}
    </Body>
  );
}

const EMPTY: Record<'upcoming' | 'completed' | 'cancelled', { icon: IconName; title: string; body: string }> = {
  upcoming: { icon: 'calendar', title: 'No fixtures announced', body: 'Upcoming matches appear here as soon as they are scheduled.' },
  completed: { icon: 'trophy', title: 'No results yet', body: 'Finished matches and their results appear here.' },
  cancelled: { icon: 'cloudRain', title: 'No cancelled matches', body: 'Matches called off or abandoned are listed here.' },
};

/** One status, a page at a time (same as the website's match board tabs). */
function StatusList({ status }: { status: 'upcoming' | 'completed' | 'cancelled' }) {
  const list = usePaged(`matches:${status}`, p => repo.statusPage(status, p));
  if (list.loading) return <SkeletonList count={4} height={120} />;
  if (list.error && !list.items.length) return <ErrorState error={list.error} onRetry={list.refresh} />;
  if (!list.items.length) return <EmptyState {...EMPTY[status]} />;
  return (
    <Body onRefresh={list.refresh} refreshing={list.refreshing} bottomInset={false} scrollEventThrottle={250} onScroll={e => nearEnd(e) && list.loadMore()}>
      <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
        {list.items.map(m => (
          <MatchRow key={m.id} match={m} />
        ))}
      </View>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onPress={list.loadMore} count={list.items.length} />
    </Body>
  );
}

const SECTIONS = [
  { key: 'live', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Results' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'calendar', label: 'By date' },
];

export default function LiveScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <TabHeader
        flush
        title="Matches"
        right={<IconButton icon="search" label="Search" onPress={() => nav.navigate('Search')} />}
      />
      <TabPager
        tabs={SECTIONS}
        initialKey="live"
        renderPage={key =>
          key === 'live' ? <LiveNow /> : key === 'calendar' ? <MatchesView /> : <StatusList status={key as 'upcoming' | 'completed' | 'cancelled'} />
        }
      />
    </Screen>
  );
}

/** Upcoming fixtures as one chronological list, sectioned by day and loaded a page at a time. */
export function ScheduleScreen() {
  const list = usePaged('schedule:upcoming', repo.upcomingPage);
  const days = useMemo(() => {
    const map = new Map<number, Match[]>();
    [...list.items]
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .forEach(m => {
        const o = offsetOf(m.startTime);
        map.set(o, [...(map.get(o) ?? []), m]);
      });
    return [...map.entries()];
  }, [list.items]);
  const label = (o: number) => {
    if (o === 0) return 'Today';
    if (o === 1) return 'Tomorrow';
    if (o === -1) return 'Yesterday';
    const d = new Date(Date.now() + o * 86_400_000);
    return `${DAYS[d.getDay()].charAt(0)}${DAYS[d.getDay()].slice(1).toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };
  return (
    <Screen>
      <Header title="Upcoming fixtures" />
      {list.loading ? (
        <SkeletonList count={4} height={120} />
      ) : list.error && !list.items.length ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : !list.items.length ? (
        <EmptyState icon="calendar" title="No fixtures announced" body="Upcoming matches appear here as soon as they are scheduled." />
      ) : (
        <Body onRefresh={list.refresh} refreshing={list.refreshing} scrollEventThrottle={250} onScroll={e => nearEnd(e) && list.loadMore()}>
          {days.map(([o, ms]) => (
            <View key={o}>
              <SectionHeader title={label(o)} style={{ marginTop: space.xl }} />
              <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
                {ms.map(m => (
                  <MatchRow key={m.id} match={m} dated={false} />
                ))}
              </View>
            </View>
          ))}
          <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onPress={list.loadMore} count={list.items.length} />
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: space.md, gap: 6, paddingVertical: space.sm },
  stripBar: { borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  day: { height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  liveHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.md },
  compHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, marginBottom: 4, minHeight: 48 },
  compMark: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
