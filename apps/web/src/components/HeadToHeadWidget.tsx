'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, Swords } from 'lucide-react';
import { HeadToHead } from '../types/index';

function getEventTeams(event: any): { homeId: string; homeName: string; homeAbbr: string; awayId: string; awayName: string; awayAbbr: string } {
  const comps = event?.competitors || [];
  const home = comps.find((c: any) => c.qualifier === 'home') || comps[0] || {};
  const away = comps.find((c: any) => c.qualifier === 'away') || comps[1] || {};
  return {
    homeId: home.id || '',
    homeName: home.name || 'TBD',
    homeAbbr: home.abbreviation || home.id?.slice(-3) || '??',
    awayId: away.id || '',
    awayName: away.name || 'TBD',
    awayAbbr: away.abbreviation || away.id?.slice(-3) || '??',
  };
}

function formatScheduled(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ParsedMeeting {
  matchId: string;
  teams: { homeId: string; homeName: string; homeAbbr: string; awayId: string; awayName: string; awayAbbr: string };
  scheduled?: string;
  tournament?: string;
  venue?: string;
  winnerId?: string;
  displayScore?: string;
  resultText?: string;
  status: string;
}

function parseH2H(data: HeadToHead | null): {
  meetings: ParsedMeeting[];
  teamA: { id: string; name: string; abbr: string };
  teamB: { id: string; name: string; abbr: string };
} {
  const empty = { meetings: [], teamA: { id: '', name: '', abbr: '' }, teamB: { id: '', name: '', abbr: '' } };
  if (!data || !data.payload) return empty;

  const payload = data.payload;
  const comps = payload.competitors || [];
  const teamA = comps.find((c: any) => c.id === data.teamAId) || comps[0] || {};
  const teamB = comps.find((c: any) => c.id === data.teamBId) || comps[1] || {};

  const meetings: ParsedMeeting[] = [];

  const last = payload.last_meetings || [];
  for (const item of last) {
    const event = item?.sport_event || item;
    const statusBlock = item?.sport_event_status || {};
    const t = getEventTeams(event);
    meetings.push({
      matchId: event.id || '',
      teams: t,
      scheduled: event.scheduled,
      tournament: event.tournament?.name,
      venue: event.venue?.name,
      winnerId: statusBlock.winner_id,
      displayScore: statusBlock.display_score,
      resultText: statusBlock.match_result_text,
      status: statusBlock.status || event.status || 'closed',
    });
  }

  const next = payload.next_meetings || [];
  for (const event of next) {
    const t = getEventTeams(event);
    meetings.push({
      matchId: event.id || '',
      teams: t,
      scheduled: event.scheduled,
      tournament: event.tournament?.name,
      venue: event.venue?.name,
      status: event.status || 'not_started',
    });
  }

  meetings.sort((a, b) => {
    const ta = a.scheduled ? new Date(a.scheduled).getTime() : 0;
    const tb = b.scheduled ? new Date(b.scheduled).getTime() : 0;
    return tb - ta;
  });

  return {
    meetings,
    teamA: { id: teamA.id || data.teamAId || '', name: teamA.name || 'Team A', abbr: teamA.abbreviation || teamA.id?.slice(-3) || 'A' },
    teamB: { id: teamB.id || data.teamBId || '', name: teamB.name || 'Team B', abbr: teamB.abbreviation || teamB.id?.slice(-3) || 'B' },
  };
}

interface Props {
  data: HeadToHead | null;
}

export default function HeadToHeadWidget({ data }: Props) {
  const { meetings, teamA, teamB } = useMemo(() => parseH2H(data), [data]);

  const previous = meetings.filter((m) => m.status && m.status !== 'not_started');
  const upcoming = meetings.filter((m) => !m.status || m.status === 'not_started');

  const tally = useMemo(() => {
    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    previous.forEach((m) => {
      if (!m.winnerId) {
        draws += 1;
      } else if (m.winnerId === teamA.id) {
        aWins += 1;
      } else if (m.winnerId === teamB.id) {
        bWins += 1;
      } else {
        draws += 1;
      }
    });
    return { aWins, bWins, draws, total: previous.length };
  }, [previous, teamA.id, teamB.id]);

  if (!meetings.length) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
        <div className="mb-3 flex items-center gap-2">
          <Swords size={16} className="text-accent2" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-stext">Head to Head</h3>
        </div>
        <p className="text-sm text-stext">No head-to-head records available for this fixture yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <div className="mb-4 flex items-center gap-2">
        <Swords size={16} className="text-accent2" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-stext">Head to Head</h3>
      </div>

      <div className="grid grid-cols-5 items-center gap-2 rounded-xl bg-elevated p-4 ring-1 ring-lborder">
        <div className="col-span-2 text-center">
          <Link href={`/teams/${teamA.id}`} className="text-sm font-bold text-mtext hover:text-accent">
            {teamA.name}
          </Link>
        </div>
        <div className="col-span-1 text-center">
          <p className="font-mono text-2xl font-black text-mtext">{tally.total}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stext">meetings</p>
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
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stext">{teamA.abbr} wins</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="font-mono text-xl font-black text-stext">{tally.draws}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stext">Draws / NR</p>
        </div>
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="font-mono text-xl font-black text-accent2">{tally.bWins}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stext">{teamB.abbr} wins</p>
        </div>
      </div>

      {previous.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stext">Recent Meetings</p>
          <ul className="space-y-2">
            {previous.slice(0, 6).map((m) => (
              <MeetingRow key={m.matchId} meeting={m} />
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-stext">Upcoming</p>
          <ul className="space-y-2">
            {upcoming.slice(0, 3).map((m) => (
              <MeetingRow key={m.matchId} meeting={m} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MeetingRow({ meeting }: { meeting: ParsedMeeting }) {
  const isUpcoming = !meeting.status || meeting.status === 'not_started';
  const label = `${meeting.teams.homeAbbr} vs ${meeting.teams.awayAbbr}`;

  const body = (
    <li className="rounded-lg bg-elevated/60 px-3 py-2.5 ring-1 ring-lborder">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-mtext">{label}</p>
        {!isUpcoming && meeting.resultText && (
          <p className="truncate text-[11px] text-gold">{meeting.resultText}</p>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-stext">
        <span className="truncate">{meeting.tournament || 'Cricket'}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Calendar size={11} />
          {formatScheduled(meeting.scheduled) || 'TBD'}
        </span>
      </div>
    </li>
  );

  if (meeting.matchId) {
    return (
      <Link key={meeting.matchId} href={`/matches/${meeting.matchId}`} className="block group">
        {body}
      </Link>
    );
  }
  return body;
}
