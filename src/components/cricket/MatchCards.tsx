import React, { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '../../navigation/Stack';
import { seriesOf, team as teamOf, venueLabel } from '../../data/refs';
import { useLiveMatch } from '../../data/socket';
import type { Match, Prediction } from '../../data/types';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago, countdown, dayLabel, inningsFor, overs, score, time } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Gradient } from '../ui/Gradient';
import { Glow, LiveIndicator, Tag } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { TeamBadge } from './Badges';

/** Text colours for a card: theme colours, or white on a vivid gradient. */
interface Ink {
  text: string;
  secondary: string;
  muted: string;
}

/** "186/6 (20)" or "412 & 287/6" for multi-innings. */
function TeamScore({ match, teamId, big, ink }: { match: Match; teamId: string; big?: boolean; ink?: Ink }) {
  const inns = inningsFor(match, teamId);
  const batting = match.status === 'live' && match.battingTeamId === teamId;
  const lost = match.status === 'completed' && match.result?.winnerId && match.result.winnerId !== teamId;
  if (!inns.length) {
    return (
      <AppText variant={big ? 'score' : 'label'} color={ink?.muted ?? 'textMuted'}>
        {match.status === 'live' || match.status === 'break' ? 'Yet to bat' : ''}
      </AppText>
    );
  }
  const last = inns[inns.length - 1];
  const test = match.format === 'Test';
  return (
    <View style={styles.scoreRow}>
      {test && inns.length > 1 ? (
        <AppText variant={big ? 'label' : 'caption'} color={ink?.muted ?? 'textMuted'} tabular style={{ marginRight: 6 }}>
          {score(inns[0])} &
        </AppText>
      ) : null}
      <AppText variant={big ? 'score' : 'headline'} weight="700" tabular color={lost ? ink?.secondary ?? 'textSecondary' : ink?.text ?? 'text'}>
        {score(last)}
      </AppText>
      {!test || batting ? (
        <AppText variant="caption" color={ink?.muted ?? 'textMuted'} tabular style={{ marginLeft: 6, minWidth: 34 }}>
          {last.balls ? overs(last.balls) : ''}
        </AppText>
      ) : null}
    </View>
  );
}

function TeamLine({ match, teamId, big, ink }: { match: Match; teamId: string; big?: boolean; ink?: Ink }) {
  const t = teamOf(teamId);
  const batting = match.status === 'live' && match.battingTeamId === teamId;
  const lost = match.status === 'completed' && match.result?.winnerId && match.result.winnerId !== teamId;
  return (
    <View style={styles.teamLine}>
      <TeamBadge id={teamId} size={big ? 34 : 26} solid={!!ink} />
      <AppText
        variant={big ? 'headline' : 'label'}
        weight={batting || big ? '700' : '600'}
        color={lost ? ink?.secondary ?? 'textSecondary' : ink?.text ?? 'text'}
        numberOfLines={1}
        style={{ flex: 1, marginLeft: big ? 12 : 10 }}
      >
        {t.name}
      </AppText>
      {batting ? <View style={[styles.batDot, { backgroundColor: ink ? '#FFFFFF' : t.color }]} /> : null}
      <TeamScore match={match} teamId={teamId} big={big} ink={ink} />
    </View>
  );
}

// Solid tints rather than translucent white, so small text stays crisp on the gradient.
const WHITE_INK: Ink = { text: '#FFFFFF', secondary: '#D5D9E1', muted: '#A9AFBC' };

/** Which team is listed first: batting first when known. */
const order = (m: Match) => {
  if (m.innings.length) {
    const first = m.innings[0].teamId;
    return [first, first === m.teamA ? m.teamB : m.teamA];
  }
  return [m.teamA, m.teamB];
};

/**
 * Featured card for carousels. Live matches get a vivid team-colour
 * gradient with white text (same in light and dark); others stay on the
 * theme surface with soft colour blooms.
 */
