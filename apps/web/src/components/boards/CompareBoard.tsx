'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { ArrowLeftRight, Calendar, MapPin, Swords } from 'lucide-react';
import type { Team, HeadToHead } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import { fetchHeadToHead } from '../../services/headToHead';
import {
  formatH2HDate,
  isUpcomingMeeting,
  parseH2H,
  tallyH2H,
  type ParsedMeeting,
} from '../../lib/headToHead';
import TeamLogo from '../TeamLogo';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import { decodeEntityId, withColonEntityQuery } from '../../utils/entityId';

const selectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: 'var(--color-elevated)',
    borderColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-lborder)',
    borderRadius: '0.75rem',
    minHeight: '48px',
    padding: '0.15rem 0.35rem',
    boxShadow: 'none',
    '&:hover': { borderColor: 'var(--color-accent)' },
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    backgroundColor: state.isFocused ? 'var(--color-accent)' : 'var(--color-elevated)',
    color: state.isFocused ? 'white' : 'var(--color-mtext)',
    borderRadius: '0.5rem',
    margin: '2px 4px',
    padding: '8px 12px',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'var(--color-elevated)',
    border: '1px solid var(--color-lborder)',
    borderRadius: '0.75rem',
    overflow: 'hidden',
    zIndex: 20,
  }),
  menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex: 40 }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: 'var(--color-mtext)',
    fontWeight: 600,
  }),
  input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-mtext)' }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-stext)' }),
  dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-stext)' }),
  indicatorSeparator: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'var(--color-lborder)',
  }),
  noOptionsMessage: (base: Record<string, unknown>) => ({ ...base, color: 'var(--color-stext)' }),
};

function teamLabel(team: Team): string {
  const abbr = team.abbr || team.code || team.shortName;
  return abbr ? `${team.name} (${abbr})` : team.name;
}

