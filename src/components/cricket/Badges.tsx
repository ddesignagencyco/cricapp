import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { team as teamOf, player as playerOf } from '../../data/refs';
import type { BallOutcome } from '../../data/types';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha, badgeFill, colorFor, readableOn } from '../../utils/color';
import { AppText } from '../ui/AppText';

/** A solid colour disc with crisp initials or a code: shared by teams and people. */
function Disc({ fill, label, size, ring, style, labelScale }: { fill: string; label: string; size: number; ring?: boolean; style?: StyleProp<ViewStyle>; labelScale: number }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          // A thin white ring separates the disc from coloured backgrounds.
          borderWidth: ring ? 2 : 0,
          borderColor: 'rgba(255,255,255,0.9)',
        },
        style,
      ]}
    >
      <AppText variant="micro" weight="700" color={readableOn(fill)} style={{ fontSize: size * labelScale, lineHeight: size * 0.46, letterSpacing: 0.2 }}>
        {label}
      </AppText>
    </View>
  );
}

/**
 * Team crest stand-in: the team code on a solid team-colour disc, deepened
 * just enough for crisp text (gold sides keep dark text).
 * `solid`: adds a white ring for use on the blue live gradient.
 */
export function TeamBadge({ id, size = 36, style, solid }: { id: string; size?: number; style?: StyleProp<ViewStyle>; solid?: boolean }) {
  const t = teamOf(id);
  const code = t.short.length > 3 ? t.short.slice(0, 3) : t.short;
  return (
    <View accessibilityLabel={t.name}>
      <Disc fill={badgeFill(t.color)} label={code} size={size} ring={solid} style={style} labelScale={code.length > 2 ? 0.3 : 0.36} />
    </View>
  );
}

/** Initials avatar: players take their team's colour, other people a stable colour from their name. */
export function Avatar({
  name,
  playerId,
  size = 40,
  color,
}: {
  name?: string;
  playerId?: string;
  size?: number;
  color?: string;
}) {
  const p = playerId ? playerOf(playerId) : undefined;
  const full = p?.name ?? name ?? '?';
  const label = full
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const base = color ?? (p ? teamOf(p.teamId).color : colorFor(full));
  return <Disc fill={badgeFill(base)} label={label} size={size} labelScale={0.36} />;
}

/** One delivery in a strip: dot, runs, boundary, wicket or extra. */
export function BallChip({ outcome, size = 28 }: { outcome: BallOutcome; size?: number }) {
  const { colors } = useTheme();
  let bg = colors.elevated;
  let fg = colors.textSecondary;
  let label = '';
  let border = colors.border;
  switch (outcome.kind) {
    case 'runs':
      label = outcome.runs === 0 ? '•' : String(outcome.runs);
      fg = outcome.runs === 0 ? colors.textMuted : colors.text;
      break;
    case 'four':
      bg = colors.four;
      fg = '#fff';
      label = '4';
      border = colors.four;
      break;
    case 'six':
      bg = colors.six;
      fg = '#1A1200';
      label = '6';
      border = colors.six;
      break;
    case 'wicket':
      bg = colors.live;
      fg = '#fff';
      label = 'W';
      border = colors.live;
      break;
    case 'extra':
      bg = 'transparent';
      fg = colors.warning;
      border = alpha(colors.warning, 0.5);
      label = outcome.label;
      break;
  }
  return (
    <View
      accessibilityLabel={
        outcome.kind === 'runs' ? `${outcome.runs} runs` : outcome.kind === 'extra' ? outcome.label : outcome.kind
      }
      style={[
        styles.ball,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderColor: border },
      ]}
    >
      <AppText
        variant="caption"
        weight="700"
        color={fg}
        tabular
        style={{ fontSize: label.length > 1 ? size * 0.34 : size * 0.44, lineHeight: size * 0.6 }}
      >
        {label}
      </AppText>
    </View>
  );
}

export function BallStrip({ balls, size = 26 }: { balls: BallOutcome[]; size?: number }) {
  return (
    <View style={styles.strip}>
      {balls.map((b, i) => (
        <BallChip key={i} outcome={b} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ball: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  strip: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
});
