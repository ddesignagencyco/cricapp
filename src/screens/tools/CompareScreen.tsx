import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { AppText } from '../../components/ui/AppText';
import { Segmented } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { allPlayers, allTeams, player, team } from '../../data/refs';
import { repo } from '../../data/repo';
import type { Format } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

function Picker({ ids, value, onChange, kind }: { ids: string[]; value: string; onChange: (id: string) => void; kind: 'players' | 'teams' }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
      {ids.map(id => {
        const on = id === value;
        return (
          <Touch
            key={id}
            onPress={() => onChange(id)}
            accessibilityState={{ selected: on }}
            style={[styles.pick, { backgroundColor: on ? colors.brandSoft : colors.surface, borderColor: on ? colors.brand : colors.hairline }]}
          >
            {kind === 'players' ? <Avatar playerId={id} size={36} /> : <TeamBadge id={id} size={36} />}
            <AppText variant="caption" weight="600" numberOfLines={1} style={{ marginTop: 6, maxWidth: 76 }} align="center">
              {kind === 'players' ? player(id)?.short : team(id).short}
            </AppText>
          </Touch>
        );
      })}
    </ScrollView>
  );
}

function Duel({ label, a, b, colorA, colorB, higherIsBetter = true, format = (n: number) => String(n) }: {
  label: string;
  a: number;
  b: number;
  colorA: string;
  colorB: string;
  higherIsBetter?: boolean;
  format?: (n: number) => string;
}) {
  const { colors } = useTheme();
  const total = a + b || 1;
  const aWins = higherIsBetter ? a > b : a < b;
  const bWins = higherIsBetter ? b > a : b < a;
  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.rowC}>
        <AppText variant="headline" weight={aWins ? '700' : '500'} color={aWins ? 'text' : 'textSecondary'} tabular style={{ width: 80 }}>
          {format(a)}
        </AppText>
        <AppText variant="caption" color="textMuted" align="center" style={{ flex: 1 }}>
          {label}
        </AppText>
        <AppText variant="headline" weight={bWins ? '700' : '500'} color={bWins ? 'text' : 'textSecondary'} tabular align="right" style={{ width: 80 }}>
          {format(b)}
        </AppText>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.elevated }]}>
        <View style={{ flex: a / total, backgroundColor: colorA, opacity: aWins ? 1 : 0.45, borderRadius: 3 }} />
        <View style={{ width: 3 }} />
        <View style={{ flex: b / total, backgroundColor: colorB, opacity: bWins ? 1 : 0.45, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function Players() {
  const [a, setA] = useState('babar');
  const [b, setB] = useState('gill');
  const [fmt, setFmt] = useState<Format>('T20');
  const ids = allPlayers.filter(p => p.stats[fmt]).map(p => p.id);
  const pa = player(a)!;
  const pb = player(b)!;
  const sa = pa.stats[fmt];
  const sb = pb.stats[fmt];
  const ca = team(pa.teamId).color;
  const cb = team(pb.teamId).color === ca ? '#7B98FF' : team(pb.teamId).color;
  return (
    <Body>
      <View style={{ paddingHorizontal: space.lg, marginTop: space.sm }}>
        <Segmented value={fmt} onChange={setFmt} options={(['T20', 'ODI', 'Test'] as Format[]).map(f => ({ key: f, label: f === 'T20' ? 'T20I' : f }))} />
      </View>
      <SectionHeader title="Player 1" style={{ marginTop: space.lg }} />
      <Picker ids={ids} value={a} onChange={setA} kind="players" />
      <SectionHeader title="Player 2" style={{ marginTop: space.lg }} />
      <Picker ids={ids} value={b} onChange={setB} kind="players" />
      <Card style={{ marginHorizontal: space.lg, marginTop: space.xl }}>
        <View style={styles.rowC}>
          <View style={[styles.rowC, { flex: 1 }]}>
            <Avatar playerId={a} size={40} />
            <AppText variant="label" weight="700" style={{ marginLeft: 10, flex: 1 }} numberOfLines={2}>
              {pa.name}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted" style={{ marginHorizontal: 8 }}>
            vs
          </AppText>
          <View style={[styles.rowC, { flex: 1, justifyContent: 'flex-end' }]}>
            <AppText variant="label" weight="700" style={{ marginRight: 10, flex: 1 }} align="right" numberOfLines={2}>
              {pb.name}
            </AppText>
            <Avatar playerId={b} size={40} />
          </View>
        </View>
        {sa && sb ? (
          <>
            <Duel label="Matches" a={sa.matches} b={sb.matches} colorA={ca} colorB={cb} />
            <Duel label="Runs" a={sa.runs} b={sb.runs} colorA={ca} colorB={cb} format={n => n.toLocaleString()} />
            <Duel label="Average" a={sa.average} b={sb.average} colorA={ca} colorB={cb} format={n => n.toFixed(1)} />
            <Duel label="Strike rate" a={sa.strikeRate} b={sb.strikeRate} colorA={ca} colorB={cb} format={n => n.toFixed(1)} />
            <Duel label="Wickets" a={sa.wickets} b={sb.wickets} colorA={ca} colorB={cb} />
            {sa.economy && sb.economy ? <Duel label="Economy" a={sa.economy} b={sb.economy} colorA={ca} colorB={cb} higherIsBetter={false} format={n => n.toFixed(2)} /> : null}
          </>
        ) : (
          <AppText variant="caption" color="textMuted" style={{ marginTop: 14 }}>
            One of these players has no {fmt} record.
          </AppText>
        )}
      </Card>
    </Body>
  );
}

function Teams() {
  const ids = allTeams.filter(t => t.kind === 'international').map(t => t.id);
  const [a, setA] = useState('pak');
  const [b, setB] = useState('sa');
  const h2h = useQuery(`h2h:${a}-${b}`, () => repo.headToHead(a, b));
  const ranks = useQuery('rankings', repo.rankings);
  const ta = team(a);
  const tb = team(b);
  const r = h2h.data;
  const flip = r && `${a}-${b}` !== 'pak-sa' && `${b}-${a}` === 'pak-sa';
  const aWins = r ? (flip ? r.bWins : r.aWins) : 0;
  const bWins = r ? (flip ? r.aWins : r.bWins) : 0;
  const rating = (id: string, f: 'T20' | 'ODI' | 'Test') => ranks.data?.teams[f].find(x => x.id === id)?.rating ?? 0;
  return (
    <Body>
      <SectionHeader title="Team 1" style={{ marginTop: space.sm }} />
      <Picker ids={ids} value={a} onChange={setA} kind="teams" />
      <SectionHeader title="Team 2" style={{ marginTop: space.lg }} />
      <Picker ids={ids} value={b} onChange={setB} kind="teams" />
      <Card style={{ marginHorizontal: space.lg, marginTop: space.xl }}>
        <View style={styles.rowC}>
          <TeamBadge id={a} size={44} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="overline" color="textMuted">
              T20I HEAD-TO-HEAD
            </AppText>
            <AppText variant="display" tabular>
              {r ? `${aWins} – ${bWins}` : '–'}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {r ? `${r.played} played` : 'No record in sample data'}
            </AppText>
          </View>
          <TeamBadge id={b} size={44} />
        </View>
        {r ? (
          <View style={[styles.rowC, { justifyContent: 'center', gap: 6, marginTop: 14 }]}>
            <AppText variant="caption" color="textMuted" style={{ marginRight: 4 }}>
              Last 5
            </AppText>
            {r.last5.map((w, i) => (
              <TeamBadge key={i} id={w} size={22} />
            ))}
          </View>
        ) : null}
      </Card>
      <Card style={{ marginHorizontal: space.lg, marginTop: space.md }}>
        <AppText variant="label" weight="700">
          ICC rating
        </AppText>
        {(['T20', 'ODI', 'Test'] as const).map(f => (
          <Duel key={f} label={f === 'T20' ? 'T20I' : f} a={rating(a, f)} b={rating(b, f)} colorA={ta.color} colorB={tb.color === ta.color ? '#7B98FF' : tb.color} />
        ))}
      </Card>
    </Body>
  );
}

export default function CompareScreen() {
  const { kind } = useParams('Compare');
  const [k, setK] = useState(kind);
  return (
    <Screen>
      <Header title="Compare" />
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Segmented
          value={k}
          onChange={setK}
          options={[
            { key: 'players', label: 'Players' },
            { key: 'teams', label: 'Teams' },
          ]}
        />
      </View>
      {k === 'players' ? <Players /> : <Teams />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  pick: { width: 84, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
});
