import React from 'react';
import { StyleSheet, View } from 'react-native';
import { seriesOf, team } from '../../data/refs';
import type { Match, Prediction } from '../../data/types';
import { useNavigation } from '../../navigation/Stack';
import { useTheme } from '../../theme/ThemeProvider';
import { radius, space } from '../../theme/tokens';
import { ago, dayLabel, time } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Icon } from '../ui/Icon';
import { LiveIndicator, Tag } from '../ui/Primitives';
import { Touch } from '../ui/Touch';
import { TeamBadge } from './Badges';
import { WinProbBar } from './Charts';

export function PredictionCard({ match, prediction }: { match: Match; prediction: Prediction }) {
  const nav = useNavigation();
  const { colors } = useTheme();
  const a = team(match.teamA);
  const b = team(match.teamB);
  const pa = Math.round(prediction.winA * 100);
  const settled = match.status === 'completed';
  const correct = prediction.outcome === 'correct';
  return (
    <Touch
      scale
      onPress={() => nav.navigate('Prediction', { id: match.id })}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.hairline }]}
    >
      <View style={styles.rowC}>
        <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
          {seriesOf(match.seriesId)?.short} · {match.title}
        </AppText>
        {match.status === 'live' ? (
          <LiveIndicator />
        ) : settled ? (
          <Tag label={correct ? 'CALLED IT' : 'MISSED'} tone={correct ? 'success' : 'danger'} icon={correct ? 'check' : 'x'} />
        ) : (
          <AppText variant="caption" weight="600" color="accent">
            {dayLabel(match.startTime)} · {time(match.startTime)}
          </AppText>
        )}
      </View>
      <View style={[styles.rowC, { marginTop: 16 }]}>
        <View style={styles.side}>
          <TeamBadge id={a.id} size={36} />
          <View style={{ marginLeft: 10 }}>
            <AppText variant="label" weight="700">
              {a.short}
            </AppText>
            <AppText variant="title" tabular color={pa >= 50 ? 'text' : 'textSecondary'}>
              {pa}%
            </AppText>
          </View>
        </View>
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          <View style={{ marginRight: 10, alignItems: 'flex-end' }}>
            <AppText variant="label" weight="700">
              {b.short}
            </AppText>
            <AppText variant="title" tabular color={pa < 50 ? 'text' : 'textSecondary'}>
              {100 - pa}%
            </AppText>
          </View>
          <TeamBadge id={b.id} size={36} />
        </View>
      </View>
      <View style={{ marginTop: 14 }}>
        <WinProbBar teamA={a.id} teamB={b.id} p={prediction.winA} height={6} showLabels={false} />
      </View>
      <View style={[styles.rowC, { marginTop: 14 }]}>
        <Tag label={`${prediction.confidence.toUpperCase()} CONFIDENCE`} tone="brand" />
        <AppText variant="caption" color="textMuted" style={{ marginLeft: 10, flex: 1 }} numberOfLines={1}>
          {settled ? match.result?.text : `Projected ${team(prediction.projected.teamId).short} ${prediction.projected.low}–${prediction.projected.high}`}
        </AppText>
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      </View>
      <AppText variant="micro" color="accent" style={{ marginTop: 10 }}>
        {prediction.modelVersion.toUpperCase()} · {ago(prediction.generatedAt).toUpperCase()}
      </AppText>
    </Touch>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space.lg, overflow: 'hidden' },
  rowC: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },
});
