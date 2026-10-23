import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation } from '../../navigation/Stack';
import { seriesOf, team as teamOf, venue } from '../../data/refs';
import type { Match, Prediction } from '../../data/types';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { countdown, dayLabel, inningsFor, overs, score, time } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Gradient } from '../ui/Gradient';
import { Glow, LiveIndicator, Tag } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { TeamBadge } from './Badges';
import { WinProbBar } from './Charts';

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
        {match.status === 'upcoming' ? '' : 'Yet to bat'}
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
          {overs(last.balls)}
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
export function MatchHeroCard({ match, prediction, width }: { match: Match; prediction?: Prediction; width?: number }) {
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
      scale
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
          {s?.short} · {match.title}
        </AppText>
        {match.status === 'live' ? (
          <LiveIndicator />
        ) : match.status === 'upcoming' ? (
          <Tag label={countdown(match.startTime).toUpperCase()} tone="brand" />
        ) : (
          <Tag label="RESULT" />
        )}
      </View>
      <View style={{ gap: 12, marginTop: 14 }}>
        <TeamLine match={match} teamId={first} big ink={ink} />
        <TeamLine match={match} teamId={second} big ink={ink} />
      </View>
      <AppText variant="label" weight="600" color={vivid ? '#FFFFFF' : match.status === 'upcoming' ? 'accent' : 'textSecondary'} style={{ marginTop: 14 }} numberOfLines={1}>
        {match.status === 'upcoming' ? `${dayLabel(match.startTime)} · ${time(match.startTime)} · ${venue(match.venueId)?.city}` : match.statusText}
      </AppText>
      {prediction && match.status !== 'completed' ? (
        <View style={[styles.heroFoot, { borderTopColor: line }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="micro" color={ink?.muted ?? 'textMuted'} style={{ marginBottom: 6 }}>
              WIN PROBABILITY
            </AppText>
            <WinProbBar teamA={match.teamA} teamB={match.teamB} p={prediction.winA} height={5} showLabels={false} />
          </View>
          <View style={{ marginLeft: 16, alignItems: 'flex-end' }}>
            <AppText variant="headline" weight="700" tabular color={vivid ? '#FFFFFF' : teamOf(match.teamA).color}>
              {Math.round(prediction.winA * 100)}%
            </AppText>
            <AppText variant="micro" color={ink?.muted ?? 'textMuted'}>
              {teamOf(match.teamA).short}
            </AppText>
          </View>
        </View>
      ) : match.live ? (
        <View style={[styles.heroFoot, { borderTopColor: line }]}>
          <Stat label="CRR" value={match.live.crr.toFixed(2)} ink={ink} />
          {match.live.rrr ? <Stat label="RRR" value={match.live.rrr.toFixed(2)} ink={ink} /> : null}
          <Stat label="P'SHIP" value={`${match.live.partnership.runs} (${match.live.partnership.balls})`} ink={ink} />
        </View>
      ) : null}
    </Touch>
  );
}

function Stat({ label, value, ink }: { label: string; value: string; ink?: Ink }) {
  return (
    <View style={{ marginRight: 22 }}>
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
export function MatchRow({ match, showSeries = true }: { match: Match; showSeries?: boolean }) {
  const { colors } = useTheme();
  const nav = useNavigation();
  const [first, second] = order(match);
  const s = seriesOf(match.seriesId);
  return (
    <Touch
      onPress={() => nav.navigate('Match', { id: match.id })}
      style={[styles.row, { backgroundColor: colors.surface }]}
      accessibilityLabel={`${teamOf(first).name} versus ${teamOf(second).name}. ${match.statusText}`}
    >
      <View style={styles.rowTop}>
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
          {showSeries ? `${s?.short} · ` : ''}
          {match.title}
        </AppText>
        {match.status === 'live' ? (
          <LiveIndicator />
        ) : match.status === 'upcoming' ? (
          <AppText variant="caption" weight="600" color="accent" tabular>
            {dayLabel(match.startTime)} · {time(match.startTime)}
          </AppText>
        ) : (
          <AppText variant="caption" weight="600" color="accent">
            {dayLabel(match.startTime)}
          </AppText>
        )}
      </View>
      <View style={{ gap: 8, marginTop: 10 }}>
        <TeamLine match={match} teamId={first} />
        <TeamLine match={match} teamId={second} />
      </View>
      <AppText
        variant="caption"
        weight="500"
        color={match.status === 'live' ? 'accent' : 'textSecondary'}
        numberOfLines={1}
        style={{ marginTop: 10 }}
      >
        {match.status === 'upcoming' ? `${venue(match.venueId)?.name}, ${venue(match.venueId)?.city}` : match.statusText}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    paddingBottom: space.md,
    overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', minHeight: 22 },
  heroFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    marginTop: 14,
    paddingTop: 12,
  },
  teamLine: { flexDirection: 'row', alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  batDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  row: { paddingHorizontal: space.lg, paddingVertical: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
});
