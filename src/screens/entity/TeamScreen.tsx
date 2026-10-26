import React from 'react';
import { TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { MatchList, NewsList, PlayerList } from '../../components/cricket/Lists';
import { MatchHeroCard } from '../../components/cricket/MatchCards';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { EmptyState, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { View } from 'react-native';
import { team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useParams } from '../../navigation/Stack';
import { space } from '../../theme/tokens';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'fixtures', label: 'Fixtures' },
  { key: 'results', label: 'Results' },
  { key: 'squad', label: 'Squad' },
  { key: 'news', label: 'News' },
];

export default function TeamScreen() {
  const { id } = useParams('Team');
  const t = team(id);
  const { data } = useQuery(`team:${id}`, () => repo.team(id), { live: true });

  const page = (key: string) => {
    if (!data) return <SkeletonList count={3} />;
    switch (key) {
      case 'overview': {
        const next = data.fixtures[0];
        return (
          <Body contentStyle={{ paddingTop: space.lg }}>
            {next ? (
              <View style={{ paddingHorizontal: space.lg }}>
                <MatchHeroCard match={next} />
              </View>
            ) : (
              <EmptyState icon="calendar" title="No fixtures announced" />
            )}
            {data.results.length ? (
              <>
                <SectionHeader title="Last result" style={{ marginTop: space.xl }} />
                <MatchList matches={data.results.slice(0, 1)} />
              </>
            ) : null}
            {data.news.length ? (
              <>
                <SectionHeader title="Latest" style={{ marginTop: space.xl }} />
                <NewsList articles={data.news.slice(0, 3)} />
              </>
            ) : null}
          </Body>
        );
      }
      case 'fixtures':
        return (
          <Body contentStyle={{ paddingTop: space.lg }}>
            <MatchList matches={data.fixtures} />
          </Body>
        );
      case 'results':
        return (
          <Body contentStyle={{ paddingTop: space.lg }}>
            <MatchList matches={data.results} empty="No results yet" />
          </Body>
        );
      case 'squad':
        return (
          <Body contentStyle={{ paddingTop: space.lg }}>
            {data.squad.length ? <PlayerList players={data.squad} /> : <EmptyState icon="users" title="Squad not announced" />}
          </Body>
        );
      default:
        return (
          <Body contentStyle={{ paddingTop: space.sm }}>
            <NewsList articles={data.news} />
          </Body>
        );
    }
  };

  return (
    <Screen>
      <Header title="Team" />
      <TabPager
        tabs={TABS}
        header={
          <HubHeader
            color={t.color}
            overline={t.kind === 'franchise' ? 'PSL FRANCHISE' : t.kind === 'domestic' ? 'DOMESTIC' : 'INTERNATIONAL'}
            title={t.name}
            favourite={{ kind: 'team', id }}
            mark={<TeamBadge id={id} size={64} />}
          />
        }
        renderPage={page}
      />
    </Screen>
  );
}
