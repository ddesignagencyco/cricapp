'use client';

import {
  Activity,
  ArrowLeftRight,
  Calculator,
  CloudRain,
  Gauge,
  Percent,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Users,
  UserRound,
  Dices,
  LineChart,
  Coins,
  Shirt,
  Zap,
} from 'lucide-react';
import type { ToolKind } from '../../lib/toolsCatalog';

export function ToolGlyph({
  kind,
  size = 18,
}: {
  kind: ToolKind;
  size?: number;
}) {
  switch (kind) {
    case 'nrr':
      return <Activity size={size} strokeWidth={2.2} />;
    case 'rrr':
      return <Target size={size} strokeWidth={2.2} />;
    case 'crr':
      return <Gauge size={size} strokeWidth={2.2} />;
    case 'dls':
      return <CloudRain size={size} strokeWidth={2.2} />;
    case 'sr':
      return <Zap size={size} strokeWidth={2.2} />;
    case 'bat-avg':
      return <TrendingUp size={size} strokeWidth={2.2} />;
    case 'bowl-avg':
      return <Percent size={size} strokeWidth={2.2} />;
    case 'econ':
      return <Gauge size={size} strokeWidth={2.2} />;
    case 'follow-on':
      return <ArrowLeftRight size={size} strokeWidth={2.2} />;
    case 'player-compare':
      return <UserRound size={size} strokeWidth={2.2} />;
    case 'compare':
      return <Users size={size} strokeWidth={2.2} />;
    case 'h2h':
      return <Swords size={size} strokeWidth={2.2} />;
    case 'match-sim':
      return <Dices size={size} strokeWidth={2.2} />;
    case 'what-if':
      return <LineChart size={size} strokeWidth={2.2} />;
    case 'score-predictor':
      return <Calculator size={size} strokeWidth={2.2} />;
    case 'predictions':
      return <Sparkles size={size} strokeWidth={2.2} />;
    case 'odds':
      return <Coins size={size} strokeWidth={2.2} />;
    case 'implied':
      return <Percent size={size} strokeWidth={2.2} />;
    case 'fantasy':
      return <Shirt size={size} strokeWidth={2.2} />;
    default: {
      const _unused: never = kind;
      return _unused;
    }
  }
}
