import React from 'react';
import { StyleSheet, View } from 'react-native';
import { HubHeader } from '../../components/cricket/HubHeader';
import { MatchList, NewsList, PlayerList } from '../../components/cricket/Lists';
import { MatchHeroCard } from '../../components/cricket/MatchCards';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { EmptyState, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { PAKISTAN_ID, repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';

const usePakistan = () => useQuery(`team:${PAKISTAN_ID}`, () => repo.team(PAKISTAN_ID), { live: true });

function Overview() {
  const nav = useNavigation();
  const { data } = usePakistan();
  if (!data) return <SkeletonList count={3} height={150} />;
  const live = data.fixtures.find(m => m.status === 'live');
  const next = data.fixtures.find(m => m.status === 'upcoming');
  return (
    <Body contentStyle={{ paddingTop: space.lg }}>
      {live || next ? (
        <View style={{ paddingHorizontal: space.lg }}>
          <MatchHeroCard match={(live ?? next)!} />
        </View>
      ) : null}
      {!live && !next && data.results[0] ? (
        <>
          <SectionHeader title="Last result" style={{ marginTop: space.sm }} />
          <MatchList matches={data.results.slice(0, 1)} />
        </>
      ) : null}
      <SectionHeader title="Latest" action="All news" onAction={() => nav.navigate('Tabs', { tab: 'news' })} style={{ marginTop: space.xxl }} />
      <NewsList articles={data.news.slice(0, 4)} />
    </Body>
  );
}

function Fixtures() {
  const { data } = usePakistan();
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
  const { data } = usePakistan();
  const groups = ['Batter', 'Wicketkeeper', 'All-rounder', 'Bowler', 'Player'] as const;
  if (!data) return <SkeletonList count={4} height={64} />;
  if (!data.squad.length) return <EmptyState icon="users" title="No squad listed" body="The squad appears here once it is announced." />;
  return (
    <Body contentStyle={{ paddingTop: space.md }}>
      {groups.filter(g => data.squad.some(p => p.role === g)).map(g => (
        <View key={g}>
          <SectionHeader title={g === 'All-rounder' ? 'All-rounders' : `${g}s`} style={{ marginTop: space.lg }} />
          <PlayerList players={data.squad.filter(p => p.role === g)} meta={p => [p.batting, p.bowling].filter(Boolean).join(' · ') || p.role} />
        </View>
      ))}
    </Body>
  );
}

function News() {
  const { data } = useQuery('news:pakistan-hub', () => repo.newsFor({ teamId: PAKISTAN_ID }));
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
  { key: 'news', label: 'News' },
];

export default function PakistanScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Header title="Pakistan" />
      <TabPager
        tabs={TABS}
        header={
          <HubHeader
            color={colors.pakistan}
            title="Pakistan"
            subtitle="Fixtures, squad and news"
            favourite={{ kind: 'team', id: PAKISTAN_ID }}
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
            default:
              return <News />;
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
