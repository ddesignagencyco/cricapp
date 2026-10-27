import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { MatchRow } from '../../components/cricket/MatchCards';
import { AppText } from '../../components/ui/AppText';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, Hairline, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { team } from '../../data/refs';
import { repo, type Meeting } from '../../data/repo';
import type { Player, Team } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { fontFamily, radius, space } from '../../theme/tokens';
import { shortDate } from '../../utils/format';

/* ---------- Search picker ---------- */

type Option = { id: string; title: string; sub?: string };

/**
 * A search box that becomes the chosen item. Results list right under the
 * field (no floating menu, so it never hides behind the keyboard or clips
 * on small screens).
 */
function SearchPick<T>({
  label,
  placeholder,
  selected,
  onSelect,
  search,
  toOption,
  leading,
}: {
  label: string;
  placeholder: string;
  selected?: T;
  onSelect: (item?: T) => void;
  search: (q: string) => Promise<T[]>;
  toOption: (item: T) => Option;
  leading: (item: T) => React.ReactNode;
}) {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<T[]>([]);
  const [busy, setBusy] = useState(false);
  const [answered, setAnswered] = useState('');
  const latest = useRef('');

  useEffect(() => {
    const needle = q.trim();
    latest.current = needle;
    if (needle.length < 2) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    // Wait for a pause in typing; drop answers to older queries.
    const t = setTimeout(() => {
      search(needle)
        .then(r => latest.current === needle && setHits(r))
        .catch(() => latest.current === needle && setHits([]))
        .finally(() => {
          if (latest.current !== needle) return;
          setBusy(false);
          setAnswered(needle);
        });
    }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  if (selected) {
    const o = toOption(selected);
    return (
      <View>
        <AppText variant="label" weight="600" color="textSecondary" style={styles.fieldLabel}>
          {label}
        </AppText>
        <View style={[styles.field, styles.chosen, { backgroundColor: colors.surface, borderColor: colors.brand }]}>
          {leading(selected)}
          <View style={{ flex: 1, marginLeft: space.md }}>
            <AppText variant="label" weight="700" numberOfLines={1}>
              {o.title}
            </AppText>
            {o.sub ? (
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {o.sub}
              </AppText>
            ) : null}
          </View>
          <Touch onPress={() => onSelect(undefined)} style={styles.clear} accessibilityLabel={`Change ${label}`}>
            <Icon name="x" size={18} color={colors.textSecondary} />
          </Touch>
        </View>
      </View>
    );
  }

  const needle = q.trim();
  return (
    <View>
      <AppText variant="label" weight="600" color="textSecondary" style={styles.fieldLabel}>
        {label}
      </AppText>
      <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: colors.text, fontFamily: fontFamily['500'] }]}
          accessibilityLabel={label}
        />
        {busy ? <ActivityIndicator size="small" color={colors.accent} /> : null}
      </View>
      {needle.length >= 2 && !busy && hits.length ? (
        <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          {hits.map((h, i) => {
            const o = toOption(h);
            return (
              <View key={o.id}>
                {i > 0 ? <Hairline inset={space.lg + 32 + space.md} /> : null}
                <Touch
                  onPress={() => {
                    onSelect(h);
                    setQ('');
                    setHits([]);
                  }}
                  style={styles.option}
                >
                  {leading(h)}
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <AppText variant="label" weight="600" numberOfLines={1}>
                      {o.title}
                    </AppText>
                    {o.sub ? (
                      <AppText variant="caption" color="textMuted" numberOfLines={1}>
                        {o.sub}
                      </AppText>
                    ) : null}
                  </View>
                </Touch>
              </View>
            );
          })}
        </View>
      ) : needle.length >= 2 && !busy && answered === needle ? (
        <AppText variant="caption" color="textMuted" style={{ marginTop: space.sm, marginLeft: 4 }}>
          No matches for “{needle}”.
        </AppText>
      ) : null}
    </View>
  );
}

/* ---------- Teams ---------- */

