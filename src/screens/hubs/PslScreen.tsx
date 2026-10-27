import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { Leaders, MatchList, NewsList } from '../../components/cricket/Lists';
import { PointsTable } from '../../components/cricket/Tables';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, Glow, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { PSL_ID, repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

const usePsl = () => useQuery(`series:${PSL_ID}`, () => repo.series(PSL_ID));

function Overview() {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { data } = usePsl();
  if (!data) return <SkeletonList count={3} height={150} />;
  const top = data.standings[0];
  const leader = top ? team(top.teamId) : undefined;
  const next = data.matches.find(m => m.status !== 'completed');
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      {leader && top ? (
        <Touch scale onPress={() => nav.navigate('Team', { id: leader.id })} style={[styles.champ, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <Glow color={colors.psl} size={300} opacity={0.3} style={{ right: -120, top: -150 }} />
          <Glow color={leader.color} size={260} opacity={0.2} style={{ left: -130, bottom: -150 }} />
          <View style={styles.rowC}>
            <Icon name="crown" size={18} color={colors.psl} />
            <AppText variant="overline" color={colors.psl} style={{ marginLeft: 8 }}>
              TOP OF THE TABLE
            </AppText>
          </View>
          <View style={[styles.rowC, { marginTop: 16 }]}>
            <TeamBadge id={leader.id} size={56} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <AppText variant="title">{leader.name}</AppText>
              <AppText variant="caption" color="textSecondary">
                {top.points} points · {top.won} wins from {top.played} · NRR {top.nrr > 0 ? '+' : ''}
                {top.nrr.toFixed(3)}
              </AppText>
            </View>
          </View>
        </Touch>
      ) : null}

      {next ? (
        <>
          <SectionHeader title="Next match" style={{ marginTop: space.xxl }} />
          <MatchList matches={[next]} />
        </>
      ) : null}

      <SectionHeader title="Standings" style={{ marginTop: space.xxl }} />
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data.standings.slice(0, 4)} compact />
      </Card>
      <SectionHeader title="Latest" style={{ marginTop: space.xxl }} />
      <NewsList articles={data.news.slice(0, 3)} />
    </Body>
  );
}

function Table() {
  const { data } = usePsl();
  if (!data) return <SkeletonList count={6} height={52} />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data.standings} />
      </Card>
      <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
        Ordered by points, then net run rate.
      </AppText>
    </Body>
  );
}

function Teams() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data } = usePsl();
  const franchises = (data?.standings ?? []).map(s => team(s.teamId));
  const { width } = useWindowDimensions();
  const w = Math.floor((width - space.lg * 2 - space.md) / 2);
  if (!data) return <SkeletonList count={4} height={150} />;
  if (!franchises.length) return <EmptyState icon="users" title="No teams listed" />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <View style={styles.grid}>
        {franchises.map(t => (
          <Touch
            key={t.id}
            scale
            onPress={() => nav.navigate('Team', { id: t.id })}
            style={[styles.teamTile, { width: w, backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <Glow color={t.color} size={220} opacity={0.3} style={{ right: -110, top: -120 }} />
            <TeamBadge id={t.id} size={48} />
            <AppText variant="headline" weight="700" style={{ marginTop: 14 }} numberOfLines={2}>
              {t.name}
            </AppText>
          </Touch>
        ))}
      </View>
    </Body>
  );
}

function Stats() {
  const { data } = useQuery('psl:leaders', repo.pslLeaders);
  if (!data) return <SkeletonList count={3} height={180} />;
  if (!data.length) return <EmptyState icon="chartColumn" title="No stats yet" body="Leaderboards appear once the season’s scorecards are in." />;
  return (
    <Body contentStyle={{ paddingTop: space.lg, gap: space.md }}>
      {data.map(l => (
        <Leaders key={l.key} title={l.title} unit={l.unit} rows={l.rows} />
      ))}
    </Body>
  );
}

function Results() {
  const { data } = usePsl();
  if (!data) return <SkeletonList count={3} />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <MatchList matches={[...data.matches].reverse()} empty="No results" />
    </Body>
  );
}

function News() {
  const { data } = useQuery('news:psl-hub', () => repo.news({ category: 'PSL', lang: 'en' }));
  if (!data) return <SkeletonList count={4} height={90} />;
  return (
    <Body contentStyle={{ paddingTop: space.sm }}>
      <NewsList articles={data} />
    </Body>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'table', label: 'Table' },
  { key: 'teams', label: 'Teams' },
  { key: 'stats', label: 'Stats' },
  { key: 'results', label: 'Matches' },
  { key: 'news', label: 'News' },
];

export default function PslScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Header title="Pakistan Super League" />
      <TabPager
        tabs={TABS}
        header={
          <HubHeader
            color={colors.psl}
            overline="HBL PAKISTAN SUPER LEAGUE"
            title="PSL"
            subtitle="Standings, fixtures, leaders and news"
            mark={
              <View style={[styles.mark, { backgroundColor: colors.pslSoft }]}>
                <Icon name="trophy" size={30} color={colors.psl} />
              </View>
            }
          />
        }
        renderPage={key => {
          switch (key) {
            case 'overview':
              return <Overview />;
            case 'table':
              return <Table />;
            case 'teams':
              return <Teams />;
            case 'stats':
              return <Stats />;
            case 'results':
              return <Results />;
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
  champ: { marginHorizontal: space.lg, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  teamTile: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg, minHeight: 150, overflow: 'hidden' },
});
