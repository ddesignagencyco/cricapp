import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PredictionCard } from '../../components/cricket/PredictionCard';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Header, Screen } from '../../components/ui/Layout';
import { Card, Glow, Hairline, ProgressBar, SectionHeader } from '../../components/ui/Primitives';
import { repo } from '../../data/repo';
import { useQuery } from '../../data/useQuery';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { pct, shortDate } from '../../utils/format';

export default function ModelPerformanceScreen() {
  const { colors } = useTheme();
  const { data } = useQuery('predictions', repo.predictions);
  if (!data) {
    return (
      <Screen>
        <Header title="Model performance" />
        <SkeletonList count={3} height={160} />
      </Screen>
    );
  }
  const perf = data.performance;
  return (
    <Screen>
      <Header title="Model performance" subtitle={`${perf.modelVersion} · public record`} />
      <Body>
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.hairline }]}>
          <Glow color={colors.success} size={300} opacity={0.18} style={{ right: -140, top: -150 }} />
          <AppText variant="overline" color="textMuted">
            WINNER CALLS SINCE {shortDate(perf.since).toUpperCase()}
          </AppText>
          <View style={[styles.rowC, { marginTop: 8 }]}>
            <AppText variant="scoreXl" tabular>
              {pct(perf.correct / perf.total)}
            </AppText>
            <View style={{ marginLeft: space.lg }}>
              <AppText variant="label" weight="700" tabular>
                {perf.correct} / {perf.total}
              </AppText>
              <AppText variant="caption" color="textMuted">
                correct
              </AppText>
            </View>
          </View>
          <Hairline style={{ marginVertical: space.lg }} />
          <View style={styles.rowC}>
            <View style={{ flex: 1 }}>
              <AppText variant="micro" color="textMuted">
                BRIER SCORE
              </AppText>
              <AppText variant="headline" weight="700" tabular>
                {perf.brier.toFixed(3)}
              </AppText>
            </View>
            <AppText variant="caption" color="textSecondary" style={{ flex: 2 }}>
              Lower is better. A coin flip scores 0.250; this measures how well-calibrated the percentages are, not just who won.
            </AppText>
          </View>
        </View>

        <SectionHeader title="Accuracy by format" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg, gap: space.lg }}>
          {perf.byFormat.map(f => (
            <View key={f.format}>
              <View style={styles.between}>
                <AppText variant="label" weight="700">
                  {f.format}
                </AppText>
                <AppText variant="label" tabular color="textSecondary">
                  <AppText variant="label" weight="700" tabular>
                    {pct(f.accuracy)}
                  </AppText>{' '}
                  of {f.total}
                </AppText>
              </View>
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={f.accuracy} height={6} />
              </View>
            </View>
          ))}
        </Card>

        <SectionHeader title="Calibration" overline="DO OUR PERCENTAGES MEAN WHAT THEY SAY?" style={{ marginTop: space.xxl }} />
        <Card style={{ marginHorizontal: space.lg }}>
          {perf.bands.map((b, i) => (
            <View key={b.band} style={{ marginTop: i ? space.lg : 0 }}>
              <View style={styles.between}>
                <AppText variant="label" weight="700">
                  Predicted {b.band}
                </AppText>
                <AppText variant="caption" color="textMuted" tabular>
                  {b.count} matches
                </AppText>
              </View>
              <View style={[styles.calib, { backgroundColor: colors.elevated }]}>
                <View style={[styles.calibFill, { width: `${b.actual * 100}%`, backgroundColor: colors.brand }]} />
                <View style={[styles.calibMark, { left: `${b.predicted * 100}%`, backgroundColor: colors.text }]} />
              </View>
              <AppText variant="caption" color="textSecondary" tabular>
                Favourite actually won {pct(b.actual)}
              </AppText>
            </View>
          ))}
          <View style={[styles.rowC, { marginTop: space.lg }]}>
            <View style={[styles.calibMark, { position: 'relative', left: 0, height: 12, marginRight: 8, backgroundColor: colors.text }]} />
            <AppText variant="caption" color="textMuted">
              Marker = what we predicted. Bar = what happened.
            </AppText>
          </View>
        </Card>

        <View style={[styles.promise, { backgroundColor: colors.brandSoft }]}>
          <Icon name="shieldCheck" size={18} color={colors.accent} />
          <AppText variant="caption" color="text" style={{ flex: 1, marginLeft: 10 }}>
            Every prediction is stored with its timestamp, model version and inputs. Wrong calls are never deleted or edited.
          </AppText>
        </View>

        <SectionHeader title="Recent settled calls" style={{ marginTop: space.xxl }} />
        <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
          {data.settled.map(x => (
            <PredictionCard key={x.match.id} match={x.match} prediction={x.prediction} />
          ))}
        </View>
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
  calib: { height: 10, borderRadius: 5, marginVertical: 8, overflow: 'visible' },
  calibFill: { height: 10, borderRadius: 5 },
  calibMark: { position: 'absolute', top: -3, width: 3, height: 16, borderRadius: 2, marginLeft: -1 },
  promise: { flexDirection: 'row', alignItems: 'center', marginHorizontal: space.lg, marginTop: space.xl, padding: space.lg, borderRadius: radius.md },
});
