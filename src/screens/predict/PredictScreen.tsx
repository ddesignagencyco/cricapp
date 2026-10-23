import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PredictionCard } from '../../components/cricket/PredictionCard';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Icon } from '../../components/ui/Icon';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { Glow, LiveIndicator, SectionHeader } from '../../components/ui/Primitives';
import { Touch } from '../../components/ui/Touch';
import { repo } from '../../data/repo';
import type { Match, Prediction } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';

function Cards({ list }: { list: { match: Match; prediction: Prediction }[] }) {
  return (
    <View style={{ gap: space.md, paddingHorizontal: space.lg }}>
      {list.map(x => (
        <PredictionCard key={x.match.id} match={x.match} prediction={x.prediction} />
      ))}
    </View>
  );
}

export default function PredictScreen() {
  const nav = useNavigation();
  const { colors } = useTheme();
  const { data, loading, refresh, refreshing } = useQuery('predictions', repo.predictions, { live: true });
  const perf = data?.performance;

  return (
    <Screen>
      <TabHeader title="Predictions" />
      {loading || !data || !perf ? (
        <SkeletonList count={3} height={180} />
      ) : (
        <Body onRefresh={refresh} refreshing={refreshing} bottomInset={false}>
          <Touch
            scale
            onPress={() => nav.navigate('ModelPerformance')}
            style={[styles.record, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
          >
            <Glow color={colors.brand} size={260} opacity={0.25} style={{ right: -120, top: -130 }} />
            <View style={{ flex: 1 }}>
              <AppText variant="overline" color="textMuted">
                OUR TRACK RECORD
              </AppText>
              <View style={styles.recordRow}>
                <AppText variant="display" tabular>
                  {Math.round((perf.correct / perf.total) * 100)}%
                </AppText>
                <AppText variant="caption" color="textSecondary" style={{ marginLeft: 10, flex: 1 }}>
                  of {perf.total} winner calls correct since March. Every prediction stays public.
                </AppText>
              </View>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textMuted} />
          </Touch>

          {data.live.length ? (
            <>
              <View style={styles.liveHead}>
                <LiveIndicator label="LIVE MODEL" size="md" />
                <AppText variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
                  Updates every ball
                </AppText>
              </View>
              <Cards list={data.live} />
            </>
          ) : null}

          {data.upcoming.length ? (
            <>
              <SectionHeader title="Upcoming" overline="PRE-MATCH" style={{ marginTop: space.xxl }} />
              <Cards list={data.upcoming} />
            </>
          ) : null}

          {data.settled.length ? (
            <>
              <SectionHeader
                title="Recently settled"
                action="Full record"
                onAction={() => nav.navigate('ModelPerformance')}
                style={{ marginTop: space.xxl }}
              />
              <Cards list={data.settled.slice(0, 2)} />
            </>
          ) : null}

          <AppText variant="caption" color="textMuted" align="center" style={styles.note}>
            Probabilities come from a statistical model trained on ball-by-ball data. They are estimates, not certainties.
          </AppText>
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  record: {
    marginHorizontal: space.lg,
    marginTop: space.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  liveHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.xxl, marginBottom: space.md },
  note: { paddingHorizontal: space.xxl, marginTop: space.xl },
});
