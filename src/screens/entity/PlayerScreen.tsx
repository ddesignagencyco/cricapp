import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { HubHeader } from '../../components/cricket/HubHeader';
import { NewsList } from '../../components/cricket/Lists';
import { AppText } from '../../components/ui/AppText';
import { Segmented, SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Button, Card, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { repo } from '../../data/repo';
import type { Format } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

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
  const { colors } = useTheme();
  const { data } = useQuery(`player:${id}`, () => repo.player(id));
  const formats = (['T20', 'ODI', 'Test'] as Format[]).filter(f => data?.player.stats[f]);
  const [fmt, setFmt] = useState<Format | null>(null);

  if (!data) {
    return (
      <Screen>
        <Header />
        <SkeletonList count={3} height={140} />
      </Screen>
    );
  }
  const p = data.player;
  const t = team(p.teamId);
  const f = fmt ?? formats[0];
  const s = p.stats[f];
  const bowler = p.role === 'Bowler' || (s?.wickets ?? 0) > (s?.runs ?? 0) / 20;
  const maxRecent = Math.max(...p.recent, 1);

  return (
    <Screen>
      <Header />
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
          {[
            ['Batting', p.batting],
            ...(p.bowling ? [['Bowling', p.bowling]] : []),
          ].map(([k, v], i) => (
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

        <SectionHeader title="Career" style={{ marginTop: space.xxl }} />
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

        <SectionHeader title="Recent form" overline={bowler ? 'WICKETS · LAST 5' : 'RUNS · LAST 5'} style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          <View style={styles.form}>
            {p.recent.map((r, i) => (
              <View key={i} style={styles.formCol}>
                <AppText variant="label" weight="700" tabular>
                  {r}
                </AppText>
                <View style={[styles.formBar, { height: 8 + (r / maxRecent) * 80, backgroundColor: i === p.recent.length - 1 ? t.color : colors.elevated }]} />
              </View>
            ))}
          </View>
          <AppText variant="caption" color="textMuted" align="right" style={{ marginTop: 8 }}>
            Latest on the right
          </AppText>
        </Card>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <Button label="Compare with another player" variant="secondary" icon="gitCompare" onPress={() => nav.navigate('Compare', { kind: 'players' })} />
        </View>

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
  form: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  formCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  formBar: { width: 28, borderRadius: 6, marginTop: 6 },
});
