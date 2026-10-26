import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { AppText } from '../../components/ui/AppText';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { player, rememberTeam, team } from '../../data/refs';
import { PAKISTAN_ID, repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
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

/** Full members whose provider ids we know; the API fills in the rest on first fetch. */
const TEAMS: { id: string; name: string; short: string }[] = [
  { id: PAKISTAN_ID, name: 'Pakistan', short: 'PAK' },
  { id: 'sr:competitor:107203', name: 'India', short: 'IND' },
  { id: 'sr:competitor:107205', name: 'England', short: 'ENG' },
  { id: 'sr:competitor:142702', name: 'New Zealand', short: 'NZ' },
  { id: 'sr:competitor:142688', name: 'Afghanistan', short: 'AFG' },
  { id: 'sr:competitor:142692', name: 'Bangladesh', short: 'BAN' },
];
TEAMS.forEach(t => rememberTeam(t));

function Teams() {
  const ids = TEAMS.map(t => t.id);
  const [a, setA] = useState(ids[0]);
  const [b, setB] = useState(ids[1]);
  const h2h = useQuery(`h2h:${a}-${b}`, () => repo.headToHead(a, b));
  const r = a === b ? undefined : h2h.data;
  const caption =
    a === b
      ? 'Pick two different teams'
      : h2h.loading
        ? 'Loading…'
        : r
          ? `Last ${r.played} meetings${r.noResult ? ` · ${r.noResult} no result` : ''}`
          : 'No recent meetings on record';
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
              HEAD-TO-HEAD
            </AppText>
            <AppText variant="display" tabular>
              {r ? `${r.aWins} – ${r.bWins}` : '–'}
            </AppText>
            <AppText variant="caption" color="textSecondary" align="center">
              {caption}
            </AppText>
          </View>
          <TeamBadge id={b} size={44} />
        </View>
        {r ? (
          <View style={[styles.rowC, { justifyContent: 'center', gap: 6, marginTop: 14 }]}>
            <AppText variant="caption" color="textMuted" style={{ marginRight: 4 }}>
              Latest
            </AppText>
            {r.last5.map((w, i) => (w ? <TeamBadge key={i} id={w} size={22} /> : <View key={i} style={styles.nr} />))}
          </View>
        ) : null}
      </Card>
    </Body>
  );
}

export default function CompareScreen() {
  return (
    <Screen>
      <Header title="Compare teams" />
      <Teams />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  pick: { width: 84, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5 },
  nr: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#8A90A0' },
});
