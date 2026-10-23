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
import { Card, EmptyState, Hairline } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { allSeries, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { shortDate } from '../../utils/format';

export default function SeriesScreen() {
  const { id } = useParams('Series');
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data } = useQuery(`series:${id}`, () => repo.series(id), { live: true });
  const s = allSeries.find(x => x.id === id);

  const tabs = [
    { key: 'matches', label: 'Matches' },
    ...(data?.standings.length ? [{ key: 'table', label: 'Table' }] : []),
    { key: 'news', label: 'News' },
    { key: 'all', label: 'All series' },
  ];

  return (
    <Screen>
      <Header />
      <TabPager
        key={tabs.length}
        tabs={tabs}
        header={
          <HubHeader
            color={s?.color ?? colors.brand}
            overline={`${s?.format === 'T20' ? 'T20' : s?.format} · ${s?.kind.toUpperCase()}`}
            title={s?.name ?? 'Series'}
            subtitle={s ? `${shortDate(s.start)} – ${shortDate(s.end)}` : undefined}
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
            case 'matches':
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <MatchList matches={data.matches} />
                </Body>
              );
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
              return (
                <Body contentStyle={{ paddingTop: space.lg }}>
                  <Card padded={false} style={{ marginHorizontal: space.lg }}>
                    {allSeries.map((x, i) => (
                      <View key={x.id}>
                        {i > 0 ? <Hairline inset={space.lg} /> : null}
                        <Touch onPress={() => nav.replace('Series', { id: x.id })} style={styles.seriesRow}>
                          <View style={styles.badges}>
                            {x.teamIds.slice(0, 2).map(t => (
                              <TeamBadge key={t} id={t} size={26} style={{ marginRight: -6 }} />
                            ))}
                          </View>
                          <View style={{ flex: 1, marginLeft: 14 }}>
                            <AppText variant="label" weight="600" numberOfLines={1}>
                              {x.name}
                            </AppText>
                            <AppText variant="caption" color="textMuted">
                              {x.format} · {shortDate(x.start)} · {x.teamIds.length > 2 ? `${x.teamIds.length} teams` : x.teamIds.map(t => team(t).short).join(' v ')}
                            </AppText>
                          </View>
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
  seriesRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 60 },
  badges: { flexDirection: 'row', width: 52 },
});
