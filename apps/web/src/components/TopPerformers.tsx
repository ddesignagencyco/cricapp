import Link from 'next/link';
import { formatPlayerName } from '../utils/helpers';
import type { LeaderEntry, LeaderGroup } from '../types/index';

interface Props {
  leaders: LeaderGroup[];
}

function findGroup(leaders: LeaderGroup[], stat: string): LeaderGroup | undefined {
  return leaders.find((group) => group.stat === stat)
    || leaders.find((group) => group.stat === (stat === 'top_runs' ? 'highest_score' : stat));
}

function buildLookup(leaders: LeaderGroup[], stat: string): Map<string, number> {
  const map = new Map<string, number>();
  const group = leaders.find((g) => g.stat === stat);
  for (const entry of group?.entries || []) {
    const key = entry.playerId || entry.playerName;
    if (key && typeof entry.value === 'number') {
      map.set(key, entry.value);
    }
  }
  return map;
}

function formatDecimal(val: number | undefined): string {
  if (val === undefined || !Number.isFinite(val)) return '—';
  return val.toFixed(2);
}

function formatCount(val: number | undefined): string {
  if (val === undefined || !Number.isFinite(val)) return '—';
  return String(val);
}

function entryKey(entry: LeaderEntry): string {
  return entry.playerId || entry.playerName;
}

export default function TopPerformers({ leaders }: Props) {
  const runs = findGroup(leaders, 'top_runs');
  const wickets = findGroup(leaders, 'top_wickets');

  if (!runs?.entries?.length && !wickets?.entries?.length) return null;

  const batAvg = buildLookup(leaders, 'top_average');
  const batHs = buildLookup(leaders, 'highest_score');
  const batFours = buildLookup(leaders, 'top_fours');
  const batSixes = buildLookup(leaders, 'top_sixes');
  const batFifties = buildLookup(leaders, 'top_fifties');
  const batHundreds = buildLookup(leaders, 'top_hundreds');

  const bowlAvg = buildLookup(leaders, 'top_bowling_average');
  const bowlEcon = buildLookup(leaders, 'top_economy');

  const runEntries = (runs?.entries || []).slice(0, 5);
  const wicketEntries = (wickets?.entries || []).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {runEntries.length > 0 ? (
        <div className="card-diamond overflow-hidden rounded-md border border-lborder bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center sm:px-4">#</th>
                  <th className="px-3 py-2.5 sm:px-4">Most Runs</th>
                  <th className="px-2.5 py-2.5 text-right sm:px-3" title="Batting Average">Avg</th>
                  <th className="px-2.5 py-2.5 text-right sm:px-3" title="Highest Score">HS</th>
                  <th className="hidden px-2.5 py-2.5 text-right sm:table-cell sm:px-3" title="Fours">4s</th>
                  <th className="hidden px-2.5 py-2.5 text-right sm:table-cell sm:px-3" title="Sixes">6s</th>
                  <th className="hidden px-2.5 py-2.5 text-right md:table-cell sm:px-3" title="Fifties / Hundreds">50/100</th>
                  <th className="px-3 py-2.5 text-right sm:px-4">Runs</th>
                </tr>
              </thead>
              <tbody>
                {runEntries.map((entry, index) => {
                  const key = entryKey(entry);
                  const fifties = batFifties.get(key);
                  const hundreds = batHundreds.get(key);
                  const milestones =
                    fifties !== undefined || hundreds !== undefined
                      ? `${fifties ?? 0}/${hundreds ?? 0}`
                      : '—';
                  const name = formatPlayerName(entry.playerName);
                  return (
                    <tr
                      key={entry.playerId || `${entry.playerName}-${index}`}
                      className="border-b border-lborder/60 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-stext sm:px-4">{index + 1}</td>
                      <td className="max-w-[11rem] px-3 py-2.5 sm:px-4">
                        {entry.playerId ? (
                          <Link href={`/players/${entry.playerId}`} className="block truncate font-semibold text-mtext hover:text-accent">
                            {name}
                          </Link>
                        ) : (
                          <p className="truncate font-semibold text-mtext">{name}</p>
                        )}
                        {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:px-3">
                        {formatDecimal(batAvg.get(key))}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:px-3">
                        {formatCount(batHs.get(key))}
                      </td>
                      <td className="hidden px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:table-cell sm:px-3">
                        {formatCount(batFours.get(key))}
                      </td>
                      <td className="hidden px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:table-cell sm:px-3">
                        {formatCount(batSixes.get(key))}
                      </td>
                      <td className="hidden px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext md:table-cell sm:px-3">
                        {milestones}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-mtext sm:px-4">
                        {entry.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {wicketEntries.length > 0 ? (
        <div className="card-diamond overflow-hidden rounded-md border border-lborder bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] text-left text-sm">
              <thead>
                <tr>
                  <th className="w-10 px-3 py-2.5 text-center sm:px-4">#</th>
                  <th className="px-3 py-2.5 sm:px-4">Most Wickets</th>
                  <th className="px-2.5 py-2.5 text-right sm:px-3" title="Bowling Average">Average</th>
                  <th className="px-2.5 py-2.5 text-right sm:px-3" title="Economy Rate">Economy</th>
                  <th className="px-3 py-2.5 text-right sm:px-4">Wickets</th>
                </tr>
              </thead>
              <tbody>
                {wicketEntries.map((entry, index) => {
                  const key = entryKey(entry);
                  const name = formatPlayerName(entry.playerName);
                  return (
                    <tr
                      key={entry.playerId || `${entry.playerName}-${index}`}
                      className="border-b border-lborder/60 last:border-0"
                    >
                      <td className="px-3 py-2.5 text-center font-mono text-xs text-stext sm:px-4">{index + 1}</td>
                      <td className="max-w-[12rem] px-3 py-2.5 sm:px-4">
                        {entry.playerId ? (
                          <Link href={`/players/${entry.playerId}`} className="block truncate font-semibold text-mtext hover:text-accent">
                            {name}
                          </Link>
                        ) : (
                          <p className="truncate font-semibold text-mtext">{name}</p>
                        )}
                        {entry.teamName ? <p className="truncate text-xs text-stext">{entry.teamName}</p> : null}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:px-3">
                        {formatDecimal(bowlAvg.get(key))}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono text-xs tabular-nums text-stext sm:px-3">
                        {formatDecimal(bowlEcon.get(key))}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-mtext sm:px-4">
                        {entry.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
