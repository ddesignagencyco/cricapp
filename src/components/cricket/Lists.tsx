import React from 'react';
import { StyleSheet, View } from 'react-native';
import { player as playerOf, team } from '../../data/refs';
import type { Article, Match, Player } from '../../data/types';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { Card, EmptyState, Hairline } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { Avatar } from './Badges';
import { MatchRow } from './MatchCards';
import { NewsRow } from './NewsCards';

/** Reusable list blocks for hubs and entity pages. */

export function MatchList({ matches, empty = 'No matches scheduled' }: { matches: Match[]; empty?: string }) {
  if (!matches.length) return <EmptyState icon="calendar" title={empty} />;
  return (
    <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
      {matches.map(m => (
        <MatchRow key={m.id} match={m} />
      ))}
    </View>
  );
}

export function NewsList({ articles }: { articles: Article[] }) {
  if (!articles.length) return <EmptyState icon="newspaper" title="No stories yet" />;
  return (
    <View>
      {articles.map((a, i) => (
        <View key={a.id}>
          {i > 0 ? <Hairline inset={space.lg} /> : null}
          <NewsRow article={a} />
        </View>
      ))}
    </View>
  );
}

export function PlayerList({ players, meta }: { players: Player[]; meta?: (p: Player) => string }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return (
    <Card padded={false} style={{ marginHorizontal: space.lg }}>
      {players.map((p, i) => (
        <View key={p.id}>
          {i > 0 ? <Hairline inset={68} /> : null}
          <Touch onPress={() => nav.navigate('Player', { id: p.id })} style={styles.row}>
            <Avatar playerId={p.id} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="label" weight="600">
                {p.name}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {meta ? meta(p) : `${p.role} · ${team(p.teamId).short}`}
              </AppText>
            </View>
            <Icon name="chevronRight" size={16} color={colors.textMuted} />
          </Touch>
        </View>
      ))}
    </Card>
  );
}

/** Ranked stat leaders ("Most runs"). */
export function Leaders({ title, rows, unit }: { title: string; rows: { playerId: string; value: number }[]; unit: string }) {
  const nav = useNavigation();
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <Card style={{ marginHorizontal: space.lg }}>
      <AppText variant="label" weight="700" style={{ marginBottom: space.sm }}>
        {title}
      </AppText>
      {rows.map((r, i) => {
        const p = playerOf(r.playerId);
        const color = team(p?.teamId ?? '').color;
        return (
          <Touch key={r.playerId} onPress={() => nav.navigate('Player', { id: r.playerId })} style={styles.leader}>
            <AppText variant="label" weight="700" color="textMuted" tabular style={{ width: 20 }}>
              {i + 1}
            </AppText>
            <Avatar playerId={r.playerId} size={32} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText variant="label" weight="600">
                {p?.name}
              </AppText>
              <View style={{ height: 4, borderRadius: 2, marginTop: 6, width: `${(r.value / max) * 100}%`, backgroundColor: color }} />
            </View>
            <View style={{ marginLeft: 12, alignItems: 'flex-end', minWidth: 50 }}>
              <AppText variant="headline" weight="700" tabular>
                {r.value.toLocaleString()}
              </AppText>
              <AppText variant="micro" color="textMuted">
                {unit}
              </AppText>
            </View>
          </Touch>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12 },
  leader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
});
