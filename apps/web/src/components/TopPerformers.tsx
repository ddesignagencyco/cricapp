import Link from 'next/link';
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

  const runEntries = (runs?.entries || []).slice(0, 5);
  const wicketEntries = (wickets?.entries || []).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {runEntries.length > 0 ? (
        <div className="card-diamond overflow-hidden rounded-md border border-lborder bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs font-bold uppercase tracking-wider text-stext">
                <th className="w-10 px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Most Runs</th>
                <th className="w-24 px-4 py-2.5 text-right">Runs</th>
              </tr>
            </thead>
            <tbody>
              {runEntries.map((entry, index) => {
                const name = formatPlayerName(entry.playerName);
                return (
                  <tr
                    key={entry.playerId || `${entry.playerName}-${index}`}
                    className="border-b border-lborder/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-stext">{index + 1}</td>
                    <td className="max-w-[12rem] px-3 py-2.5">
                      {entry.playerId ? (
                        <Link href={`/players/${entry.playerId}`} className="block truncate font-semibold text-mtext hover:text-accent">
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold text-mtext">{name}</p>
                      )}
                      {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-mtext">
                      {entry.value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {wicketEntries.length > 0 ? (
        <div className="card-diamond overflow-hidden rounded-md border border-lborder bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs font-bold uppercase tracking-wider text-stext">
                <th className="w-10 px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Most Wickets</th>
                <th className="w-24 px-4 py-2.5 text-right">Wickets</th>
              </tr>
            </thead>
            <tbody>
              {wicketEntries.map((entry, index) => {
                const name = formatPlayerName(entry.playerName);
                return (
                  <tr
                    key={entry.playerId || `${entry.playerName}-${index}`}
                    className="border-b border-lborder/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 text-center font-mono text-xs text-stext">{index + 1}</td>
                    <td className="max-w-[12rem] px-3 py-2.5">
                      {entry.playerId ? (
                        <Link href={`/players/${entry.playerId}`} className="block truncate font-semibold text-mtext hover:text-accent">
                          {name}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold text-mtext">{name}</p>
                      )}
                      {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-mtext">
                      {entry.value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