const teamOption = (t: Team): Option => ({ id: t.id, title: t.name, sub: t.short });

function Teams({ initial }: { initial?: [string, string] }) {
  // Opened from a match: both sides are already chosen.
  const [a, setA] = useState<Team | undefined>(initial ? team(initial[0]) : undefined);
  const [b, setB] = useState<Team | undefined>(initial ? team(initial[1]) : undefined);
  return (
    <Body keyboardShouldPersistTaps="handled" contentStyle={{ paddingTop: space.lg }}>
      <View style={styles.pickers}>
        <SearchPick label="Team A" placeholder="Search a team" selected={a} onSelect={setA} search={repo.searchTeams} toOption={teamOption} leading={t => <TeamBadge id={t.id} size={32} />} />
        <SearchPick label="Team B" placeholder="Search a team" selected={b} onSelect={setB} search={repo.searchTeams} toOption={teamOption} leading={t => <TeamBadge id={t.id} size={32} />} />
      </View>
      {!a || !b ? (
        <Hint icon="swords" text="Pick two teams to see every meeting between them." />
      ) : a.id === b.id ? (
        <Hint icon="swords" text="Pick two different teams." />
      ) : (
        <TeamReport a={a.id} b={b.id} />
      )}
    </Body>
  );
}

function TeamReport({ a, b }: { a: string; b: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const { data, loading } = useQuery(`h2h:${a}-${b}`, () => repo.headToHead(a, b));
  if (!data) {
    return loading ? <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} /> : null;
  }
  const total = data.meetings.length;
  if (!total && !data.upcoming.length) {
    return (
      <View style={{ marginTop: space.xl }}>
        <EmptyState icon="swords" title="No meetings on record" body="These teams haven’t met in the matches we have. Try another pair." />
      </View>
    );
  }
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const A = team(a);
  const B = team(b);
  return (
    <>
      <Card style={[styles.block, { marginTop: space.xl }]}>
        <View style={styles.rowC}>
          <Touch onPress={() => nav.navigate('Team', { id: a })} style={styles.side}>
            <TeamBadge id={a} size={52} />
            <AppText variant="label" weight="700" align="center" numberOfLines={2} style={{ marginTop: space.sm }}>
              {A.name}
            </AppText>
          </Touch>
          <View style={{ alignItems: 'center', paddingHorizontal: space.sm }}>
            <AppText variant="display" tabular>
              {total}
            </AppText>
            <AppText variant="overline" color="textMuted">
              MEETINGS
            </AppText>
          </View>
          <Touch onPress={() => nav.navigate('Team', { id: b })} style={styles.side}>
            <TeamBadge id={b} size={52} />
            <AppText variant="label" weight="700" align="center" numberOfLines={2} style={{ marginTop: space.sm }}>
              {B.name}
            </AppText>
          </Touch>
        </View>
        {total ? (
        <View style={[styles.tally, { marginTop: space.lg }]}>
          <TallyBox value={data.aWins} label={`${A.short} WINS`} color={A.color} />
          <TallyBox value={data.noResult} label="NO RESULT" />
          <TallyBox value={data.bWins} label={`${B.short} WINS`} color={B.color} />
        </View>
        ) : (
          <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: space.lg }}>
            No completed meetings in our records yet.
          </AppText>
        )}
        {total ? (
          <>
            <View style={[styles.split, { backgroundColor: colors.elevated, marginTop: space.lg }]}>
              <View style={{ flex: data.aWins, backgroundColor: A.color }} />
              <View style={{ flex: data.noResult, backgroundColor: colors.hairline }} />
              <View style={{ flex: data.bWins, backgroundColor: B.color }} />
            </View>
            <View style={[styles.rowC, { justifyContent: 'space-between', marginTop: 6 }]}>
              <AppText variant="caption" color="textSecondary" tabular>
                {A.short} {pct(data.aWins)}%
              </AppText>
              <AppText variant="caption" color="textSecondary" tabular>
                {pct(data.bWins)}% {B.short}
              </AppText>
            </View>
          </>
        ) : null}
      </Card>

      {data.upcoming.length ? (
        <>
          <SectionHeader title="Next meetings" style={{ marginTop: space.xl }} />
          <View style={styles.stack}>
            {data.upcoming.slice(0, 3).map(m => (
              <MatchRow key={m.id} match={m} />
            ))}
          </View>
        </>
      ) : null}

      {total ? (
        <>
          <SectionHeader title="Meeting report" style={{ marginTop: space.xl }} />
          <Card padded={false} style={styles.block}>
            {data.meetings.map((m, i) => (
              <View key={m.id}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <MeetingRow meeting={m} />
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </>
  );
}

function TallyBox({ value, label, color }: { value: number; label: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tallyBox, { backgroundColor: colors.elevated }]}>
      <AppText variant="headline" weight="700" tabular color={color ?? 'textSecondary'}>
        {value}
      </AppText>
      <AppText variant="micro" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function MeetingRow({ meeting: m }: { meeting: Meeting }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const winner = m.winnerId ? team(m.winnerId) : undefined;
  return (
    <Touch onPress={m.inApp ? () => nav.navigate('Match', { id: m.id }) : undefined} disabled={!m.inApp} style={styles.meeting}>
      <View style={styles.rowC}>
        <AppText variant="caption" color="textMuted" tabular>
          {m.date ? shortDate(m.date) : ''}
        </AppText>
        {m.competition ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1, marginLeft: space.sm }}>
            · {m.competition}
          </AppText>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {m.inApp ? <Icon name="chevronRight" size={16} color={colors.textMuted} /> : null}
      </View>
      <View style={[styles.rowC, { marginTop: 6 }]}>
        <TeamBadge id={m.teamA} size={22} />
        <AppText variant="label" weight="600" style={{ marginHorizontal: 6 }}>
          {team(m.teamA).short} v {team(m.teamB).short}
        </AppText>
        <TeamBadge id={m.teamB} size={22} />
      </View>
      <AppText variant="label" weight="600" color={winner ? winner.color : 'textSecondary'} numberOfLines={2} style={{ marginTop: 6 }}>
        {m.summary}
      </AppText>
      {m.venue ? (
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
          {m.venue}
        </AppText>
      ) : null}
    </Touch>
  );
}

/* ---------- Players ---------- */

const playerOption = (p: Player): Option => ({
  id: p.id,
  title: p.name,
  sub: [p.role !== 'Player' ? p.role : undefined, p.nationality ?? (p.teamId ? team(p.teamId).name : undefined)].filter(Boolean).join(' · '),
});

function Players() {
  const [a, setA] = useState<Player>();
  const [b, setB] = useState<Player>();
  return (
    <Body keyboardShouldPersistTaps="handled" contentStyle={{ paddingTop: space.lg }}>
      <View style={styles.pickers}>
        <SearchPick label="Player A" placeholder="Search a player" selected={a} onSelect={setA} search={repo.searchPlayers} toOption={playerOption} leading={p => <Avatar name={p.name} size={32} />} />
        <SearchPick label="Player B" placeholder="Search a player" selected={b} onSelect={setB} search={repo.searchPlayers} toOption={playerOption} leading={p => <Avatar name={p.name} size={32} />} />
      </View>
      {a && b && a.id !== b.id ? (
        <PlayerReport a={a.id} b={b.id} />
      ) : (
        <Hint icon="users" text={a && b ? 'Pick two different players.' : 'Pick two players to compare them side by side.'} />
      )}
    </Body>
  );
}

function PlayerReport({ a, b }: { a: string; b: string }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const pa = useQuery(`player:${a}`, () => repo.player(a));
  const pb = useQuery(`player:${b}`, () => repo.player(b));
  if (!pa.data || !pb.data) return <ActivityIndicator color={colors.accent} style={{ marginTop: space.xxl }} />;
  const A = pa.data.player;
  const B = pb.data.player;
  const rows: [string, string | undefined, string | undefined][] = [
    ['Team', A.teamId ? team(A.teamId).name : undefined, B.teamId ? team(B.teamId).name : undefined],
    ['Role', A.role !== 'Player' ? A.role : undefined, B.role !== 'Player' ? B.role : undefined],
    ['Nation', A.nationality, B.nationality],
    ['Batting', A.batting || undefined, B.batting || undefined],
    ['Bowling', A.bowling, B.bowling],
    ['Born', A.born ? shortDate(A.born) : undefined, B.born ? shortDate(B.born) : undefined],
    ['Age', A.age ? String(A.age) : undefined, B.age ? String(B.age) : undefined],
    ['Recent matches', String(pa.data.recentMatches.length), String(pb.data.recentMatches.length)],
  ];
  return (
    <Card padded={false} style={[styles.block, { marginTop: space.xl }]}>
      <View style={[styles.rowC, styles.compareHead]}>
        {[A, B].map(p => (
          <Touch key={p.id} onPress={() => nav.navigate('Player', { id: p.id })} style={styles.side}>
            <Avatar name={p.name} size={52} />
            <AppText variant="label" weight="700" align="center" numberOfLines={2} style={{ marginTop: space.sm }}>
              {p.name}
            </AppText>
            <AppText variant="caption" color="accent" weight="600" style={{ marginTop: 2 }}>
              View profile
            </AppText>
          </Touch>
        ))}
      </View>
      {rows
        .filter(([, x, y]) => x || y)
        .map(([label, x, y]) => (
          <View key={label}>
            <Hairline />
            <View style={styles.compareRow}>
              <AppText variant="label" weight="600" align="center" style={{ flex: 1 }} numberOfLines={2}>
                {x || '—'}
              </AppText>
              <AppText variant="micro" color="textMuted" align="center" style={{ width: 92 }}>
                {label.toUpperCase()}
              </AppText>
              <AppText variant="label" weight="600" align="center" style={{ flex: 1 }} numberOfLines={2}>
                {y || '—'}
              </AppText>
            </View>
          </View>
        ))}
    </Card>
  );
}

/* ---------- Screen ---------- */

function Hint({ icon, text }: { icon: 'swords' | 'users'; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hint}>
      <View style={[styles.hintIcon, { backgroundColor: colors.elevated }]}>
        <Icon name={icon} size={22} color={colors.textMuted} />
      </View>
      <AppText variant="body" color="textSecondary" align="center" style={{ marginTop: space.md }}>
        {text}
      </AppText>
    </View>
  );
}

const TABS = [
  { key: 'teams', label: 'Teams' },
  { key: 'players', label: 'Players' },
];

export default function CompareScreen() {
  const { kind, a, b } = useParams('Compare');
  return (
    <Screen>
      <Header title="Compare" />
      <TabPager tabs={TABS} initialKey={kind} renderPage={key => (key === 'players' ? <Players /> : <Teams initial={a && b ? [a, b] : undefined} />)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  pickers: { paddingHorizontal: space.lg, gap: space.lg },
  fieldLabel: { marginBottom: 6, marginLeft: 4 },
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: space.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2 },
  chosen: { borderWidth: 1.5, paddingVertical: space.sm },
  input: { flex: 1, fontSize: 16, marginLeft: space.sm, paddingVertical: 0 },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -space.sm },
  menu: { marginTop: 6, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 56, paddingVertical: space.sm },
  block: { marginHorizontal: space.lg },
  stack: { paddingHorizontal: space.lg, gap: space.sm },
  side: { flex: 1, alignItems: 'center', minWidth: 0 },
  tally: { flexDirection: 'row', gap: space.sm },
  tallyBox: { flex: 1, alignItems: 'center', paddingVertical: space.md, borderRadius: radius.md },
  split: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  meeting: { paddingHorizontal: space.lg, paddingVertical: space.md },
  compareHead: { alignItems: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.lg },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 52 },
  hint: { alignItems: 'center', paddingHorizontal: space.xxl, paddingTop: space.xxl },
  hintIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
