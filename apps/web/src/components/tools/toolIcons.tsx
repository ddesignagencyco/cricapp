'use client';

import {
  Activity,
  ArrowLeftRight,
  Gauge,
  Percent,
  Sparkles,
  Target,
  TrendingUp,
  Users,
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
    case 'compare':
      return <Users size={size} strokeWidth={2.2} />;
    case 'predictions':
      return <Sparkles size={size} strokeWidth={2.2} />;
    default: {
      const _unused: never = kind;
      return _unused;
    }
  }
}
