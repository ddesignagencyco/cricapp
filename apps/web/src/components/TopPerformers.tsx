import Link from 'next/link';
import PersonAvatar from './PersonAvatar';
import { formatPlayerName } from '../utils/helpers';
import type { LeaderEntry, LeaderGroup } from '../types/index';

interface Props {
  leaders: LeaderGroup[];
}

function findGroup(leaders: LeaderGroup[], stat: string): LeaderGroup | undefined {
  return leaders.find((group) => group.stat === stat)
    || leaders.find((group) => group.stat === (stat === 'top_runs' ? 'highest_score' : stat));
}

function PerformerRow({ entry, index }: { entry: LeaderEntry; index: number }) {
  const name = formatPlayerName(entry.playerName);
  const content = (
    <div className="flex min-w-0 items-center gap-2.5">
      <PersonAvatar name={name} src={entry.profileUrl} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-mtext group-hover:text-accent">{name}</p>
        {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
      </div>
    </div>
  );

  return (
    <tr className="border-b border-lborder/60 transition-colors last:border-0 hover:bg-[var(--color-row-hover)]">
      <td className="px-3 py-2.5 text-center font-mono text-xs text-stext">{index + 1}</td>
      <td className="max-w-[14rem] px-3 py-2.5">
        {entry.playerId ? (
          <Link href={`/players/${entry.playerId}`} className="group block min-w-0">
            {content}
          </Link>
        ) : (
          content
        )}
      </td>
      <td className="px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-mtext">
        {entry.value}
      </td>
    </tr>
  );
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
              {runEntries.map((entry, index) => (
                <PerformerRow key={entry.playerId || `${entry.playerName}-${index}`} entry={entry} index={index} />
              ))}
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
              {wicketEntries.map((entry, index) => (
                <PerformerRow key={entry.playerId || `${entry.playerName}-${index}`} entry={entry} index={index} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
