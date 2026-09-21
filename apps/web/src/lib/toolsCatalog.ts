export type ToolKind =
  | 'nrr'
  | 'rrr'
  | 'crr'
  | 'sr'
  | 'bat-avg'
  | 'bowl-avg'
  | 'econ'
  | 'follow-on'
  | 'compare'
  | 'predictions';

export type ToolGroup = 'rates' | 'batting' | 'bowling' | 'match';

export interface ToolDef {
  slug: string;
  title: string;
  blurb: string;
  kind: ToolKind;
  group: ToolGroup;
}

export const TOOL_GROUPS: Array<{ key: ToolGroup; title: string; hint: string }> = [
  { key: 'rates', title: 'Run rates', hint: 'How fast a team is scoring, or needs to' },
  { key: 'batting', title: 'Batting', hint: 'Strike rate and average' },
  { key: 'bowling', title: 'Bowling', hint: 'Average and economy' },
  { key: 'match', title: 'Match', hint: 'Follow-on, compare teams, stored win chances' },
];

export const TOOLS: ToolDef[] = [
  { slug: 'nrr', title: 'Net run rate', blurb: 'Runs for and against, divided by overs.', kind: 'nrr', group: 'rates' },
  { slug: 'required-run-rate', title: 'Required run rate', blurb: 'Runs still needed from the balls left.', kind: 'rrr', group: 'rates' },
  { slug: 'current-run-rate', title: 'Current run rate', blurb: 'Runs scored divided by overs faced.', kind: 'crr', group: 'rates' },
  { slug: 'batting-strike-rate', title: 'Batting strike rate', blurb: 'Runs per 100 balls faced.', kind: 'sr', group: 'batting' },
  { slug: 'batting-average', title: 'Batting average', blurb: 'Runs scored per dismissal.', kind: 'bat-avg', group: 'batting' },
  { slug: 'bowling-average', title: 'Bowling average', blurb: 'Runs conceded per wicket taken.', kind: 'bowl-avg', group: 'bowling' },
  { slug: 'bowling-economy', title: 'Bowling economy', blurb: 'Runs conceded per over bowled.', kind: 'econ', group: 'bowling' },
  { slug: 'follow-on', title: 'Follow-on check', blurb: 'Lead needed in a four- or five-day Test.', kind: 'follow-on', group: 'match' },
  { slug: 'team-compare', title: 'Team comparison', blurb: 'Head-to-head from stored meetings.', kind: 'compare', group: 'match' },
  { slug: 'win-predictor', title: 'Win predictor', blurb: 'Opens stored match predictions. No new odds.', kind: 'predictions', group: 'match' },
];

export function toolBySlug(slug: string): ToolDef | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