/** `inline`: the same scoreboard as the top of the match centre (no navigation, venue instead of series). */
function MatchHeroCardBase({ match: fetched, prediction, width, inline }: { match: Match; prediction?: Prediction; width?: number; inline?: boolean }) {
  const match = useLiveMatch(fetched);
  const { colors } = useTheme();
  const nav = useNavigation();
  const { width: screen } = useWindowDimensions();
  const s = seriesOf(match.seriesId);
  const [first, second] = order(match);
  const a = teamOf(first);
  const b = teamOf(second);
  const w = width ?? screen - space.lg * 2;
  const vivid = match.status === 'live';
  const ink = vivid ? WHITE_INK : undefined;
  const line = vivid ? 'rgba(255,255,255,0.16)' : colors.hairline;
  return (
    <Touch
      scale={!inline}
      disabled={inline}
      onPress={() => nav.navigate('Match', { id: match.id })}
      accessibilityLabel={`${a.name} versus ${b.name}, ${match.statusText}`}
      style={[
        styles.hero,
        { width: w, backgroundColor: colors.surface, borderColor: vivid ? 'rgba(255,255,255,0.12)' : colors.hairline },
      ]}
    >
      {vivid ? (
        // Deep graphite so live red, white text and team colours all keep their contrast.
        <>
          <Gradient from="#2C313C" to="#1A1D24" base="#121419" />
          <Glow color={a.color} size={260} opacity={0.32} style={{ left: -120, top: -130 }} />
          <Glow color={b.color} size={260} opacity={0.26} style={{ right: -130, bottom: -150 }} />
        </>
      ) : (
        <>
          <Glow color={a.color} size={240} opacity={colors.scheme === 'dark' ? 0.22 : 0.14} style={{ left: -110, top: -120 }} />
          <Glow color={b.color} size={240} opacity={colors.scheme === 'dark' ? 0.18 : 0.12} style={{ right: -120, bottom: -140 }} />
        </>
      )}
      <View style={styles.heroTop}>
        <AppText variant="caption" color={ink?.secondary ?? 'textSecondary'} numberOfLines={1} style={{ flex: 1 }}>
          {(inline ? headerParts(match) : [s?.short ?? match.title]).filter(Boolean).join(' · ')}
        </AppText>
        {match.status === 'live' ? (
          <LiveIndicator />
        ) : match.status === 'upcoming' ? (
          <Tag label={countdown(match.startTime).toUpperCase()} tone="brand" />
        ) : (
          <Tag label="RESULT" />
        )}
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        <TeamLine match={match} teamId={first} big ink={ink} />
        <TeamLine match={match} teamId={second} big ink={ink} />
      </View>
      <AppText variant="label" weight="600" color={vivid ? LIVE_STATUS : match.status === 'upcoming' ? 'accent' : resultColor(match, colors)} style={{ marginTop: 10 }} numberOfLines={1}>
        {match.status === 'upcoming' ? `${[dayLabel(match.startTime), time(match.startTime), venueLabel(match.venueId)].filter(Boolean).join(' · ')}` : match.statusText}
      </AppText>
      {vivid && stale(match.updatedAt) ? (
        <AppText variant="caption" color={ink?.muted ?? 'textMuted'} style={{ marginTop: 2 }} numberOfLines={1}>
          Last update {ago(match.updatedAt!)}
        </AppText>
      ) : null}
      {match.live ? (
        <View style={[styles.heroFoot, { borderTopColor: line }]}>
          <Stat label="CRR" value={match.live.crr.toFixed(2)} ink={ink} />
          {match.live.rrr ? <Stat label="RRR" value={match.live.rrr.toFixed(2)} ink={ink} /> : null}
          {match.target ? <Stat label="TARGET" value={String(match.target)} ink={ink} /> : null}
          {match.live.partnership ? <Stat label="P'SHIP" value={`${match.live.partnership.runs} (${match.live.partnership.balls})`} ink={ink} /> : null}
          {prediction ? (
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <AppText variant="micro" color={ink?.muted ?? 'textMuted'}>
                {teamOf(match.teamA).short} WIN
              </AppText>
              <AppText variant="label" weight="700" tabular color={vivid ? '#FFFFFF' : 'text'}>
                {Math.round(prediction.winA * 100)}%
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Touch>
  );
}

function Stat({ label, value, ink }: { label: string; value: string; ink?: Ink }) {
  return (
    <View>
      <AppText variant="micro" color={ink?.muted ?? 'textMuted'}>
        {label}
      </AppText>
      <AppText variant="label" weight="700" tabular color={ink?.text ?? 'text'} style={{ marginTop: 2 }}>
        {value}
      </AppText>
    </View>
  );
}

/** Compact list row for schedules and results. */
/** Match-centre header: format and venue, else the series, so the corner is never blank. */
const headerParts = (m: Match) => {
  const parts = [m.formatKnown === false ? undefined : m.format, venueLabel(m.venueId)].filter(Boolean);
  return parts.length ? parts : [seriesOf(m.seriesId)?.short ?? m.title];
};

/** A live match whose feed hasn't moved for 5 minutes. */
const stale = (at?: string) => !!at && Date.now() - +new Date(at) > 5 * 60_000;

/** Status line on the dark live card: warm amber reads clearly against graphite and white text. */
const LIVE_STATUS = '#FFC857';

/** Result line colour: green for a decided match, amber when called off, muted when there is nothing to report. */
export function resultColor(match: Match, colors: ReturnType<typeof useTheme>['colors']) {
  if (match.status === 'live') return colors.accent;
  if (/cancel|abandon|no result/i.test(match.statusText)) return colors.warning;
  if (match.result?.winnerId || /won by|win by|won the/i.test(match.statusText)) return colors.success;
  return colors.textSecondary;
}

/** `dated={false}` inside a single-day list: show the time only, not the day again. */
function MatchRowBase({ match: fetched, showSeries = true, dated = true }: { match: Match; showSeries?: boolean; dated?: boolean }) {
  const match = useLiveMatch(fetched);
  const { colors } = useTheme();
  const nav = useNavigation();
  const [first, second] = order(match);
  const s = seriesOf(match.seriesId);
  return (
    <Touch
      onPress={() => nav.navigate('Match', { id: match.id })}
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
      accessibilityLabel={`${teamOf(first).name} versus ${teamOf(second).name}. ${match.statusText}`}
    >
      <View style={styles.rowTop}>
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
          {showSeries && s?.short ? s.short : match.title}
        </AppText>
        {match.status === 'live' ? (
          <LiveIndicator />
        ) : match.status === 'upcoming' ? (
          <AppText variant="caption" weight="600" color="accent" tabular>
            {dated ? `${dayLabel(match.startTime)} · ${time(match.startTime)}` : time(match.startTime)}
          </AppText>
        ) : dated ? (
          <AppText variant="caption" weight="600" color="accent">
            {dayLabel(match.startTime)}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: 10, marginTop: 12 }}>
        <TeamLine match={match} teamId={first} />
        <TeamLine match={match} teamId={second} />
      </View>
      {/* The date is already in the row header: upcoming rows add only the venue. */}
      {(match.status === 'upcoming' ? venueLabel(match.venueId) : match.statusText) ? (
        <AppText variant="caption" weight={match.result ? '600' : '500'} color={resultColor(match, colors)} numberOfLines={1} style={{ marginTop: 12 }}>
          {match.status === 'upcoming' ? venueLabel(match.venueId) : match.statusText}
        </AppText>
      ) : null}
    </Touch>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', minHeight: 22 },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    marginTop: 12,
    paddingTop: 10,
    gap: space.lg,
  },
  teamLine: { flexDirection: 'row', alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  batDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  // Each match is its own card: separate rounded tiles with a gap between them.
  row: { paddingHorizontal: space.xl, paddingVertical: space.lg + 2, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, overflow: 'hidden' },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
});

/** Memoised: a live update re-renders only the card whose data changed. */
export const MatchHeroCard = memo(MatchHeroCardBase);

/** Memoised: a live update re-renders only the card whose data changed. */
export const MatchRow = memo(MatchRowBase);
