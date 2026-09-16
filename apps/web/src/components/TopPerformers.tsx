import { formatPlayerName } from '../utils/helpers';
import type { LeaderGroup } from '../types/index';

interface Props {
  leaders: LeaderGroup[];
}

function findGroup(leaders: LeaderGroup[], stat: string): LeaderGroup | undefined {
  return leaders.find((group) => group.stat === stat)
    || leaders.find((group) => group.stat === (stat === 'top_runs' ? 'highest_score' : stat));
}

export default function TopPerformers({ leaders }: Props) {
  const runs = findGroup(leaders, 'top_runs');
  const wickets = findGroup(leaders, 'top_wickets');

  if (!runs?.entries?.length && !wickets?.entries?.length) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LeaderList title="Most Runs" unit="Runs" group={runs} />
      <LeaderList title="Most Wickets" unit="Wkts" group={wickets} />
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
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th className="w-10 px-4 py-2.5">#</th>
            <th className="px-4 py-2.5">{title}</th>
            <th className="px-4 py-2.5 text-right">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr
              key={entry.playerId || `${entry.playerName}-${index}`}
              className="border-b border-lborder/60 last:border-0"
            >
              <td className="px-4 py-2.5 font-mono text-xs text-stext">{index + 1}</td>
              <td className="px-4 py-2.5">
                <p className="truncate font-medium text-mtext">{formatPlayerName(entry.playerName)}</p>
                {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-sm font-semibold text-mtext">
                {entry.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
