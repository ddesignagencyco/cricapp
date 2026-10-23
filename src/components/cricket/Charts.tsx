import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { team as teamOf } from '../../data/refs';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../utils/color';
import { AppText } from '../ui/AppText';

/*
 * Charts drawn with plain Views (rotated segments, bars), so the app needs
 * no SVG or canvas native module.
 */

/** Split bar: team A's share on the left, team B's on the right. */
export function WinProbBar({
  teamA,
  teamB,
  p,
  height = 8,
  showLabels = true,
}: {
  teamA: string;
  teamB: string;
  p: number;
  height?: number;
  showLabels?: boolean;
}) {
  const a = teamOf(teamA);
  const b = teamOf(teamB);
  const left = Math.round(p * 100);
  return (
    <View accessibilityLabel={`${a.name} ${left}%, ${b.name} ${100 - left}%`}>
      {showLabels ? (
        <View style={styles.probLabels}>
          <AppText variant="label" weight="700" color={a.color} tabular>
            {a.short} {left}%
          </AppText>
          <AppText variant="label" weight="700" color={b.color} tabular>
            {100 - left}% {b.short}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.probTrack, { height, borderRadius: height / 2 }]}>
        <View style={{ flex: Math.max(left, 1), backgroundColor: a.color, borderRadius: height / 2 }} />
        <View style={{ width: 3 }} />
        <View style={{ flex: Math.max(100 - left, 1), backgroundColor: b.color, borderRadius: height / 2 }} />
      </View>
    </View>
  );
}

interface Point {
  x: number;
  y: number;
  event?: 'wicket' | 'six';
}

/**
 * Line chart with a 50% midline. `y` is 0..1. Segments are Views rotated
 * between consecutive points; the area under the line is thin columns.
 */
