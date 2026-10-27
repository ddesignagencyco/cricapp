import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { MatchList, NewsList } from '../../components/cricket/Lists';
import { PointsTable } from '../../components/cricket/Tables';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { seriesOf, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { shortDate } from '../../utils/format';

/** Feed tournament types as readers know them. */
const formatLabel = (t: string) => ({ the_hundred: '100-ball', list_a: 'List A', first_class: 'First-class', t20: 'T20', t20i: 'T20I', odi: 'ODI', test: 'Test', t10: 'T10' } as Record<string, string>)[t.toLowerCase()] ?? t.replace(/_/g, ' ');

export default function SeriesScreen() {
  const { id } = useParams('Series');
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data } = useQuery(`series:${id}`, () => repo.series(id), { live: true });
  const s = data?.series ?? seriesOf(id);

  const teamIds = data ? [...new Set(data.matches.flatMap(m => [m.teamA, m.teamB]))] : [];
  // Without an official table, count each team's results from this series' finished matches.
  const records = React.useMemo(() => {
    if (!data || data.standings.length) return [];
    const rows = new Map<string, { teamId: string; p: number; w: number; l: number; nr: number }>();
    const row = (t: string) => rows.get(t) ?? rows.set(t, { teamId: t, p: 0, w: 0, l: 0, nr: 0 }).get(t)!;
    for (const m of data.matches.filter(x => x.status === 'completed' && x.innings.length)) {
      const [a, b] = [row(m.teamA), row(m.teamB)];
      a.p++;
      b.p++;
      const w = m.result?.winnerId;
      if (w === m.teamA) (a.w++, b.l++);
      else if (w === m.teamB) (b.w++, a.l++);
      else (a.nr++, b.nr++);
    }
    return [...rows.values()].sort((x, y) => y.w - x.w || x.l - y.l);
  }, [data]);

  const tabs = [
    { key: 'matches', label: 'Matches' },
    ...(data?.standings.length ? [{ key: 'table', label: 'Table' }] : records.length ? [{ key: 'records', label: 'Records' }] : []),
    ...(teamIds.length ? [{ key: 'teams', label: 'Teams' }] : []),
    ...(data?.news.length ? [{ key: 'news', label: 'News' }] : []),
    { key: 'info', label: 'Info' },
  ];

  return (
    <Screen>
      <Header title="Series" />
      <TabPager
        key={tabs.length}
        tabs={tabs}
        header={
          <HubHeader
            color={s?.color ?? colors.brand}
            overline={[data?.info.format ? formatLabel(data.info.format).toUpperCase() : undefined, data ? `${data.matches.length} ${data.matches.length === 1 ? 'MATCH' : 'MATCHES'}` : ''].filter(Boolean).join(' · ')}
            title={s?.name ?? 'Series'}
            subtitle={s?.start ? `${shortDate(s.start)}${s.end ? ` – ${shortDate(s.end)}` : ''}` : undefined}
            mark={
              <View style={[styles.mark, { backgroundColor: colors.elevated }]}>
                <Icon name="trophy" size={28} color={s?.color ?? colors.accent} />
              </View>
            }
          />
        }
        renderPage={key => {
          if (!data) return <SkeletonList count={3} />;
          switch (key) {
            case 'records':
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    <View style={[styles.recordHead, { backgroundColor: colors.elevated }]}>
                      <AppText variant="micro" color="textMuted" style={{ flex: 1 }}>
                        TEAM
                      </AppText>
                      {['P', 'W', 'L', 'NR'].map(h => (
                        <AppText key={h} variant="micro" color="textMuted" style={styles.num}>
                          {h}
                        </AppText>
                      ))}
                    </View>
                    {records.map((r, i) => (
                      <View key={r.teamId}>
                        {i > 0 ? <Hairline inset={space.lg} /> : null}
                        <Touch onPress={() => nav.navigate('Team', { id: r.teamId })} style={styles.recordRow}>
                          <TeamBadge id={r.teamId} size={28} />
                          <AppText variant="label" weight="600" numberOfLines={1} style={{ flex: 1, marginLeft: 10 }}>
                            {team(r.teamId).name}
                          </AppText>
                          {[r.p, r.w, r.l, r.nr].map((v, j) => (
                            <AppText key={j} variant="label" weight={j === 1 ? '700' : '500'} tabular color={j === 1 ? 'success' : 'text'} style={styles.num}>
                              {v}
                            </AppText>
                          ))}
                        </Touch>
                      </View>
                    ))}
                  </Card>
                  <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
                    Counted from this series’ finished matches.
                  </AppText>
                </Body>
              );
            case 'info': {
              const i = data.info;
              const rows = [
                ['Season', i.season],
                ['Format', i.format ? formatLabel(i.format) : undefined],
                ['Category', i.category],
                ['Gender', i.gender ? i.gender.charAt(0).toUpperCase() + i.gender.slice(1) : undefined],
                ['Starts', i.start ? shortDate(i.start) : undefined],
                ['Ends', i.end ? shortDate(i.end) : undefined],
                ['Matches', String(data.matches.length)],
                ['Teams', teamIds.length ? String(teamIds.length) : undefined],
              ].filter(([, v]) => v) as [string, string][];
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {rows.map(([k, v], idx) => (
                      <View key={k}>
                        {idx > 0 ? <Hairline inset={space.lg} /> : null}
                        <View style={styles.infoRow}>
                          <AppText variant="label" color="textMuted" style={{ width: 96 }}>
                            {k}
                          </AppText>
                          <AppText variant="label" weight="600" style={{ flex: 1 }}>
                            {v}
                          </AppText>
                        </View>
                      </View>
                    ))}
                  </Card>
                </Body>
              );
            }
            case 'matches': {
              // Live first, then what's next, then results newest first.
              const live = data.matches.filter(m => m.status === 'live' || m.status === 'break');
              const next = data.matches.filter(m => m.status === 'upcoming');
              const done = data.matches.filter(m => m.status === 'completed').reverse();
              if (!data.matches.length) return <EmptyState icon="calendar" title="No matches listed" />;
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  {[
                    { title: 'Live', list: live },
                    { title: 'Upcoming', list: next },
                    { title: 'Results', list: done },
                  ]
                    .filter(g => g.list.length)
                    .map((g, i) => (
                      <View key={g.title} style={{ marginTop: i ? space.xl : 0 }}>
                        <SectionHeader title={g.title} />
                        <MatchList matches={g.list} />
                      </View>
                    ))}
                </Body>
              );
            }
            case 'table':
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    <PointsTable rows={data.standings} />
                  </Card>
                </Body>
              );
            case 'news':
              return (
                <Body contentStyle={{ paddingTop: space.sm }}>
                  {data.news.length ? <NewsList articles={data.news} /> : <EmptyState icon="newspaper" title="No stories yet" />}
                </Body>
              );
            default:
              // Teams in this series, from its fixtures.
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {teamIds.map((t, i) => (
                      <View key={t}>
                        {i > 0 ? <Hairline inset={space.lg + 36 + space.md} /> : null}
                        <Touch onPress={() => nav.navigate('Team', { id: t })} style={styles.seriesRow}>
                          <TeamBadge id={t} size={36} />
                          <AppText variant="label" weight="700" numberOfLines={1} style={{ flex: 1, marginLeft: space.md }}>
                            {team(t).name}
                          </AppText>
                          <Icon name="chevronRight" size={16} color={colors.textMuted} />
                        </Touch>
                      </View>
                    ))}
                  </Card>
                </Body>
              );
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recordHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 10 },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 56 },
  num: { width: 36, textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 52 },
  seriesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14, minHeight: 64 },
});
