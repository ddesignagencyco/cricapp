import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { AppText } from '../../components/ui/AppText';
import { ChipRow, Segmented, SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, Hairline } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { player, team } from '../../data/refs';
import { PAKISTAN_ID, repo } from '../../data/repo';
import type { Ranking } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { space } from '../../theme/tokens';

type Kind = 'teams' | 'batters' | 'bowlers';
type Fmt = 'T20' | 'ODI' | 'Test';

function Change({ n }: { n: number }) {
  const { colors } = useTheme();
  if (!n) return <AppText variant="caption" color="textDisabled" style={{ width: 34, textAlign: 'right' }}>–</AppText>;
  const up = n > 0;
  return (
    <View style={[styles.change]}>
      <Icon name={up ? 'chevronUp' : 'chevronDown'} size={14} color={up ? colors.success : colors.danger} />
      <AppText variant="caption" weight="700" color={up ? 'success' : 'danger'} tabular>
        {Math.abs(n)}
      </AppText>
    </View>
  );
}

export default function RankingsScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const [kind, setKind] = useState<Kind>('teams');
  const [fmt, setFmt] = useState<Fmt>('T20');
  const { data } = useQuery('rankings', repo.rankings);

  const rows: Ranking[] = !data ? [] : kind === 'teams' ? data.teams[fmt] : data.players[kind];

  return (
    <Screen>
      <Header title="ICC rankings" subtitle={kind === 'teams' ? `Men's ${fmt === 'T20' ? 'T20I' : fmt}` : `Men's T20I ${kind}`} />
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { key: 'teams', label: 'Teams' },
            { key: 'batters', label: 'Batters' },
            { key: 'bowlers', label: 'Bowlers' },
          ]}
        />
      </View>
      {kind === 'teams' ? (
        <View style={{ paddingBottom: space.md }}>
          <ChipRow
            value={fmt}
            onChange={setFmt}
            options={[
              { key: 'T20', label: 'T20I' },
              { key: 'ODI', label: 'ODI' },
              { key: 'Test', label: 'Test' },
            ]}
          />
        </View>
      ) : null}
      {!data ? (
        <SkeletonList count={6} height={56} />
      ) : !rows.length ? (
        <EmptyState icon="listOrdered" title="Rankings aren’t available yet" body="ICC team and player rankings will appear here once our data feed includes them." />
      ) : (
        <Body>
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {rows.map((r, i) => {
              const isTeam = kind === 'teams';
              const name = isTeam ? team(r.id).name : player(r.id)?.name;
              const sub = isTeam ? (r.matches ? `${r.matches} matches` : '') : team(player(r.id)?.teamId ?? '').name;
              const pakRow = isTeam ? r.id === PAKISTAN_ID : player(r.id)?.teamId === PAKISTAN_ID;
              return (
                <View key={r.id}>
                  {i > 0 ? <Hairline inset={space.lg} /> : null}
                  <Touch
                    onPress={() => (isTeam ? nav.navigate('Team', { id: r.id }) : nav.navigate('Player', { id: r.id }))}
                    style={[styles.row, pakRow && { backgroundColor: colors.pakistanSoft }]}
                  >
                    <AppText variant="headline" weight="700" tabular color={r.rank <= 3 ? 'text' : 'textMuted'} style={{ width: 30 }}>
                      {r.rank}
                    </AppText>
                    {isTeam ? <TeamBadge id={r.id} size={34} /> : <Avatar playerId={r.id} size={34} />}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <AppText variant="label" weight="700">
                        {name}
                      </AppText>
                      {sub ? (
                        <AppText variant="caption" color="textMuted">
                          {sub}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="headline" weight="700" tabular>
                      {r.rating}
                    </AppText>
                    <Change n={r.change} />
                  </Touch>
                </View>
              );
            })}
          </Card>
          <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
            Rating points. Arrows show places moved since the last update.
          </AppText>
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 60 },
  change: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', width: 34 },
});