export function LineChart({
  points,
  xMax,
  height = 160,
  color,
  colorBelow,
  midline = true,
  xLabels,
}: {
  points: Point[];
  xMax: number;
  height?: number;
  color: string;
  colorBelow?: string;
  midline?: boolean;
  xLabels?: string[];
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  // Zoom around 50% so swings are readable, but never tighter than 25–75%.
  const span = Math.min(0.5, Math.max(0.25, ...points.map(p => Math.abs(p.y - 0.5) + 0.06)));
  const px = (x: number) => (x / xMax) * w;
  const py = (y: number) => (1 - (0.5 + (y - 0.5) / (2 * span))) * height;
  const stroke = 2.5;

  return (
    <View>
      <View style={{ height }} onLayout={e => setW(e.nativeEvent.layout.width)}>
        {[0.5 - span / 2, 0.5, 0.5 + span / 2].map(g => (
          <View
            key={g}
            style={[
              styles.grid,
              {
                top: py(g),
                backgroundColor: g === 0.5 && midline ? colors.border : colors.hairline,
              },
            ]}
          />
        ))}
        {w > 0 &&
          points.slice(1).map((p, i) => {
            const a = points[i];
            const x1 = px(a.x);
            const y1 = py(a.y);
            const x2 = px(p.x);
            const y2 = py(p.y);
            const len = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const above = (a.y + p.y) / 2 >= 0.5;
            const c = above || !colorBelow ? color : colorBelow;
            return (
              <React.Fragment key={i}>
                {/* Area: one column per segment from the line down to the midline. */}
                <View
                  style={{
                    position: 'absolute',
                    left: x1,
                    width: Math.max(1, x2 - x1 + 0.5),
                    top: Math.min(py((a.y + p.y) / 2), py(0.5)),
                    height: Math.abs(py((a.y + p.y) / 2) - py(0.5)),
                    backgroundColor: alpha(c, 0.12),
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: (x1 + x2) / 2 - len / 2,
                    top: (y1 + y2) / 2 - stroke / 2,
                    width: len + 1,
                    height: stroke,
                    borderRadius: stroke,
                    backgroundColor: c,
                    transform: [{ rotate: `${angle}rad` }],
                  }}
                />
              </React.Fragment>
            );
          })}
        {w > 0 &&
          points
            .filter(p => p.event)
            .map((p, i) => (
              <View
                key={`e${i}`}
                style={[
                  styles.event,
                  {
                    left: px(p.x) - 5,
                    top: py(p.y) - 5,
                    backgroundColor: p.event === 'wicket' ? colors.live : colors.six,
                    borderColor: colors.surface,
                  },
                ]}
              />
            ))}
        {w > 0 && points.length ? (
          <View
            style={[
              styles.head,
              {
                left: px(points[points.length - 1].x) - 6,
                top: py(points[points.length - 1].y) - 6,
                backgroundColor: color,
                borderColor: colors.surface,
              },
            ]}
          />
        ) : null}
      </View>
      {xLabels ? (
        <View style={styles.xLabels}>
          {xLabels.map(l => (
            <AppText key={l} variant="micro" color="textMuted" tabular>
              {l}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Runs per over with wicket markers. */
export function Manhattan({
  runs,
  wickets,
  color,
  height = 120,
  compare,
  compareColor,
}: {
  runs: number[];
  wickets: number[];
  color: string;
  height?: number;
  compare?: number[];
  compareColor?: string;
}) {
  const { colors } = useTheme();
  const n = Math.max(runs.length, compare?.length ?? 0, 1);
  const max = Math.max(12, ...runs, ...(compare ?? []));
  return (
    <View>
      <View style={[styles.manhattan, { height }]}>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} style={styles.overCol}>
            {wickets[i] ? (
              <View style={styles.wkts}>
                {Array.from({ length: wickets[i] }, (_, k) => (
                  <View key={k} style={[styles.wktDot, { backgroundColor: colors.live }]} />
                ))}
              </View>
            ) : null}
            <View style={styles.bars}>
              <View
                style={{
                  flex: 1,
                  height: ((runs[i] ?? 0) / max) * (height - 18),
                  backgroundColor: runs[i] != null ? color : 'transparent',
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
              {compare ? (
                <View
                  style={{
                    flex: 1,
                    marginLeft: 1,
                    height: ((compare[i] ?? 0) / max) * (height - 18),
                    backgroundColor: compareColor ?? colors.textMuted,
                    opacity: 0.55,
                    borderTopLeftRadius: 3,
                    borderTopRightRadius: 3,
                  }}
                />
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <View style={[styles.axis, { borderTopColor: colors.border }]}>
        {Array.from({ length: n }, (_, i) => (
          <AppText key={i} variant="micro" color="textMuted" style={styles.axisLabel} tabular>
            {(i + 1) % 5 === 0 ? i + 1 : ''}
          </AppText>
        ))}
      </View>
    </View>
  );
}

/** Horizontal meter 0..1 with a label, used for momentum/pressure. */
export function Meter({ value, label, color, caption }: { value: number; label: string; color: string; caption: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <AppText variant="section" tabular style={{ marginTop: 2 }}>
        {Math.round(value * 100)}
      </AppText>
      <View style={[styles.meterTrack, { backgroundColor: colors.elevated }]}>
        <View style={{ width: `${value * 100}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
      <AppText variant="micro" color="textSecondary" style={{ marginTop: 6 }}>
        {caption}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  probLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  probTrack: { flexDirection: 'row', overflow: 'hidden' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1 },
  event: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  head: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 3 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  manhattan: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  overCol: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  bars: { flexDirection: 'row', alignItems: 'flex-end' },
  wkts: { alignItems: 'center', gap: 2, marginBottom: 3 },
  wktDot: { width: 5, height: 5, borderRadius: 3 },
  axis: { flexDirection: 'row', gap: 3, borderTopWidth: 1, paddingTop: 4 },
  axisLabel: { flex: 1, textAlign: 'center' },
  meterTrack: { height: 4, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
});
