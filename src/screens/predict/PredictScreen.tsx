import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PredictionCard } from '../../components/cricket/PredictionCard';
import { AppText } from '../../components/ui/AppText';
import { SkeletonList } from '../../components/ui/Controls';
import { Body, Screen, TabHeader } from '../../components/ui/Layout';
import { EmptyState, ErrorState, LiveIndicator, SectionHeader } from '../../components/ui/Primitives';
import { repo } from '../../data/repo';
import type { Match, Prediction } from '../../data/types';
import { useQuery } from '../../data/useQuery';
import { space } from '../../theme/tokens';
import { ago } from '../../utils/format';

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
  const { data, loading, error, refresh, refreshing } = useQuery('predictions', repo.predictions, { live: true });

  return (
    <Screen>
      <TabHeader title="Predictions" />
      {!data && error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : loading || !data ? (
        <SkeletonList count={3} height={180} />
      ) : (
        <Body onRefresh={refresh} refreshing={refreshing} bottomInset={false}>
          {!data.live.length && !data.upcoming.length && !data.settled.length ? (
            <EmptyState icon="sparkles" title="No predictions right now" body="Win probabilities appear here before a match starts and update during play." />
          ) : null}

          {data.live.length ? (
            <>
              <View style={styles.liveHead}>
                <LiveIndicator label="LIVE MODEL" size="md" />
                <AppText variant="caption" color="textMuted" style={{ marginLeft: 8 }}>
                  {(() => {
                    // Promise "every ball" only while the model is actually updating.
                    const newest = Math.max(...data.live.map(x => +new Date(x.prediction.generatedAt)));
                    return Date.now() - newest > 10 * 60_000 ? `Last update ${ago(new Date(newest).toISOString())}` : 'Updates every ball';
                  })()}
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
              <SectionHeader title="Recently settled" style={{ marginTop: space.xxl }} />
              <Cards list={data.settled.slice(0, 2)} />
            </>
          ) : null}

          <AppText variant="caption" color="textMuted" align="center" style={styles.note}>
            Win probabilities are estimates, not certainties.
          </AppText>
        </Body>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  liveHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, marginTop: space.xxl, marginBottom: space.md },
  note: { paddingHorizontal: space.xxl, marginTop: space.xl },
});
