import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Share, StyleSheet, View } from 'react-native';
import { Avatar, BallChip, BallStrip, TeamBadge } from '../../components/cricket/Badges';
import { LineChart, Manhattan, WinProbBar } from '../../components/cricket/Charts';
import { MatchHeroCard } from '../../components/cricket/MatchCards';
import { NewsRow } from '../../components/cricket/NewsCards';
import { CommentsThread } from '../../components/cricket/CommentsThread';
import { FavouriteButton } from '../../components/ui/FavouriteButton';
import { BattingTable, BowlingTable, PointsTable } from '../../components/cricket/Tables';
import { AppText } from '../../components/ui/AppText';
import { ChipRow, Segmented, SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, EmptyState, ErrorState, Glow, Hairline, IconButton, SectionHeader } from '../../components/ui/Primitives';
import { TabPager } from '../../components/ui/TabPager';
import { Touch } from '../../components/ui/Touch';
import { player, playerName, seriesOf, team, venue, venueLabel } from '../../data/refs';
import { repo } from '../../data/repo';
import { watchMatch } from '../../data/socket';
import type { Ball, Innings, Match, Prediction } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { dayLabel, overs, score, shortDate, time } from '../../utils/format';

function ScoreHeader({ match }: { match: Match }) {
  // Same scoreboard as the match lists, kept live by the socket.
  return (
    <View style={styles.scoreHeader}>
      <MatchHeroCard match={match} inline />
    </View>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
      <AppText variant="micro" color="textMuted">
        {label}
      </AppText>
      <AppText variant="headline" weight="700" tabular style={{ marginTop: 4 }}>
        {value}
      </AppText>
      {sub ? (
        <AppText variant="caption" color="textSecondary" numberOfLines={1}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

function ProbabilityCard({ match, prediction }: { match: Match; prediction: Prediction }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const a = team(match.teamA);
  const maxOver = match.format === 'T20' ? 20 : match.format === 'ODI' ? 50 : 90;
  return (
    <Card onPress={() => nav.navigate('Prediction', { id: match.id })} style={{ marginHorizontal: space.lg }}>
      <View style={styles.rowC}>
        <Icon name="sparkles" size={16} color={colors.accent} />
        <AppText variant="label" weight="700" style={{ marginLeft: 8, flex: 1 }}>
          Win probability
        </AppText>
        <AppText variant="caption" color="textMuted">
          Updated each ball
        </AppText>
      </View>
      <View style={{ marginTop: 14 }}>
        <WinProbBar teamA={match.teamA} teamB={match.teamB} p={prediction.winA} />
      </View>
      {prediction.history && prediction.history.length > 1 ? (
        <View style={{ marginTop: 18 }}>
          <LineChart
            points={prediction.history.map(h => ({ x: h.over, y: h.p, event: h.event }))}
            xMax={maxOver}
            height={110}
            color={a.color}
            colorBelow={team(match.teamB).color}
            xLabels={Array.from({ length: 5 }, (_, i) => String(Math.round((maxOver / 4) * i)))}
          />
        </View>
      ) : null}
      <View style={[styles.rowC, { marginTop: 14 }]}>
        <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Full prediction
        </AppText>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </View>
    </Card>
  );
}

const inPlay = (m: Match) => m.status === 'live' || m.status === 'break';
const isFinished = (m: Match) => m.status === 'completed';

/**
 * Summary from the match record alone, like the website when the ball-by-ball
 * timeline isn't available: innings totals, result, toss, venue and date.
 */
function SummaryFallback({ match }: { match: Match }) {
  const nav = useNavigation();
  const v = venue(match.venueId);
  const rows: [string, string | undefined][] = [
    ['Result', match.status === 'completed' ? match.statusText : undefined],
    ['Toss', match.toss],
    ['Venue', v ? [v.name, v.city].filter(Boolean).join(', ') : venueLabel(match.venueId) || undefined],
    // Midnight UTC means the feed only knew the day.
    ['Date', match.startTime ? (/T00:00(:00)?(\.000)?(Z|\+00:00)$/.test(match.startTime) ? shortDate(match.startTime) : `${shortDate(match.startTime)} · ${time(match.startTime)}`) : undefined],
    ['Series', seriesOf(match.seriesId)?.name],
  ];
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      {match.innings.length ? (
        <>
          <SectionHeader title="Innings" />
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {match.innings.map((inn, i) => (
              <View key={i}>
                {i > 0 ? <Hairline inset={space.lg} /> : null}
                <Touch onPress={() => nav.navigate('Team', { id: inn.teamId })} style={styles.summaryRow}>
                  <TeamBadge id={inn.teamId} size={28} />
                  <AppText variant="label" weight="600" style={{ flex: 1, marginLeft: space.md }} numberOfLines={1}>
                    {team(inn.teamId).name}
                  </AppText>
                  <AppText variant="score" tabular>
                    {score(inn)}
                  </AppText>
                  <AppText variant="caption" color="textMuted" tabular style={{ marginLeft: 6, minWidth: 44, textAlign: 'right' }}>
                    {inn.balls ? `${overs(inn.balls)} ov` : ''}
                  </AppText>
                </Touch>
              </View>
            ))}
          </Card>
        </>
      ) : null}
      <SectionHeader title="Match details" style={{ marginTop: space.xl }} />
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        {rows
          .filter(([, val]) => val)
          .map(([label, val], i) => (
            <View key={label}>
              {i > 0 ? <Hairline inset={space.lg} /> : null}
              <View style={styles.summaryRow}>
                <AppText variant="caption" color="textMuted" style={{ width: 72 }}>
                  {label}
                </AppText>
                <AppText variant="label" weight="600" style={{ flex: 1 }}>
                  {val}
                </AppText>
              </View>
            </View>
          ))}
      </Card>
      <AppText variant="caption" color="textMuted" align="center" style={{ marginTop: space.lg, paddingHorizontal: space.xl }}>
        Ball-by-ball details for this match aren’t available right now.
      </AppText>
    </Body>
  );
}

function LiveTab({ match }: { match: Match }) {
  const { colors } = useTheme();
  const card = useQuery(`card:${match.id}`, () => repo.scorecard(match.id, isFinished(match)), { live: inPlay(match) });
  const comm = useQuery(`comm:${match.id}`, () => repo.commentary(match.id, isFinished(match)), { live: inPlay(match) });
  // Win probability belongs to live play only.
  const isLive = match.status === 'live' || match.status === 'break';
  const pred = useQuery(`pred:${match.id}:${isLive}`, () => (isLive ? repo.prediction(match.id) : Promise.resolve(undefined)), { live: true });
  const current = card.data?.find(i => i.teamId === match.battingTeamId) ?? card.data?.[card.data.length - 1];

  if (match.status === 'upcoming') return <PreviewTab match={match} />;
  if (!current) return card.data ? <SummaryFallback match={match} /> : <SkeletonList count={3} />;

  const atCrease = current.batting.filter(b => !b.dismissal).slice(-2);
  // The over in progress: the newest balls sharing the latest ball's innings and over (balls are newest first).
  const balls = comm.data?.balls ?? [];
  const latest = balls[0];
  const overOf = (b: { over: string }) => b.over.split('.')[0];
  const overBalls: typeof balls = [];
  for (const b of balls) {
    if (!latest || b.inning !== latest.inning || overOf(b) !== overOf(latest)) break;
    overBalls.push(b);
  }
  const thisOver = overBalls.map(b => b.outcome).reverse();
  // The scorecard doesn't flag the current bowler; the latest ball names him.
  const bowler = current.bowling.filter(b => b.current || (latest && player(b.playerId)?.name === latest.bowler)).slice(0, 1);

  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      {match.live ? (
        <View style={styles.statGrid}>
          {match.live.projected ? <StatBox label="PROJECTED" value={`${match.live.projected}`} sub="at current rate" /> : null}
          {match.target ? <StatBox label="TARGET" value={`${match.target}`} sub={match.live.rrr ? `RRR ${match.live.rrr.toFixed(2)}` : undefined} /> : null}
        </View>
      ) : null}

      {match.status === 'live' && thisOver.length ? (
        <View style={[styles.overCard, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <AppText variant="micro" color="textMuted" style={{ marginBottom: 10 }}>
            THIS OVER
          </AppText>
          <BallStrip balls={thisOver} size={30} />
        </View>
      ) : null}

      {atCrease.length ? (
        <Card padded={false} style={{ marginHorizontal: space.lg, marginTop: space.md }}>
          <BattingTable lines={atCrease} showDismissal={false} />
          {bowler.length ? (
            <>
              <Hairline />
              <BowlingTable lines={bowler} />
            </>
          ) : null}
        </Card>
      ) : null}

      {match.live?.lastWicket ? (
        <View style={[styles.lastWkt, { backgroundColor: colors.dangerSoft }]}>
          <AppText variant="micro" color="danger">
            LAST WICKET
          </AppText>
          <AppText variant="label" weight="600" style={{ marginTop: 4 }}>
            {match.live.lastWicket}
          </AppText>
        </View>
      ) : null}

      {isLive && pred.data ? (
        <View style={{ marginTop: space.xl }}>
          <ProbabilityCard match={match} prediction={pred.data} />
        </View>
      ) : null}

      {comm.data?.balls.length ? (
        <>
          <SectionHeader title="Latest" style={{ marginTop: space.xxl }} />
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {comm.data.balls.slice(0, 5).map((b, i) => (
              <View key={b.id}>
                {i > 0 ? <Hairline inset={64} /> : null}
                <BallItem ball={b} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {match.result ? <ResultBanner match={match} /> : null}
    </Body>
  );
}

function ResultBanner({ match }: { match: Match }) {
  const { colors } = useTheme();
  const pom = match.playerOfMatch ? player(match.playerOfMatch) : undefined;
  return (
    <Card style={{ marginHorizontal: space.lg, marginTop: space.xl, overflow: 'hidden' }}>
      {match.result?.winnerId ? <Glow color={team(match.result.winnerId).color} size={260} opacity={0.22} style={{ right: -120, top: -130 }} /> : null}
      <AppText variant="overline" color="textMuted">
        RESULT
      </AppText>
      <AppText variant="section" style={{ marginTop: 6 }}>
        {match.result?.text}
      </AppText>
      {pom ? (
        <View style={[styles.rowC, { marginTop: 14 }]}>
          <Avatar playerId={pom.id} size={36} />
          <View style={{ marginLeft: 10 }}>
            <AppText variant="micro" color={colors.psl}>
              PLAYER OF THE MATCH
            </AppText>
            <AppText variant="label" weight="700">
              {pom.name}
            </AppText>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function BallItem({ ball }: { ball: Ball }) {
  const { colors } = useTheme();
  const highlight = ball.outcome.kind === 'wicket' ? colors.dangerSoft : ball.outcome.kind === 'six' ? colors.sixSoft : ball.outcome.kind === 'four' ? colors.fourSoft : undefined;
  return (
    <View style={[styles.ballItem, highlight && { backgroundColor: highlight }]}>
      <View style={{ width: 48, alignItems: 'center' }}>
        <AppText variant="caption" weight="700" color="textSecondary" tabular>
          {ball.over}
        </AppText>
        <View style={{ marginTop: 6 }}>
          <BallChip outcome={ball.outcome} size={28} />
        </View>
      </View>
      <View style={{ flex: 1, marginLeft: space.sm }}>
        <AppText variant="caption" weight="600" color="textMuted">
          {ball.bowler} to {ball.batter}
        </AppText>
        <AppText variant="bodySm" style={{ marginTop: 3 }}>
          {ball.text}
        </AppText>
      </View>
    </View>
  );
}

function ScorecardTab({ match }: { match: Match }) {
  const { colors } = useTheme();
  const { data } = useQuery(`card:${match.id}`, () => repo.scorecard(match.id, isFinished(match)), { live: inPlay(match) });
  const [sel, setSel] = useState<number | null>(null);
  if (!data) return <SkeletonList count={3} />;
  if (!data.length) {
    return match.status === 'upcoming' ? (
      <EmptyState icon="table2" title="Scorecard appears at the toss" />
    ) : (
      <EmptyState icon="table2" title="Full scorecard unavailable" body="Batting and bowling figures for this match couldn’t be loaded. The summary has the final scores." />
    );
  }
  const idx = sel ?? data.length - 1;
  const inn: Innings = data[idx];
  const total = match.innings[idx];
  const ex = inn.extras;
  const extras = ex.byes + ex.legByes + ex.wides + ex.noBalls;
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Segmented
          value={String(idx)}
          onChange={v => setSel(Number(v))}
          options={data.map((d, i) => ({ key: String(i), label: `${team(d.teamId).short}${data.filter(x => x.teamId === d.teamId).length > 1 ? ` ${data.slice(0, i + 1).filter(x => x.teamId === d.teamId).length}` : ''}` }))}
        />
      </View>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <View style={[styles.innHead, { borderBottomColor: colors.hairline }]}>
          <TeamBadge id={inn.teamId} size={28} />
          <AppText variant="headline" weight="700" style={{ flex: 1, marginLeft: 10 }}>
            {team(inn.teamId).name}
          </AppText>
          <AppText variant="score" tabular>
            {score(total)}{' '}
            <AppText variant="caption" color="textMuted" tabular>
              ({overs(total?.balls ?? 0)})
            </AppText>
          </AppText>
        </View>
        <BattingTable lines={inn.batting} />
        <Hairline />
        <View style={styles.kv}>
          <AppText variant="label" weight="600" style={{ flex: 1 }}>
            Extras
          </AppText>
          <AppText variant="label" weight="700" tabular>
            {extras}
          </AppText>
          <AppText variant="caption" color="textMuted" tabular style={{ marginLeft: 8 }}>
            (b {ex.byes}, lb {ex.legByes}, w {ex.wides}, nb {ex.noBalls})
          </AppText>
        </View>
        {inn.yetToBat.length ? (
          <>
            <Hairline />
            <View style={{ paddingHorizontal: space.lg, paddingVertical: 12 }}>
              <AppText variant="micro" color="textMuted">
                YET TO BAT
              </AppText>
              <AppText variant="label" color="textSecondary" style={{ marginTop: 4 }}>
                {inn.yetToBat.map(playerName).join(', ')}
              </AppText>
            </View>
          </>
        ) : null}
      </Card>

      {inn.fow.length ? (
        <>
          <SectionHeader title="Fall of wickets" style={{ marginTop: space.xl }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg }}>
            {inn.fow.map(f => (
              <View key={f.wicket} style={[styles.fow, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
                <AppText variant="label" weight="700" tabular>
                  {f.score}-{f.wicket}
                </AppText>
                <AppText variant="caption" color="textMuted" numberOfLines={1}>
                  {player(f.playerId)?.short} · {overs(f.balls)}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Bowling" style={{ marginTop: space.xl }} />
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <BowlingTable lines={inn.bowling} />
      </Card>
    </Body>
  );
}

type CommFilter = 'all' | 'wickets' | 'boundaries';

function CommentaryTab({ match }: { match: Match }) {
  const { data } = useQuery(`comm:${match.id}`, () => repo.commentary(match.id, isFinished(match)), { live: inPlay(match) });
  const [filter, setFilter] = useState<CommFilter>('all');
  const balls = useMemo(
    () =>
      (data?.balls ?? []).filter(b =>
        filter === 'all' ? true : filter === 'wickets' ? b.outcome.kind === 'wicket' : b.outcome.kind === 'four' || b.outcome.kind === 'six',
      ),
    [data, filter],
  );
  if (!data) return <SkeletonList count={5} height={72} />;
  if (!data.balls.length) {
    return match.status === 'upcoming' ? (
      <EmptyState icon="messageCircle" title="No commentary yet" body="Ball-by-ball commentary starts with the first delivery." />
    ) : (
      <EmptyState icon="messageCircle" title="Commentary unavailable" body="Ball-by-ball commentary for this match couldn’t be loaded right now." />
    );
  }
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.md }}>
      <ChipRow
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'All' },
          { key: 'wickets', label: 'Wickets' },
          { key: 'boundaries', label: '4s & 6s' },
        ]}
      />
      <View style={{ marginTop: space.md }}>
        {balls.map((b, i) => (
          <View key={b.id}>
            {i > 0 ? <Hairline inset={64} /> : null}
            <BallItem ball={b} />
          </View>
        ))}
      </View>
      {filter === 'all' && data.overs.length ? (
        <>
          <SectionHeader title="Over by over" style={{ marginTop: space.xl }} />
          <Card padded={false} style={{ marginHorizontal: space.lg }}>
            {data.overs.map((o, i) => (
              <View key={o.over}>
                {i > 0 ? <Hairline /> : null}
                <View style={styles.overRow}>
                  <View style={{ width: 64 }}>
                    <AppText variant="label" weight="700">
                      Over {o.over}
                    </AppText>
                    <AppText variant="caption" color="textMuted" tabular>
                      {o.score}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <BallStrip balls={o.balls} size={24} />
                  </View>
                  <AppText variant="label" weight="700" tabular>
                    {o.runs}
                  </AppText>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Body>
  );
}

function SquadsTab({ match }: { match: Match }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const [side, setSide] = useState(match.teamA);
  const { data, error, refresh } = useQuery(`squad:${side}`, () => repo.squad(side));
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <View style={{ paddingHorizontal: space.lg, marginBottom: space.md }}>
        <Segmented value={side} onChange={setSide} options={[match.teamA, match.teamB].map(id => ({ key: id, label: team(id).name }))} />
      </View>
      {!data && error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : !data ? (
        <SkeletonList count={4} height={56} />
      ) : !data.length ? (
        <EmptyState icon="users" title="Squad not announced" body={`${team(side).name}'s squad appears here once it is named.`} />
      ) : (
        <Card padded={false} style={{ marginHorizontal: space.lg }}>
          {data.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Hairline inset={68} /> : null}
              <Touch onPress={() => nav.navigate('Player', { id: p.id })} style={styles.playerRow}>
                <Avatar playerId={p.id} size={40} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="label" weight="600">
                    {p.name}
                    {p.role === 'Wicketkeeper' ? <AppText variant="caption" color="textMuted"> (wk)</AppText> : null}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {[p.role, p.batting].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Touch>
            </View>
          ))}
        </Card>
      )}
    </Body>
  );
}

function StatsTab({ match }: { match: Match }) {
  const { colors } = useTheme();
  const { data } = useQuery(`card:${match.id}`, () => repo.scorecard(match.id, isFinished(match)), { live: inPlay(match) });
  if (!data) return <SkeletonList count={2} height={180} />;
  if (!data.length) return <EmptyState icon="chartColumn" title="Stats appear once play begins" />;
  const [a, b] = data;
  const boundaries = (inn: Innings) => inn.batting.reduce((n, l) => ({ f: n.f + l.fours, s: n.s + l.sixes }), { f: 0, s: 0 });
  const dots = (inn: Innings) => Math.round(inn.batting.reduce((n, l) => n + l.balls, 0) * 0.34);
  const rows = b
    ? [
        ['Fours', boundaries(a).f, boundaries(b).f],
        ['Sixes', boundaries(a).s, boundaries(b).s],
        ['Extras', Object.values(a.extras).reduce((x, y) => x + y, 0), Object.values(b.extras).reduce((x, y) => x + y, 0)],
        ['Dot balls (est.)', dots(a), dots(b)],
        ['Powerplay', a.overRuns.slice(0, 6).reduce((x, y) => x + y, 0), b.overRuns.slice(0, 6).reduce((x, y) => x + y, 0)],
      ]
    : [];
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <Card style={{ marginHorizontal: space.lg }}>
        <AppText variant="label" weight="700">
          Runs per over
        </AppText>
        <View style={[styles.rowC, { marginTop: 6, marginBottom: 14, gap: 14 }]}>
          {[a, b].filter(Boolean).map(inn => (
            <View key={inn.teamId} style={styles.rowC}>
              <View style={[styles.legend, { backgroundColor: team(inn.teamId).color }]} />
              <AppText variant="caption" color="textSecondary">
                {team(inn.teamId).short}
              </AppText>
            </View>
          ))}
          <View style={styles.rowC}>
            <View style={[styles.legend, { backgroundColor: colors.live, borderRadius: 3 }]} />
            <AppText variant="caption" color="textSecondary">
              Wicket
            </AppText>
          </View>
        </View>
        <Manhattan runs={a.overRuns} wickets={a.overWickets} color={team(a.teamId).color} compare={b?.overRuns} compareColor={b ? team(b.teamId).color : undefined} />
      </Card>
      {rows.length ? (
        <Card style={{ marginHorizontal: space.lg, marginTop: space.md }}>
          <View style={[styles.rowC, { marginBottom: 6 }]}>
            <AppText variant="label" weight="700" color={team(a.teamId).color} style={{ flex: 1 }}>
              {team(a.teamId).short}
            </AppText>
            <AppText variant="label" weight="700" color={team(b.teamId).color}>
              {team(b.teamId).short}
            </AppText>
          </View>
          {rows.map(([label, x, y]) => {
            const total = Number(x) + Number(y) || 1;
            return (
              <View key={String(label)} style={{ marginTop: 14 }}>
                <View style={styles.rowC}>
                  <AppText variant="label" weight="700" tabular style={{ width: 40 }}>
                    {x}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" align="center" style={{ flex: 1 }}>
                    {label}
                  </AppText>
                  <AppText variant="label" weight="700" tabular align="right" style={{ width: 40 }}>
                    {y}
                  </AppText>
                </View>
                <View style={[styles.compareBar, { backgroundColor: colors.elevated }]}>
                  <View style={{ flex: Number(x) / total, backgroundColor: team(a.teamId).color, borderRadius: 2 }} />
                  <View style={{ width: 3 }} />
                  <View style={{ flex: Number(y) / total, backgroundColor: team(b.teamId).color, borderRadius: 2 }} />
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Body>
  );
}

function TableTab({ match }: { match: Match }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data } = useQuery(`table:${match.seriesId}`, () => repo.standings(match.seriesId));
  if (!data) return <SkeletonList count={4} height={52} />;
  if (!data.length) return <EmptyState icon="table2" title="No table for this series" body="Bilateral series without a points table show results under the series page." />;
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        <PointsTable rows={data} compact />
      </Card>
      <Touch onPress={() => nav.navigate('Series', { id: match.seriesId })} style={styles.linkRow}>
        <AppText variant="label" weight="600" color="accent">
          Full series hub
        </AppText>
        <Icon name="chevronRight" size={16} color={colors.accent} />
      </Touch>
    </Body>
  );
}

function CommentsTab({ match }: { match: Match }) {
  // The conversation sits right here; the keyboard lifts the composer instead of covering it.
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Body bottomInset keyboardShouldPersistTaps="handled" contentStyle={{ paddingTop: space.lg }}>
        <CommentsThread thread={`match:${match.id}`} title="Match chat" />
      </Body>
    </KeyboardAvoidingView>
  );
}

function NewsTab({ match }: { match: Match }) {
  const { data } = useQuery(`news:match:${match.id}`, () => repo.newsFor({ matchId: match.id, seriesId: match.seriesId }));
  if (!data) return <SkeletonList count={3} height={90} />;
  if (!data.length) return <EmptyState icon="newspaper" title="No stories yet" />;
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.sm }}>
      {data.map((a, i) => (
        <View key={a.id}>
          {i > 0 ? <Hairline inset={space.lg} /> : null}
          <NewsRow article={a} />
        </View>
      ))}
    </Body>
  );
}

function InfoTab({ match }: { match: Match }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const v = venue(match.venueId);
  const s = seriesOf(match.seriesId);
  const rows: [string, string][] = [
    ['Series', s?.name ?? ''],
    ['Match', `${match.title} · ${match.format}`],
    ['Date', `${shortDate(match.startTime)} · ${time(match.startTime)}`],
    ['Venue', venueLabel(match.venueId)],
    ...(match.toss ? ([['Toss', match.toss]] as [string, string][]) : []),
    ...(match.umpires ? ([['Umpires', match.umpires.join(', ')]] as [string, string][]) : []),
    ...(match.referee ? ([['Referee', match.referee]] as [string, string][]) : []),
  ].filter(([, val]) => val) as [string, string][];
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <Card padded={false} style={{ marginHorizontal: space.lg }}>
        {rows.map(([k, val], i) => (
          <View key={k}>
            {i > 0 ? <Hairline inset={space.lg} /> : null}
            <View style={styles.infoRow}>
              <AppText variant="label" color="textMuted" style={{ width: 92 }}>
                {k}
              </AppText>
              <AppText variant="label" weight="600" style={{ flex: 1 }}>
                {val}
              </AppText>
            </View>
          </View>
        ))}
      </Card>
      {v && v.avgFirstInnings > 0 ? (
        <>
          <SectionHeader title="Venue guide" style={{ marginTop: space.xl }} />
          <View style={styles.statGrid}>
            <StatBox label="AVG 1ST INNS" value={String(v.avgFirstInnings)} sub={match.format} />
            <StatBox label="PACE WICKETS" value={`${Math.round(v.paceShare * 100)}%`} sub="of all wickets" />
          </View>
        </>
      ) : null}
      <Touch onPress={() => nav.navigate('Series', { id: match.seriesId })} style={styles.linkRow}>
        <AppText variant="label" weight="600" color="accent">
          Go to {s?.short}
        </AppText>
        <Icon name="chevronRight" size={16} color={colors.accent} />
      </Touch>
    </Body>
  );
}

function PreviewTab({ match }: { match: Match }) {
  const v = venue(match.venueId);
  return (
    <Body bottomInset contentStyle={{ paddingTop: space.lg }}>
      <View style={styles.statGrid}>
        <StatBox label="STARTS" value={time(match.startTime)} sub={dayLabel(match.startTime)} />
        {v ? <StatBox label="VENUE" value={v.city || v.name} sub={v.city ? v.name : undefined} /> : null}
      </View>
    </Body>
  );
}

const TABS = [
  { key: 'live', label: 'Live' },
  { key: 'scorecard', label: 'Scorecard' },
  { key: 'commentary', label: 'Commentary' },
  { key: 'comments', label: 'Comments' },
  { key: 'squads', label: 'Squads' },
  { key: 'stats', label: 'Stats' },
  { key: 'table', label: 'Table' },
  { key: 'news', label: 'News' },
  { key: 'info', label: 'Info' },
];

export default function MatchCentreScreen() {
  const { id, tab } = useParams('Match');
  const { data: match } = useQuery(`match:${id}`, () => repo.match(id), { live: true });
  // Join this match's room so its updates arrive even between list broadcasts.
  useEffect(() => watchMatch(id), [id]);

  const tabs = useMemo(
    () =>
      // Match chat is for matches in play only.
      TABS.filter(t => t.key !== 'comments' || match?.status === 'live' || match?.status === 'break').map(t => (t.key === 'live' ? { ...t, label: match?.status === 'upcoming' ? 'Preview' : match?.status === 'completed' ? 'Summary' : 'Live' } : t)),
    [match?.status],
  );

  if (!match) {
    return (
      <Screen>
        <Header title="Match" />
        <SkeletonList count={4} height={120} />
      </Screen>
    );
  }
  const s = seriesOf(match.seriesId);
  return (
    <Screen>
      <Header
        title={`${team(match.teamA).short} vs ${team(match.teamB).short}`}
        subtitle={[match.title, s?.short].filter(Boolean).join(' · ')}
        right={
          <>
            <FavouriteButton kind="match" id={match.id} label={`${team(match.teamA).name} vs ${team(match.teamB).name}`} />
            <IconButton
              icon="share2"
              label="Share"
              onPress={() => Share.share({ message: `${team(match.teamA).name} vs ${team(match.teamB).name} — ${match.statusText}\nhttps://pakcriczone.com/live-cricket-score/${match.slug}` })}
            />
          </>
        }
      />
      <TabPager
        tabs={tabs}
        initialKey={tab}
        header={<ScoreHeader match={match} />}
        renderPage={key => {
          switch (key) {
            case 'live':
              return <LiveTab match={match} />;
            case 'scorecard':
              return <ScorecardTab match={match} />;
            case 'commentary':
              return <CommentaryTab match={match} />;
            case 'comments':
              return <CommentsTab match={match} />;
            case 'squads':
              return <SquadsTab match={match} />;
            case 'stats':
              return <StatsTab match={match} />;
            case 'table':
              return <TableTab match={match} />;
            case 'news':
              return <NewsTab match={match} />;
            default:
              return <InfoTab match={match} />;
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, minHeight: 52, paddingVertical: space.sm },
  rowC: { flexDirection: 'row', alignItems: 'center' },
  scoreHeader: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs },
  teamsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  teamCol: { flex: 1, borderRadius: radius.sm },
  batDot: { width: 6, height: 6, borderRadius: 3 },
  statusWrap: {
    marginTop: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
  },
  statGrid: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  statBox: { flex: 1, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.md },
  overCard: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg },
  lastWkt: { marginHorizontal: space.lg, marginTop: space.md, borderRadius: radius.md, padding: space.md },
  ballItem: { flexDirection: 'row', paddingVertical: 14, paddingRight: space.lg, paddingLeft: space.sm },
  innHead: { flexDirection: 'row', alignItems: 'center', padding: space.lg, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  kv: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 14 },
  fow: { borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 12, paddingVertical: 8, minWidth: 96 },
  overRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12, gap: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 12 },
  legend: { width: 10, height: 10, borderRadius: 2, marginRight: 6 },
  compareBar: { flexDirection: 'row', height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: space.md },
  infoRow: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: 14 },
});
