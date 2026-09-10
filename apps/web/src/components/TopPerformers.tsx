import Link from 'next/link';
import type { LeaderGroup } from '../types/index';

interface Props {
  leaders: LeaderGroup[];
}

function findGroup(leaders: LeaderGroup[], stat: string): LeaderGroup | undefined {
  return leaders.find((group) => group.stat === stat);
}

export default function TopPerformers({ leaders }: Props) {
  const runs = findGroup(leaders, 'top_runs');
  const wickets = findGroup(leaders, 'top_wickets');

  if (!runs?.entries?.length && !wickets?.entries?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LeaderList title="Most Runs" unit="runs" group={runs} />
      <LeaderList title="Most Wickets" unit="wkts" group={wickets} />
    </div>
  );
}

function LeaderList({
  title,
  unit,
  group,
}: {
  title: string;
  unit: string;
  group?: LeaderGroup;
}) {
  const entries = (group?.entries || []).slice(0, 5);
  if (entries.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-md border border-lborder bg-card">
      <div className="flex items-center justify-between border-b border-lborder px-4 py-3">
        <h3 className="text-sm font-semibold text-mtext">{title}</h3>
        <Link
          href="/psl"
          className="text-xs font-medium text-accent transition-colors hover:text-accent2"
        >
          Full list
        </Link>
      </div>

      <ul>
        {entries.map((entry, index) => (
          <li
            key={entry.playerId || `${entry.playerName}-${index}`}
            className="flex items-center gap-3 border-b border-lborder/60 px-4 py-2.5 last:border-0"
          >
            <span className="w-4 shrink-0 text-right font-mono text-xs text-stext">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-mtext">{entry.playerName}</p>
              {entry.teamName && (
                <p className="truncate text-xs text-stext">{entry.teamName}</p>
              )}
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold text-mtext">
              {entry.value}
              <span className="ml-1 text-xs font-normal text-stext">{unit}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
