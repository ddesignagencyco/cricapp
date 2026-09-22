export type ToolKind =
  | 'nrr'
  | 'rrr'
  | 'crr'
  | 'dls'
  | 'sr'
  | 'bat-avg'
  | 'bowl-avg'
  | 'econ'
  | 'follow-on'
  | 'player-compare'
  | 'compare'
  | 'h2h'
  | 'match-sim'
  | 'what-if'
  | 'score-predictor'
  | 'predictions'
  | 'odds'
  | 'implied'
  | 'fantasy';

export type ToolGroup = 'rates' | 'batting' | 'bowling' | 'match' | 'analysis';

export interface ToolDef {
  slug: string;
  title: string;
  blurb: string;
  kind: ToolKind;
  group: ToolGroup;
}

export const TOOL_GROUPS: Array<{ key: ToolGroup; title: string; hint: string }> = [
  { key: 'rates', title: 'Run rates', hint: 'Scoring rate, chase rate and rain revision' },
  { key: 'batting', title: 'Batting', hint: 'Strike rate and average' },
  { key: 'bowling', title: 'Bowling', hint: 'Average and economy' },
  { key: 'match', title: 'Match', hint: 'Follow-on, what-if and innings projection' },
  { key: 'analysis', title: 'Comparison', hint: 'Players, head-to-head and fantasy points' },
];

export const TOOLS: ToolDef[] = [
  { slug: 'nrr', title: 'Net run rate', blurb: 'Runs for and against ÷ cricket overs. All-out sides use the full quota.', kind: 'nrr', group: 'rates' },
  { slug: 'required-run-rate', title: 'Required run rate', blurb: 'Runs still needed from the balls left, per over.', kind: 'rrr', group: 'rates' },
  { slug: 'current-run-rate', title: 'Current run rate', blurb: 'Runs scored ÷ overs faced (10.3 means 10 overs + 3 balls).', kind: 'crr', group: 'rates' },
  { slug: 'dls', title: 'DLS calculator', blurb: 'Educational Duckworth–Lewis resource target. Not the licensed ICC table.', kind: 'dls', group: 'rates' },
  { slug: 'batting-strike-rate', title: 'Batting strike rate', blurb: 'Runs per 100 balls faced.', kind: 'sr', group: 'batting' },
  { slug: 'batting-average', title: 'Batting average', blurb: 'Runs scored per dismissal (not-outs excluded).', kind: 'bat-avg', group: 'batting' },
  { slug: 'bowling-average', title: 'Bowling average', blurb: 'Runs conceded per wicket taken.', kind: 'bowl-avg', group: 'bowling' },
  { slug: 'bowling-economy', title: 'Bowling economy', blurb: 'Runs conceded per cricket over bowled.', kind: 'econ', group: 'bowling' },
  { slug: 'follow-on', title: 'Follow-on calculator', blurb: 'Law 14 lead needed for a 1- to 5-day match.', kind: 'follow-on', group: 'match' },
  { slug: 'player-compare', title: 'Player comparison', blurb: 'Side-by-side profiles from the stored player directory.', kind: 'player-compare', group: 'analysis' },
  { slug: 'head-to-head', title: 'Head-to-head analyzer', blurb: 'Pick two teams and open the stored H2H report.', kind: 'h2h', group: 'analysis' },
  { slug: 'match-simulator', title: 'Match simulator', blurb: 'Expected totals from entered RPO — not a live model.', kind: 'match-sim', group: 'match' },
  { slug: 'what-if', title: 'What-if match simulator', blurb: 'Project a chase from current score, overs left and assumed RPO.', kind: 'what-if', group: 'match' },
  { slug: 'fantasy-xi', title: 'Fantasy points / XI', blurb: 'Informational Dream11-style points for a player or XI.', kind: 'fantasy', group: 'analysis' },
];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

/** Hub badge: client formula vs existing APIs (no new backend). */
export function toolSource(kind: ToolKind): 'formula' | 'stored' {
  switch (kind) {
    case 'player-compare':
    case 'compare':
    case 'h2h':
    case 'predictions':
    case 'score-predictor':
      return 'stored';
    case 'nrr':
    case 'rrr':
    case 'crr':
    case 'dls':
    case 'sr':
    case 'bat-avg':
    case 'bowl-avg':
    case 'econ':
    case 'follow-on':
    case 'match-sim':
    case 'what-if':
    case 'odds':
    case 'implied':
    case 'fantasy':
      return 'formula';
    default: {
      const _unused: never = kind;
      return _unused;
    }
  }
}
