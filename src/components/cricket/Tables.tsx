import React from 'react';
import { StyleSheet, View } from 'react-native';
import { player, playerName, team as teamOf } from '../../data/refs';
import type { BatterLine, BowlerLine, Standing } from '../../data/types';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';
import { economy, overs, strikeRate } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Hairline } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { TeamBadge } from './Badges';

const COL = 40;

function HeadRow({ first, cols }: { first: string; cols: string[] }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, styles.head, { backgroundColor: colors.elevated }]}>
      <AppText variant="micro" color="textMuted" style={{ flex: 1 }}>
        {first}
      </AppText>
      {cols.map((c, i) => (
        <AppText key={c} variant="micro" color="textMuted" align="right" style={{ width: i === cols.length - 1 ? COL + 10 : COL }}>
          {c}
        </AppText>
      ))}
    </View>
  );
}

function Num({ v, strong, last }: { v: string | number; strong?: boolean; last?: boolean }) {
  return (
    <AppText
      variant="label"
      weight={strong ? '700' : '500'}
      color={strong ? 'text' : 'textSecondary'}
      tabular
      align="right"
      style={{ width: last ? COL + 10 : COL }}
    >
      {v}
    </AppText>
  );
}

export function BattingTable({ lines, showDismissal = true }: { lines: BatterLine[]; showDismissal?: boolean }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return (
    <View>
      <HeadRow first="BATTER" cols={['R', 'B', '4s', '6s', 'SR']} />
      {lines.map((l, i) => {
        const notOut = !l.dismissal;
        return (
          <View key={l.playerId}>
            {i > 0 ? <Hairline inset={space.lg} /> : null}
            <Touch onPress={() => player(l.playerId) && nav.navigate('Player', { id: l.playerId })} style={styles.row}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={styles.nameRow}>
                  <AppText variant="label" weight={notOut ? '700' : '600'} numberOfLines={1}>
                    {playerName(l.playerId)}
                  </AppText>
                  {l.onStrike ? <View style={[styles.strike, { backgroundColor: colors.accent }]} /> : null}
                </View>
                {showDismissal ? (
                  <AppText variant="caption" color={notOut ? 'success' : 'textMuted'} numberOfLines={1} style={{ marginTop: 2 }}>
                    {l.dismissal ?? 'not out'}
                  </AppText>
                ) : null}
              </View>
              <Num v={l.runs} strong />
              <Num v={l.balls} />
              <Num v={l.fours} />
              <Num v={l.sixes} />
              <Num v={strikeRate(l.runs, l.balls)} last />
            </Touch>
          </View>
        );
      })}
    </View>
  );
}

export function BowlingTable({ lines }: { lines: BowlerLine[] }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return (
    <View>
      <HeadRow first="BOWLER" cols={['O', 'M', 'R', 'W', 'ECON']} />
      {lines.map((l, i) => (
        <View key={l.playerId}>
          {i > 0 ? <Hairline inset={space.lg} /> : null}
          <Touch onPress={() => player(l.playerId) && nav.navigate('Player', { id: l.playerId })} style={[styles.row, { minHeight: 48 }]}>
            <View style={[styles.nameRow, { flex: 1, paddingRight: 8 }]}>
              <AppText variant="label" weight="600" numberOfLines={1}>
                {playerName(l.playerId)}
              </AppText>
              {l.current ? <View style={[styles.strike, { backgroundColor: colors.live }]} /> : null}
            </View>
            <Num v={overs(l.balls)} />
            <Num v={l.maidens} />
            <Num v={l.runs} />
            <Num v={l.wickets} strong />
            <Num v={economy(l.runs, l.balls)} last />
          </Touch>
        </View>
      ))}
    </View>
  );
}

export function PointsTable({ rows, compact }: { rows: Standing[]; compact?: boolean }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  return (
    <View>
      <View style={[styles.row, styles.head, { backgroundColor: colors.elevated }]}>
        <AppText variant="micro" color="textMuted" style={{ width: 22 }}>
          #
        </AppText>
        <AppText variant="micro" color="textMuted" style={{ flex: 1 }}>
          TEAM
        </AppText>
        {['P', 'W', 'L', ...(compact ? [] : ['NR']), 'NRR', 'PTS'].map(c => (
          <AppText key={c} variant="micro" color="textMuted" align="right" style={{ width: c === 'NRR' ? 54 : 30 }}>
            {c}
          </AppText>
        ))}
      </View>
      {rows.map((r, i) => {
        const t = teamOf(r.teamId);
        return (
          <View key={r.teamId}>
            {i > 0 ? <Hairline inset={space.lg} /> : null}
            <Touch onPress={() => nav.navigate('Team', { id: r.teamId })} style={[styles.row, { minHeight: 52 }]}>
              <View style={{ width: 22 }}>
                <AppText variant="label" weight="700" color={r.qualified ? 'success' : 'textMuted'} tabular>
                  {i + 1}
                </AppText>
              </View>
              <View style={[styles.nameRow, { flex: 1 }]}>
                <TeamBadge id={r.teamId} size={26} />
                <AppText variant="label" weight="600" numberOfLines={1} style={{ marginLeft: 10, flex: 1 }}>
                  {compact ? t.short : t.name}
                </AppText>
              </View>
              {[r.played, r.won, r.lost, ...(compact ? [] : [r.noResult])].map((v, k) => (
                <AppText key={k} variant="label" color="textSecondary" tabular align="right" style={{ width: 30 }}>
                  {v}
                </AppText>
              ))}
              <AppText variant="label" color="textSecondary" tabular align="right" style={{ width: 54 }}>
                {r.nrr > 0 ? '+' : ''}
                {r.nrr.toFixed(3)}
              </AppText>
              <AppText variant="label" weight="700" tabular align="right" style={{ width: 30 }}>
                {r.points}
              </AppText>
            </Touch>
          </View>
        );
      })}
    </View>
  );
}

export function FormGuide({ form }: { form: ('W' | 'L' | 'N')[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {form.map((f, i) => (
        <View
          key={i}
          style={[
            styles.form,
            { backgroundColor: f === 'W' ? colors.successSoft : f === 'L' ? colors.dangerSoft : colors.elevated },
          ]}
        >
          <AppText variant="micro" color={f === 'W' ? 'success' : f === 'L' ? 'danger' : 'textMuted'}>
            {f}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 10, minHeight: 56 },
  head: { minHeight: 34, paddingVertical: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  strike: { width: 6, height: 6, borderRadius: 3, marginLeft: 6 },
  form: { width: 20, height: 20, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
});