async function loadAllTeams(): Promise<Team[]> {
  const first = await fetchTeamsPage({ limit: 100, page: 1 });
  const extraPages = Math.min(Math.max(first.totalPages - 1, 0), 4);
  const rest =
    extraPages > 0
      ? await Promise.all(
          Array.from({ length: extraPages }, (_, i) => fetchTeamsPage({ limit: 100, page: i + 2 }))
        )
      : [];
  const seen = new Set<string>();
  const all: Team[] = [];
  for (const team of [...first.items, ...rest.flatMap((page) => page.items)]) {
    if (!team.id || seen.has(team.id)) continue;
    seen.add(team.id);
    all.push(team);
  }
  return all.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export default function CompareBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const teamAId = decodeEntityId(searchParams.get('a'));
  const teamBId = decodeEntityId(searchParams.get('b'));

  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsError, setTeamsError] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [data, setData] = useState<HeadToHead | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [reportRetry, setReportRetry] = useState(0);

  const setPair = useCallback(
    (nextA: string, nextB: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextA) params.set('a', decodeEntityId(nextA));
      else params.delete('a');
      if (nextB) params.set('b', decodeEntityId(nextB));
      else params.delete('b');
      const qs = withColonEntityQuery(params);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    setTeamsLoading(true);
    setTeamsError(false);
    loadAllTeams()
      .then((items) => {
        if (!cancelled) {
          setTeams(items);
          setTeamsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
          setTeamsError(true);
          setTeamsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  useEffect(() => {
    if (!teamAId || !teamBId || teamAId === teamBId) {
      setData(null);
      setReportError(false);
      setReportLoading(false);
      return;
    }
    let cancelled = false;
    setReportLoading(true);
    setReportError(false);
    fetchHeadToHead(teamAId, teamBId)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setReportLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(null);
          setReportError(true);
          setReportLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [teamAId, teamBId, reportRetry]);

  const teamA = teams.find((t) => t.id === teamAId) || null;
  const teamB = teams.find((t) => t.id === teamBId) || null;
  const sameTeam = Boolean(teamAId && teamBId && teamAId === teamBId);

  const parsed = useMemo(() => parseH2H(data), [data]);
  const previous = parsed.meetings.filter((m) => !isUpcomingMeeting(m));
  const upcoming = parsed.meetings.filter((m) => isUpcomingMeeting(m));
  const tally = useMemo(
    () => tallyH2H(previous, teamAId, teamBId),
    [previous, teamAId, teamBId]
  );

  const displayA = teamA
    ? { id: teamA.id, name: teamA.name, abbr: teamA.abbr || teamA.code || parsed.teamA.abbr }
    : parsed.teamA;
  const displayB = teamB
    ? { id: teamB.id, name: teamB.name, abbr: teamB.abbr || teamB.code || parsed.teamB.abbr }
    : parsed.teamB;

  const aPct = tally.total ? Math.round((tally.aWins / tally.total) * 100) : 0;
  const bPct = tally.total ? Math.round((tally.bWins / tally.total) * 100) : 0;
  const drawPct = tally.total ? Math.max(0, 100 - aPct - bPct) : 0;

  const ready = Boolean(teamAId && teamBId && !sameTeam);

  return (
    <div id="compare-teams" className="space-y-5 scroll-mt-24">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
            <Swords size={18} />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-mtext">Compare teams</h2>
            <p className="mt-0.5 text-sm text-stext">
              Pick two sides to see meetings, wins, scores and results.
            </p>
          </div>
        </div>

        {teamsError ? (
          <ErrorState message="Teams could not be loaded for compare." onRetry={() => setRetryKey((k) => k + 1)} />
        ) : (
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stext">Team A</span>
              <Select
                value={teamA}
                onChange={(option) => setPair(option?.id || '', teamBId)}
                options={teams}
                getOptionLabel={teamLabel}
                getOptionValue={(option) => option.id}
                placeholder={teamsLoading ? 'Loading teams…' : 'Select a team'}
                isDisabled={teamsLoading}
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                styles={selectStyles as never}
              />
            </label>
            <button
              type="button"
              onClick={() => setPair(teamBId, teamAId)}
              disabled={!teamAId && !teamBId}
              className="mb-1 inline-flex h-12 w-12 items-center justify-center justify-self-center rounded-xl bg-elevated text-stext ring-1 ring-lborder transition hover:text-accent disabled:opacity-40"
              aria-label="Swap teams"
            >
              <ArrowLeftRight size={18} />
            </button>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stext">Team B</span>
              <Select
                value={teamB}
                onChange={(option) => setPair(teamAId, option?.id || '')}
                options={teams}
                getOptionLabel={teamLabel}
                getOptionValue={(option) => option.id}
                placeholder={teamsLoading ? 'Loading teams…' : 'Select a team'}
                isDisabled={teamsLoading}
                isSearchable
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
                styles={selectStyles as never}
              />
            </label>
          </div>
        )}

        {sameTeam ? (
          <p className="mt-3 text-sm text-stext">Pick two different teams to open the head-to-head report.</p>
        ) : !teamAId || !teamBId ? (
          <p className="mt-3 text-sm text-stext">Select Team A and Team B to load meetings, wins and results.</p>
        ) : null}
      </div>

      {ready && reportError ? (
        <ErrorState message="Head-to-head report could not be loaded." onRetry={() => setReportRetry((k) => k + 1)} />
      ) : ready && reportLoading ? (
        <div className="rounded-2xl bg-card p-8 text-center text-sm text-stext ring-1 ring-lborder">
          Loading report…
        </div>
      ) : ready && (!data || parsed.meetings.length === 0) ? (
        <EmptyState
          title="No head-to-head records"
          message="No meetings are available for this matchup yet. Try another pair once more results are synced."
          icon={Swords}
        />
      ) : ready ? (
        <div className="space-y-5">
            <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <TeamLogo teamId={displayA.id} name={displayA.name} code={displayA.abbr} size="lg" />
                  <Link href={`/teams/${displayA.id}`} className="text-sm font-bold text-mtext hover:text-accent">
                    {displayA.name}
                  </Link>
                </div>
                <div className="text-center">
                  <p className="font-mono text-3xl font-black text-mtext">{tally.total}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stext">meetings</p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <TeamLogo teamId={displayB.id} name={displayB.name} code={displayB.abbr} size="lg" />
                  <Link href={`/teams/${displayB.id}`} className="text-sm font-bold text-mtext hover:text-accent">
                    {displayB.name}
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-elevated p-3 ring-1 ring-lborder">
                  <p className="font-mono text-xl font-black text-accent">{tally.aWins}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stext">{displayA.abbr} wins</p>
                </div>
                <div className="rounded-xl bg-elevated p-3 ring-1 ring-lborder">
                  <p className="font-mono text-xl font-black text-stext">{tally.draws}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stext">Draws / NR</p>
                </div>
                <div className="rounded-xl bg-elevated p-3 ring-1 ring-lborder">
                  <p className="font-mono text-xl font-black text-accent">{tally.bWins}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-stext">{displayB.abbr} wins</p>
                </div>
              </div>

              {tally.total > 0 && (
                <div className="mt-4">
                  <div className="flex h-2 overflow-hidden rounded-full bg-elevated ring-1 ring-lborder">
                    <span className="bg-accent" style={{ width: `${aPct}%` }} />
                    <span className="bg-lborder" style={{ width: `${drawPct}%` }} />
                    <span className="bg-gold" style={{ width: `${bPct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-stext">
                    <span>
                      {displayA.abbr} {aPct}%
                    </span>
                    <span>
                      {displayB.abbr} {bPct}%
                    </span>
                  </div>
                </div>
              )}
            </section>

            {previous.length > 0 && (
              <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">Meeting report</h2>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-lborder text-xs font-bold uppercase tracking-wider text-stext">
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Fixture</th>
                        <th className="px-3 py-2">Tournament</th>
                        <th className="px-3 py-2">Venue</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previous.map((meeting) => (
                        <MeetingTableRow key={meeting.matchId || `${meeting.scheduled}-${meeting.teams.homeId}`} meeting={meeting} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">
                  {previous.map((meeting) => (
                    <MeetingCard key={meeting.matchId || `${meeting.scheduled}-${meeting.teams.homeId}`} meeting={meeting} />
                  ))}
                </ul>
              </section>
            )}

            {upcoming.length > 0 && (
              <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-stext">Upcoming</h2>
                <ul className="space-y-2">
                  {upcoming.map((meeting) => (
                    <MeetingCard key={meeting.matchId || `${meeting.scheduled}-${meeting.teams.homeId}`} meeting={meeting} />
                  ))}
                </ul>
              </section>
            )}
        </div>
      ) : null}
    </div>
  );
}

function MeetingTableRow({ meeting }: { meeting: ParsedMeeting }) {
  const label = `${meeting.teams.homeAbbr} vs ${meeting.teams.awayAbbr}`;
  const fixture = meeting.matchId ? (
    <Link href={`/matches/${meeting.matchId}`} prefetch={false} className="font-semibold text-mtext hover:text-accent">
      {label}
    </Link>
  ) : (
    <span className="font-semibold text-mtext">{label}</span>
  );

  return (
    <tr className="border-b border-lborder/70 hover:bg-[var(--color-row-hover)]">
      <td className="whitespace-nowrap px-3 py-2.5 text-stext">{formatH2HDate(meeting.scheduled) || 'TBD'}</td>
      <td className="px-3 py-2.5">{fixture}</td>
      <td className="px-3 py-2.5 text-stext">{meeting.tournament || 'Cricket'}</td>
      <td className="px-3 py-2.5 text-stext">{meeting.venue || '—'}</td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-mtext">{meeting.displayScore || '—'}</td>
      <td className="px-3 py-2.5 text-gold">{meeting.resultText || '—'}</td>
    </tr>
  );
}

function MeetingCard({ meeting }: { meeting: ParsedMeeting }) {
  const isUpcoming = isUpcomingMeeting(meeting);
  const label = `${meeting.teams.homeAbbr} vs ${meeting.teams.awayAbbr}`;
  const inner = (
    <div className="rounded-lg bg-elevated/60 px-3 py-2.5 ring-1 ring-lborder">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-mtext">{label}</p>
        {!isUpcoming && meeting.resultText ? (
          <p className="truncate text-xs text-gold">{meeting.resultText}</p>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stext">
        <span className="truncate">{meeting.tournament || 'Cricket'}</span>
        {meeting.venue ? (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {meeting.venue}
          </span>
        ) : null}
        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
          <Calendar size={11} />
          {formatH2HDate(meeting.scheduled) || 'TBD'}
        </span>
      </div>
      {!isUpcoming && meeting.displayScore ? (
        <p className="mt-1 font-mono text-xs text-mtext">{meeting.displayScore}</p>
      ) : null}
    </div>
  );

  return (
    <li>
      {meeting.matchId ? (
        <Link href={`/matches/${meeting.matchId}`} prefetch={false} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}
