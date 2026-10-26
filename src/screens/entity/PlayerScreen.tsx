import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { MatchList, NewsList } from '../../components/cricket/Lists';
import { AppText } from '../../components/ui/AppText';
import { Segmented, SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { repo } from '../../data/repo';
import type { Format } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { shortDate } from '../../utils/format';

function Stat({ label, value }: { label: string; value: string | number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <AppText variant="title" tabular>
        {value}
      </AppText>
      <AppText variant="micro" color="textMuted" style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

export default function PlayerScreen() {
  const { id } = useParams('Player');
  const nav = useNavigation();
  const { data } = useQuery(`player:${id}`, () => repo.player(id));
  const formats = (['T20', 'ODI', 'Test'] as Format[]).filter(f => data?.player.stats[f]);
  const [fmt, setFmt] = useState<Format | null>(null);

  if (!data) {
    return (
      <Screen>
        <Header title="Player" />
        <SkeletonList count={3} height={140} />
      </Screen>
    );
  }
  const p = data.player;
  const t = team(p.teamId);
  const f = fmt ?? formats[0];
  const s = p.stats[f];
  const bowler = p.role === 'Bowler' || (s?.wickets ?? 0) > (s?.runs ?? 0) / 20;

  return (
    <Screen>
      <Header title="Player" />
      <Body>
        <HubHeader
          color={t.color}
          overline={p.role.toUpperCase()}
          title={p.name}
          subtitle={`${t.name}${p.age ? ` · ${p.age} yrs` : ''}`}
          favourite={{ kind: 'player', id }}
          mark={<Avatar playerId={id} size={64} />}
        />

        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          {(
            [
              ['Born', p.born ? shortDate(p.born) : ''],
              ['Country', p.nationality ?? ''],
              ['Batting', p.batting],
              ['Bowling', p.bowling ?? ''],
            ] as [string, string][]
          )
            .filter(([, v]) => v)
            .map(([k, v], i) => (
            <View key={k}>
              {i > 0 ? <Hairline inset={space.lg} /> : null}
              <View style={styles.kv}>
                <AppText variant="label" color="textMuted" style={{ width: 90 }}>
                  {k}
                </AppText>
                <AppText variant="label" weight="600">
                  {v}
                </AppText>
              </View>
            </View>
          ))}
          <Hairline inset={space.lg} />
          <Touch onPress={() => nav.navigate('Team', { id: t.id })} style={styles.kv}>
            <AppText variant="label" color="textMuted" style={{ width: 90 }}>
              Team
            </AppText>
            <TeamBadge id={t.id} size={22} />
            <AppText variant="label" weight="600" color="accent" style={{ marginLeft: 8 }}>
              {t.name}
            </AppText>
          </Touch>
        </Card>

        {formats.length ? <SectionHeader title="Career" style={{ marginTop: space.xxl }} /> : null}
        {formats.length > 1 ? (
          <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
            <Segmented value={f} onChange={setFmt} options={formats.map(x => ({ key: x, label: x === 'T20' ? 'T20I' : x }))} />
          </View>
        ) : null}
        {s ? (
          <View style={styles.grid}>
            <Stat label="MATCHES" value={s.matches} />
            {bowler ? (
              <>
                <Stat label="WICKETS" value={s.wickets} />
                <Stat label="ECONOMY" value={s.economy.toFixed(2)} />
                <Stat label="AVERAGE" value={s.bowlingAverage ? s.bowlingAverage.toFixed(1) : '-'} />
                <Stat label="BEST" value={s.best} />
                <Stat label="RUNS" value={s.runs} />
              </>
            ) : (
              <>
                <Stat label="RUNS" value={s.runs.toLocaleString()} />
                <Stat label="AVERAGE" value={s.average.toFixed(1)} />
                <Stat label="STRIKE RATE" value={s.strikeRate.toFixed(1)} />
                <Stat label="100s / 50s" value={`${s.hundreds} / ${s.fifties}`} />
                <Stat label="HIGHEST" value={s.best} />
              </>
            )}
          </View>
        ) : null}

        {data.recentMatches.length ? (
          <>
            <SectionHeader title="Recent matches" style={{ marginTop: space.xxl }} />
            <MatchList matches={data.recentMatches.slice(0, 5)} />
          </>
        ) : null}

        {data.news.length ? (
          <>
            <SectionHeader title="In the news" style={{ marginTop: space.xxl }} />
            <NewsList articles={data.news} />
          </>
        ) : null}
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kv: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 50 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  stat: { width: '31.8%', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, paddingVertical: space.md, paddingHorizontal: space.md },
});
