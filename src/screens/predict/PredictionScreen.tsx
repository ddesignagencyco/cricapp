import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, TeamBadge } from '../../components/cricket/Badges';
import { LineChart, Meter, WinProbBar } from '../../components/cricket/Charts';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon, type IconName } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Glow, Hairline, LiveIndicator, ProgressBar, SectionHeader, Tag } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { player, seriesOf, team } from '../../data/refs';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useNavigation, useParams } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago, pct, shortDate, signed, time } from '../../utils/format';

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

function Weather({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <AppText variant="label" weight="700" tabular style={{ marginTop: 6 }}>
        {value}
      </AppText>
      <AppText variant="micro" color="textMuted">
        {label}
      </AppText>
    </View>
  );
}

export default function PredictionScreen() {
  const { id } = useParams('Prediction');
  const nav = useNavigation();
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
            {m.status === 'live' ? <LiveIndicator label="LIVE MODEL" /> : <Tag label={`${p.confidence.toUpperCase()} CONFIDENCE`} tone="brand" />}
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
          <AppText variant="micro" color="accent" style={{ marginTop: 14 }}>
            {p.modelVersion.toUpperCase()} · UPDATED {ago(p.generatedAt).toUpperCase()}
          </AppText>
        </View>

        {p.history && p.history.length > 1 ? (
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
                color={a.color}
                colorBelow={b.color}
                xLabels={maxOver === 20 ? ['0', '5', '10', '15', '20'] : ['0', '10', '20', '30', '40', '50']}
              />
            </Card>
          </>
        ) : null}

        {p.why.length ? (
          <>
            <SectionHeader
              title={m.status === 'live' ? 'Why the prediction changed' : 'What drives this call'}
              overline="MEASURED MATCH FACTORS"
              style={{ marginTop: space.xxl }}
            />
            <Card padded={false} style={{ marginHorizontal: space.lg }}>
              {p.why.map((f, i) => {
                const up = f.delta > 0;
                return (
                  <View key={f.label}>
                    {i > 0 ? <Hairline inset={space.lg} /> : null}
                    <View style={styles.factor}>
                      <View style={[styles.delta, { backgroundColor: up ? colors.successSoft : colors.dangerSoft }]}>
                        <Icon name={up ? 'trendingUp' : 'trendingDown'} size={16} color={up ? colors.success : colors.danger} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.between}>
                          <AppText variant="label" weight="700" style={{ flex: 1 }}>
                            {f.label}
                          </AppText>
                          <AppText variant="label" weight="700" tabular color={up ? 'success' : 'danger'}>
                            {signed(f.delta)} pts
                          </AppText>
                        </View>
                        <AppText variant="caption" color="textSecondary" style={{ marginTop: 3 }}>
                          {f.detail}
                        </AppText>
                      </View>
                    </View>
                  </View>
                );
              })}
            </Card>
            <AppText variant="micro" color="textMuted" style={{ paddingHorizontal: space.lg, marginTop: 8 }}>
              POINTS ARE CHANGES IN {a.short} WIN PROBABILITY
            </AppText>
          </>
        ) : null}

        {m.status === 'live' && p.momentum != null && p.pressure != null ? (
          <Card style={{ marginHorizontal: space.lg, marginTop: space.xl, flexDirection: 'row', gap: space.xl }}>
            <Meter value={p.momentum} label="Momentum" color={p.momentum >= 0.5 ? a.color : b.color} caption={p.momentum >= 0.5 ? `With ${a.short}` : `With ${b.short}`} />
            <Meter value={p.pressure} label="Pressure index" color={colors.warning} caption="On the batting side" />
          </Card>
        ) : null}

        <SectionHeader title="Projected score" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          <View style={styles.between}>
            <View style={styles.rowC}>
              <TeamBadge id={p.projected.teamId} size={28} />
              <AppText variant="label" weight="700" style={{ marginLeft: 10 }}>
                {team(p.projected.teamId).name}
              </AppText>
            </View>
            <AppText variant="title" tabular>
              {p.projected.low}–{p.projected.high}
            </AppText>
          </View>
          <RangeBar low={p.projected.low} mid={p.projected.mid} high={p.projected.high} color={team(p.projected.teamId).color} />
          <AppText variant="caption" color="textMuted" style={{ marginTop: 10 }}>
            80% of simulated innings finish in this range. Most likely: {p.projected.mid}.
          </AppText>
        </Card>

        {p.tossAdjusted ? (
          <Card style={{ marginHorizontal: space.lg, marginTop: space.md }}>
            <AppText variant="label" weight="700">
              Toss-adjusted
            </AppText>
            <View style={[styles.rowC, { marginTop: 10 }]}>
              <AppText variant="headline" tabular color="textSecondary">
                {pct(p.tossAdjusted.before)}
              </AppText>
              <Icon name="arrowRight" size={16} color={colors.textMuted} style={{ marginHorizontal: 10 }} />
              <AppText variant="headline" weight="700" tabular>
                {pct(p.tossAdjusted.after)}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
                {a.short}
              </AppText>
            </View>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
              {p.tossAdjusted.note}
            </AppText>
          </Card>
        ) : null}

        {p.topBatters.length || p.topBowlers.length ? (
          <>
            <SectionHeader title="Player probabilities" style={{ marginTop: space.xxl }} />
            <Card style={{ marginHorizontal: space.lg }}>
              {[
                { title: 'Top run-scorer', list: p.topBatters },
                { title: 'Top wicket-taker', list: p.topBowlers },
              ].map((g, gi) => (
                <View key={g.title} style={{ marginTop: gi ? space.xl : 0 }}>
                  <AppText variant="micro" color="textMuted" style={{ marginBottom: 10 }}>
                    {g.title.toUpperCase()}
                  </AppText>
                  {g.list.map(x => {
                    const pl = player(x.playerId);
                    return (
                      <Touch key={x.playerId} onPress={() => nav.navigate('Player', { id: x.playerId })} style={styles.playerProb}>
                        <Avatar playerId={x.playerId} size={34} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.between}>
                            <AppText variant="label" weight="600">
                              {pl?.name}
                            </AppText>
                            <AppText variant="label" weight="700" tabular>
                              {pct(x.p)}
                            </AppText>
                          </View>
                          <View style={{ marginTop: 6 }}>
                            <ProgressBar value={x.p / 0.5} color={team(pl?.teamId ?? '').color} height={4} />
                          </View>
                        </View>
                      </Touch>
                    );
                  })}
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {p.venue.length ? (
          <>
            <SectionHeader title="Pitch, venue & weather" style={{ marginTop: space.xxl }} />
            <Card padded={false} style={{ marginHorizontal: space.lg }}>
              {p.venue.map((v, i) => (
                <View key={v.label}>
                  {i > 0 ? <Hairline inset={space.lg} /> : null}
                  <View style={[styles.between, { paddingHorizontal: space.lg, paddingVertical: 13 }]}>
                    <AppText variant="label" color="textSecondary">
                      {v.label}
                    </AppText>
                    <AppText variant="label" weight="700" tabular color={v.tone === 'good' ? 'success' : v.tone === 'bad' ? 'danger' : 'text'}>
                      {v.value}
                    </AppText>
                  </View>
                </View>
              ))}
              <Hairline />
              <View style={[styles.rowC, { paddingVertical: space.lg }]}>
                <Weather icon="thermometer" label="TEMP" value={`${p.weather.temp}°`} />
                <Weather icon="droplets" label="HUMIDITY" value={`${p.weather.humidity}%`} />
                <Weather icon="wind" label="WIND" value={`${p.weather.wind} km/h`} />
                <Weather icon="cloudRain" label="RAIN" value={`${p.weather.rain}%`} />
              </View>
            </Card>
          </>
        ) : null}

        <SectionHeader title="How this was made" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          <View style={styles.rowC}>
            <Icon name="shieldCheck" size={18} color={colors.success} />
            <AppText variant="label" weight="700" style={{ marginLeft: 8 }}>
              Stored and reproducible
            </AppText>
          </View>
          <AppText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
            Model {p.modelVersion}, generated {shortDate(p.generatedAt)} at {time(p.generatedAt)}. The probability is calculated from data, not written by AI; language models only phrase the explanations.
          </AppText>
          {p.inputs.length ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              {p.inputs.map(x => (
                <View key={x} style={styles.rowC}>
                  <View style={[styles.bullet, { backgroundColor: colors.textMuted }]} />
                  <AppText variant="caption" color="textSecondary">
                    {x}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
          <Touch onPress={() => nav.navigate('ModelPerformance')} style={[styles.rowC, { marginTop: 14, minHeight: 40 }]}>
            <AppText variant="label" weight="600" color="accent" style={{ flex: 1 }}>
              See model accuracy
            </AppText>
            <Icon name="chevronRight" size={16} color={colors.accent} />
          </Touch>
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
  factor: { flexDirection: 'row', padding: space.lg },
  delta: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rangeTrack: { height: 10, borderRadius: 5, marginBottom: 6 },
  rangeFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
  rangeMid: { position: 'absolute', top: -4, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 3 },
  playerProb: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginRight: 8 },
});
