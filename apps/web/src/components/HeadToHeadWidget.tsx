'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Swords } from 'lucide-react';
import { HeadToHead } from '../types/index';
import { formatH2HDate, isUpcomingMeeting, parseH2H, tallyH2H, type ParsedMeeting } from '../lib/headToHead';
import { encodeEntityId } from '../utils/entityId';

interface Props {
  data: HeadToHead | null;
}

export default function HeadToHeadWidget({ data }: Props) {
  const { meetings, teamA, teamB } = useMemo(() => parseH2H(data), [data]);

  const previous = meetings.filter((m) => !isUpcomingMeeting(m));
  const upcoming = meetings.filter((m) => isUpcomingMeeting(m));

  const tally = useMemo(
    () => tallyH2H(previous, teamA.id, teamB.id),
    [previous, teamA.id, teamB.id]
  );

  if (!meetings.length) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
        <div className="mb-3 flex items-center gap-2">
          <Swords size={16} className="text-accent" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-stext">Head to Head</h3>
        </div>
        <p className="text-sm text-stext">No head-to-head records available for this fixture yet.</p>
      </div>
    );
  }

  const compareHref =
    teamA.id && teamB.id
      ? `/teams?a=${encodeEntityId(teamA.id)}&b=${encodeEntityId(teamB.id)}#compare-teams`
      : '';

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <div className="mb-4 flex items-center gap-2">
        <Swords size={16} className="text-accent" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-stext">Head to Head</h3>
        {compareHref ? (
          <Link href={compareHref} className="ml-auto text-xs font-semibold text-accent hover:underline">
            Full compare
          </Link>
        ) : null}
      </div>

      <div className="grid grid-cols-5 items-center gap-2 rounded-xl bg-elevated p-4 ring-1 ring-lborder">
        <div className="col-span-2 text-center">
          <Link href={`/teams/${teamA.id}`} className="text-sm font-bold text-mtext hover:text-accent">
            {teamA.name}
          </Link>
        </div>
        <div className="col-span-1 text-center">
          <p className="font-mono text-2xl font-black text-mtext">{tally.total}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">meetings</p>
        </div>
        <div className="col-span-2 text-center">
          <Link href={`/teams/${teamB.id}`} className="text-sm font-bold text-mtext hover:text-accent">
            {teamB.name}
          </Link>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="font-mono text-xl font-black text-accent">{tally.aWins}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">{teamA.abbr} wins</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="font-mono text-xl font-black text-stext">{tally.draws}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">Draws / NR</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="font-mono text-xl font-black text-accent">{tally.bWins}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">{teamB.abbr} wins</p>
        </div>
      </div>

      {previous.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">Recent Meetings</p>
          <ul className="space-y-2">
            {previous.slice(0, 6).map((m) => (
              <MeetingRow key={m.matchId || `${m.scheduled}-${m.teams.homeId}`} meeting={m} />
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">Upcoming</p>
          <ul className="space-y-2">
            {upcoming.slice(0, 3).map((m) => (
              <MeetingRow key={m.matchId || `${m.scheduled}-${m.teams.homeId}`} meeting={m} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: ParsedMeeting }) {
  const isUpcoming = isUpcomingMeeting(meeting);
  const label = `${meeting.teams.homeAbbr} vs ${meeting.teams.awayAbbr}`;

  const inner = (
    <div className="rounded-lg bg-elevated/60 px-3 py-2.5 ring-1 ring-lborder">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-mtext">{label}</p>
        {!isUpcoming && meeting.resultText && (
          <p className="truncate text-xs text-gold">{meeting.resultText}</p>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-stext">
        <span className="truncate">{meeting.tournament || 'Cricket'}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Calendar size={11} />
          {formatH2HDate(meeting.scheduled) || 'TBD'}
        </span>
      </div>
    </div>
  );

  return (
    <li>
      {meeting.matchId ? (
        <Link href={`/matches/${meeting.matchId}`} prefetch={false} className="block group">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}
