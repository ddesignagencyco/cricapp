import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HubHeader } from '../../components/cricket/HubHeader';
import { Leaders, MatchList, NewsList, PlayerList } from '../../components/cricket/Lists';
import { MatchHeroCard } from '../../components/cricket/MatchCards';
import { PointsTable } from '../../components/cricket/Tables';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { allPlayers } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

const pak = allPlayers.filter(p => p.teamId === 'pak');
const top = (key: 'runs' | 'wickets', fmt: 'T20' | 'ODI' | 'Test') =>
  pak
    .map(p => ({ playerId: p.id, value: p.stats[fmt]?.[key] ?? 0 }))
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

function RankTile({ format, rank }: { format: string; rank: number }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  return (
    <Touch scale onPress={() => nav.navigate('Rankings')} style={[styles.rank, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <AppText variant="micro" color="textMuted">
        {format}
      </AppText>
      <AppText variant="display" tabular style={{ marginTop: 2 }}>
        #{rank}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        ICC ranking
      </AppText>
    </Touch>
  );
}

function Overview() {
  const nav = useNavigation();
  const { data } = useQuery('team:pak', () => repo.team('pak'), { live: true });
  const rankings = useQuery('rankings', repo.rankings);
  if (!data) return <SkeletonList count={3} height={150} />;
  const live = data.fixtures.find(m => m.status === 'live');
  const next = data.fixtures.find(m => m.status === 'upcoming');
  const rankOf = (f: 'T20' | 'ODI' | 'Test') => rankings.data?.teams[f].find(r => r.id === 'pak')?.rank ?? 0;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      {live || next ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <MatchHeroCard match={(live ?? next)!} />
        </View>
      ) : null}
      <View style={styles.ranks}>
        <RankTile format="T20I" rank={rankOf('T20')} />
        <RankTile format="ODI" rank={rankOf('ODI')} />
        <RankTile format="TEST" rank={rankOf('Test')} />
      </View>
      <SectionHeader title="Latest" action="All news" onAction={() => nav.navigate('Tabs', { tab: 'news' })} style={{ marginTop: space.xxl }} />
      <NewsList articles={data.news.slice(0, 4)} />
    </Body>
  );
}

function Fixtures() {
  const { data } = useQuery('team:pak', () => repo.team('pak'), { live: true });
  if (!data) return <SkeletonList count={3} />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <SectionHeader title="Upcoming & live" />
      <MatchList matches={data.fixtures} />
      <SectionHeader title="Results" style={{ marginTop: space.xl }} />
      <MatchList matches={data.results} empty="No results yet" />
    </Body>
  );
}

function Squad() {
  const groups = ['Batter', 'Wicketkeeper', 'All-rounder', 'Bowler'] as const;
  return (
    <Body contentStyle={{ paddingTop: space.md }}>
      {groups.map(g => (
        <View key={g}>
          <SectionHeader title={g === 'All-rounder' ? 'All-rounders' : `${g}s`} style={{ marginTop: space.lg }} />
          <PlayerList players={pak.filter(p => p.role === g)} meta={p => `${p.batting}${p.bowling ? ` · ${p.bowling}` : ''}`} />
        </View>
      ))}
    </Body>
  );
}

function Stats() {
  return (
    <Body contentStyle={{ paddingTop: space.lg, gap: space.md }}>
      <Leaders title="Most T20I runs" unit="RUNS" rows={top('runs', 'T20')} />
      <Leaders title="Most T20I wickets" unit="WKTS" rows={top('wickets', 'T20')} />
      <Leaders title="Most ODI runs" unit="RUNS" rows={top('runs', 'ODI')} />
    </Body>
  );
}

function Domestic() {
  const { colors } = useTheme();
  const { data } = useQuery('series:nt20', () => repo.series('nt20'));
  if (!data) return <SkeletonList count={3} />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <Card style={{ marginHorizontal: space.lg }}>
        <View style={styles.rowC}>
          <Icon name="landmark" size={18} color={colors.pakistan} />
          <AppText variant="label" weight="700" style={{ marginLeft: 8 }}>
            {data.series.name}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary" style={{ marginTop: 6 }}>
          Domestic coverage expands as data feeds allow — Quaid-e-Azam Trophy and Pakistan Cup are next.
        </AppText>
      </Card>
      <SectionHeader title="Table" style={{ marginTop: space.xl }} />
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data.standings} compact />
      </Card>
      <SectionHeader title="Matches" style={{ marginTop: space.xl }} />
      <MatchList matches={data.matches} />
    </Body>
  );
}

function News() {
  const { data } = useQuery('news:pakistan-hub', () => repo.newsFor({ teamId: 'pak' }));
  if (!data) return <SkeletonList count={4} height={90} />;
  return (
    <Body contentStyle={{ paddingTop: space.sm }}>
      <NewsList articles={data} />
    </Body>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'squad', label: 'Squad' },
  { key: 'stats', label: 'Stats' },
  { key: 'domestic', label: 'Domestic' },
  { key: 'news', label: 'News' },
];

export default function PakistanScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Header />
      <TabPager
        tabs={TABS}
        header={
          <HubHeader
            color={colors.pakistan}
            overline="HUB"
            title="Pakistan"
            subtitle="Men's international · domestic · records"
            favourite={{ kind: 'team', id: 'pak' }}
            mark={
              <View style={[styles.mark, { backgroundColor: colors.pakistanSoft }]}>
                <AppText style={{ fontSize: 30, lineHeight: 38 }}>🇵🇰</AppText>
              </View>
            }
          />
        }
        renderPage={key => {
          switch (key) {
            case 'overview':
              return <Overview />;
            case 'fixtures':
              return <Fixtures />;
            case 'squad':
              return <Squad />;
            case 'stats':
              return <Stats />;
            case 'domestic':
              return <Domestic />;
            default:
              return <News />;
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ranks: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, marginTop: space.md },
  rank: { flex: 1, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.md, overflow: 'hidden' },
});
