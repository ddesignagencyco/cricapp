import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { MatchHeroCard, MatchRow } from '../../components/cricket/MatchCards';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen, TabHeader } from '../../components/ui/Layout';
import { Card, EmptyState, Hairline, IconButton, LiveIndicator, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { seriesOf, team } from '../../data/refs';
import { repo } from '../../data/repo';
import type { Match } from '../../data/types';
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
function DateStrip({ value, onChange, liveDays, matchDays }: { value: number; onChange: (d: number) => void; liveDays: Set<number>; matchDays: Set<number> }) {
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
            <AppText variant="headline" weight="700" tabular color={on ? colors.background : matchDays.has(o) ? 'text' : 'textMuted'} style={{ marginTop: 2 }}>
              {d.getDate()}
            </AppText>
            <View style={[styles.dayDot, { backgroundColor: liveDays.has(o) ? colors.live : matchDays.has(o) ? (on ? colors.background : colors.textMuted) : 'transparent' }]} />
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
            {s?.format === 'T20' ? 'T20' : s?.format} · {matches.length} {matches.length === 1 ? 'match' : 'matches'}
          </AppText>
        </View>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </Touch>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        {matches.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Hairline /> : null}
            <MatchRow match={m} showSeries={false} />
          </View>
        ))}
      </Card>
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

export function MatchesView({ initialDay = 0 }: { initialDay?: number }) {
  const { data, loading, refresh, refreshing } = useQuery('matches', repo.matches, { live: true });
  const favourites = usePrefs().favouritesOf('team');
  const [day, setDay] = useState(initialDay);

  const { live, sections, liveDays, matchDays } = useMemo(() => {
    const all = data ?? [];
    const liveNow = all.filter(m => m.status === 'live');
    const liveSet = new Set<number>(liveNow.length ? [0] : []);
    const daySet = new Set(all.map(m => offsetOf(m.startTime)));
    // Today shows what's in play now; other days show what started that day.
    const onDay = all.filter(m => (day === 0 ? m.status !== 'live' && offsetOf(m.startTime) === 0 : offsetOf(m.startTime) === day));
    const groups = new Map<string, Match[]>();
    onDay
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .forEach(m => groups.set(m.seriesId, [...(groups.get(m.seriesId) ?? []), m]));
    const ordered = [...groups.entries()].sort((a, b) => rankSeries(a[0], a[1], favourites) - rankSeries(b[0], b[1], favourites));
    const mine = (m: Match) => (favourites.includes(m.teamA) || favourites.includes(m.teamB) ? 0 : 1);
    return { live: day === 0 ? [...liveNow].sort((a, b) => mine(a) - mine(b)) : [], sections: ordered, liveDays: liveSet, matchDays: daySet };
  }, [data, day, favourites]);

  return (
    <View style={{ flex: 1 }}>
      <DateStrip value={day} onChange={setDay} liveDays={liveDays} matchDays={matchDays} />
      {loading ? (
        <SkeletonList count={3} height={160} />
      ) : !live.length && !sections.length ? (
        <EmptyState icon="calendar" title="No matches on this day" body="Pick another date, or follow teams to get notified when fixtures are announced." />
      ) : (
        <Body onRefresh={refresh} refreshing={refreshing} bottomInset={false}>
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
          {sections.length && live.length ? <SectionHeader title={day === 0 ? 'Later today' : ''} style={{ marginTop: space.xxl, marginBottom: 0 }} /> : null}
          {sections.map(([sid, ms]) => (
            <CompetitionSection key={sid} seriesId={sid} matches={ms} />
          ))}
        </Body>
      )}
    </View>
  );
}

export default function LiveScreen() {
  const nav = useNavigation();
  return (
    <Screen>
      <TabHeader
        title="Matches"
        right={
          <>
            <IconButton icon="calendar" label="Full schedule" onPress={() => nav.navigate('Schedule')} />
            <IconButton icon="search" label="Search" onPress={() => nav.navigate('Search')} />
          </>
        }
      />
      <MatchesView />
    </Screen>
  );
}

/** Schedule as a single chronological list, sectioned by day. */
export function ScheduleScreen() {
  const { data } = useQuery('matches', repo.matches, { live: true });
  const days = useMemo(() => {
    const map = new Map<number, Match[]>();
    [...(data ?? [])]
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      .forEach(m => {
        const o = offsetOf(m.startTime);
        map.set(o, [...(map.get(o) ?? []), m]);
      });
    return [...map.entries()];
  }, [data]);
  const label = (o: number) => {
    if (o === 0) return 'Today';
    if (o === 1) return 'Tomorrow';
    if (o === -1) return 'Yesterday';
    const d = new Date(Date.now() + o * 86_400_000);
    return `${DAYS[d.getDay()].charAt(0)}${DAYS[d.getDay()].slice(1).toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  };
  return (
    <Screen>
      <Header title="Schedule & results" />
      {!data ? (
        <SkeletonList count={4} height={120} />
      ) : (
        <Body>
          {days.map(([o, ms]) => (
            <View key={o}>
              <SectionHeader title={label(o)} style={{ marginTop: space.xl }} />
              <Card padded={false} style={{ marginHorizontal: space.lg }}>
                {ms.map((m, i) => (
                  <View key={m.id}>
                    {i > 0 ? <Hairline /> : null}
                    <MatchRow match={m} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  strip: { paddingHorizontal: space.md, gap: 6, paddingBottom: space.sm },
  day: { height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 4 },
  liveHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.lg, marginBottom: space.md },
  compHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm, marginBottom: 4, minHeight: 48 },
  compMark: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
