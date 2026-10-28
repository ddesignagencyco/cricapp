import React from 'react';
import { StyleSheet, View } from 'react-native';
import { TeamBadge } from '../../components/cricket/Badges';
import { LineChart, WinProbBar, sideColors } from '../../components/cricket/Charts';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Glow, LiveIndicator, SectionHeader, Tag } from '../../components/ui/Primitives';
import { seriesOf, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago } from '../../utils/format';

/** Projected score range drawn on a short axis. */
function RangeBar({ low, mid, high, color }: { low: number; mid: number; high: number; color: string }) {
  const { colors } = useTheme();
  const min = Math.floor((low - 25) / 10) * 10;
  const max = Math.ceil((high + 25) / 10) * 10;
  const at = (v: number) => `${((v - min) / (max - min)) * 100}%` as const;
  return (
    <View style={{ marginTop: 18 }}>
      <View style={[styles.rangeTrack, { backgroundColor: colors.elevated }]}>
        <View style={[styles.rangeFill, { left: at(low), width: `${((high - low) / (max - min)) * 100}%`, backgroundColor: color, opacity: 0.35 }]} />
        <View style={[styles.rangeMid, { left: at(mid), backgroundColor: color, borderColor: colors.surface }]} />
      </View>
      <View style={styles.between}>
        <AppText variant="micro" color="textMuted" tabular>
          {min}
        </AppText>
        <AppText variant="micro" color="textMuted" tabular>
          {max}
        </AppText>
      </View>
    </View>
  );
}

export default function PredictionScreen() {
  const { id } = useParams('Prediction');
  const { colors } = useTheme();
  const match = useQuery(`match:${id}`, () => repo.match(id), { live: true });
  const pred = useQuery(`pred:${id}`, () => repo.prediction(id), { live: true });
  const m = match.data;
  const p = pred.data;

  if (!m || !p) {
    return (
      <Screen>
        <Header title="Prediction" />
        <SkeletonList count={3} height={160} />
      </Screen>
    );
  }
  const a = team(m.teamA);
  const b = team(m.teamB);
  const fav = p.winA >= 0.5 ? a : b;
  const favP = Math.max(p.winA, 1 - p.winA);
  const maxOver = m.format === 'T20' ? 20 : 50;

  return (
    <Screen>
      <Header title="Match prediction" subtitle={`${a.short} vs ${b.short} · ${m.title}`} />
      <Body>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <Glow color={fav.color} size={320} opacity={0.24} style={{ alignSelf: 'center', top: -170 }} />
          <View style={styles.between}>
            <AppText variant="caption" color="textMuted">
              {seriesOf(m.seriesId)?.short}
            </AppText>
            {m.status === 'live' ? <LiveIndicator label="LIVE" /> : <Tag label={`${p.confidence.toUpperCase()} CONFIDENCE`} tone="brand" />}
          </View>
          <View style={[styles.rowC, { marginTop: 20 }]}>
            <TeamBadge id={a.id} size={48} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <AppText variant="scoreXl" tabular>
                {Math.round(favP * 100)}
                <AppText variant="title" color="textMuted">
                  %
                </AppText>
              </AppText>
              <AppText variant="label" color="textSecondary">
                {fav.name} to win
              </AppText>
            </View>
            <TeamBadge id={b.id} size={48} />
          </View>
          <View style={{ marginTop: 20 }}>
            <WinProbBar teamA={a.id} teamB={b.id} p={p.winA} />
          </View>
          <AppText variant="caption" color="textMuted" style={{ marginTop: 14 }}>
            Updated {ago(p.generatedAt)}
          </AppText>
        </View>

        {p.narrative ? (
          <>
            <SectionHeader title="Summary" style={{ marginTop: space.xxl }} />
            <Card style={{ marginHorizontal: space.lg }}>
              <AppText variant="body" style={{ lineHeight: 24 }}>
                {p.narrative}
              </AppText>
            </Card>
          </>
        ) : null}

        {p.history && new Set(p.history.map(h => h.over)).size > 2 ? (
          <>
            <SectionHeader title="How it has moved" style={{ marginTop: space.xxl }} />
            <Card style={{ marginHorizontal: space.lg }}>
              <View style={[styles.rowC, { gap: 14, marginBottom: 14 }]}>
                <View style={styles.rowC}>
                  <View style={[styles.legend, { backgroundColor: colors.live }]} />
                  <AppText variant="caption" color="textSecondary">
                    Wicket
                  </AppText>
                </View>
                <View style={styles.rowC}>
                  <View style={[styles.legend, { backgroundColor: colors.six }]} />
                  <AppText variant="caption" color="textSecondary">
                    Six
                  </AppText>
                </View>
                <AppText variant="caption" color="textMuted" style={{ flex: 1, textAlign: 'right' }}>
                  {a.short} win %
                </AppText>
              </View>
              <LineChart
                points={p.history.map(h => ({ x: h.over, y: h.p, event: h.event }))}
                xMax={maxOver}
                height={170}
                color={sideColors(a.color, b.color)[0]}
                colorBelow={sideColors(a.color, b.color)[1]}
                xLabels={maxOver === 20 ? ['0', '5', '10', '15', '20'] : ['0', '10', '20', '30', '40', '50']}
              />
            </Card>
          </>
        ) : null}

        <SectionHeader title="First-innings projection" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          <View style={styles.between}>
            <AppText variant="label" weight="700" color="textSecondary">
              Side batting first
            </AppText>
            <AppText variant="title" tabular>
              {p.projected.low}–{p.projected.high}
            </AppText>
          </View>
          <RangeBar low={p.projected.low} mid={p.projected.mid} high={p.projected.high} color={colors.brand} />
          <AppText variant="caption" color="textMuted" style={{ marginTop: 10 }}>
            Likely range for the side batting first. Most likely: {p.projected.mid}.
          </AppText>
        </Card>

      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    overflow: 'hidden',
  },
  legend: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  rangeTrack: { height: 10, borderRadius: 5, marginBottom: 6 },
  rangeFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
  rangeMid: { position: 'absolute', top: -4, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 3 },
});
