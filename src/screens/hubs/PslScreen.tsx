import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { Leaders, MatchList, NewsList } from '../../components/cricket/Lists';
import { FormGuide, PointsTable } from '../../components/cricket/Tables';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Glow, SectionHeader, Tag } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { allTeams, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

const franchises = allTeams.filter(t => t.kind === 'franchise');

function Overview() {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { data } = useQuery('series:psl11', () => repo.series('psl11'));
  if (!data) return <SkeletonList count={3} height={150} />;
  const champ = team('lq');
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <Touch scale onPress={() => nav.navigate('Team', { id: champ.id })} style={[styles.champ, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Glow color={colors.psl} size={300} opacity={0.3} style={{ right: -120, top: -150 }} />
        <Glow color={champ.color} size={260} opacity={0.2} style={{ left: -130, bottom: -150 }} />
        <View style={styles.rowC}>
          <Icon name="crown" size={18} color={colors.psl} />
          <AppText variant="overline" color={colors.psl} style={{ marginLeft: 8 }}>
            PSL 2026 CHAMPIONS
          </AppText>
        </View>
        <View style={[styles.rowC, { marginTop: 16 }]}>
          <TeamBadge id={champ.id} size={56} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <AppText variant="title">{champ.name}</AppText>
            <AppText variant="caption" color="textSecondary">
              Beat Islamabad United by 6 wickets in the final
            </AppText>
          </View>
        </View>
      </Touch>

      <Card style={{ marginHorizontal: space.lg, marginTop: space.md }}>
        <View style={styles.rowC}>
          <AppText variant="label" weight="700" style={{ flex: 1 }}>
            PSL 12 · 2027
          </AppText>
          <Tag label="OFF-SEASON" tone="psl" />
        </View>
        {[
          ['Retention deadline', '20 November'],
          ['Player draft', 'December'],
          ['Season starts', 'April 2027'],
        ].map(([k, v]) => (
          <View key={k} style={[styles.rowC, { marginTop: 12 }]}>
            <View style={[styles.dot, { backgroundColor: colors.psl }]} />
            <AppText variant="label" color="textSecondary" style={{ flex: 1 }}>
              {k}
            </AppText>
            <AppText variant="label" weight="700">
              {v}
            </AppText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Final standings" style={{ marginTop: space.xxl }} />
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data.standings.slice(0, 4)} compact />
      </Card>
      <SectionHeader title="Latest" style={{ marginTop: space.xxl }} />
      <NewsList articles={data.news.slice(0, 3)} />
    </Body>
  );
}

function Table() {
  const { colors } = useTheme();
  const { data } = useQuery('series:psl11', () => repo.series('psl11'));
  if (!data) return <SkeletonList count={6} height={52} />;
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data.standings} />
      </Card>
      <View style={[styles.rowC, { paddingHorizontal: space.lg, marginTop: space.md }]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <AppText variant="caption" color="textMuted">
          Qualified for the playoffs
        </AppText>
      </View>
      <SectionHeader title="Form guide" style={{ marginTop: space.xl }} />
      <Card style={{ marginHorizontal: space.lg, gap: 14 }}>
        {data.standings.map(s => (
          <View key={s.teamId} style={styles.rowC}>
            <TeamBadge id={s.teamId} size={26} />
            <AppText variant="label" weight="600" style={{ flex: 1, marginLeft: 10 }}>
              {team(s.teamId).short}
            </AppText>
            <FormGuide form={s.form} />
          </View>
        ))}
      </Card>
    </Body>
  );
}

function Teams() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const w = (width - space.lg * 2 - space.md) / 2;
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
  return (
    <Body contentStyle={{ paddingTop: space.lg, gap: space.md }}>
      <Leaders
        title="Most runs · PSL 2026"
        unit="RUNS"
        rows={[
          { playerId: 'fakhar', value: 512 },
          { playerId: 'babar', value: 488 },
          { playerId: 'saim', value: 431 },
          { playerId: 'rizwan', value: 402 },
          { playerId: 'hasan', value: 377 },
        ]}
      />
      <Leaders
        title="Most wickets · PSL 2026"
        unit="WKTS"
        rows={[
          { playerId: 'shaheen', value: 19 },
          { playerId: 'abrar', value: 17 },
          { playerId: 'rauf', value: 16 },
          { playerId: 'sufiyan', value: 14 },
          { playerId: 'naseem', value: 12 },
        ]}
      />
    </Body>
  );
}

function Results() {
  const { data } = useQuery('series:psl11', () => repo.series('psl11'));
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
  { key: 'results', label: 'Results' },
  { key: 'news', label: 'News' },
];

export default function PslScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Header />
      <TabPager
        tabs={TABS}
        header={
          <HubHeader
            color={colors.psl}
            overline="HBL PAKISTAN SUPER LEAGUE"
            title="PSL"
            subtitle="6 franchises · Season 12 in 2027"
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
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  teamTile: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg, minHeight: 150, overflow: 'hidden' },
});
