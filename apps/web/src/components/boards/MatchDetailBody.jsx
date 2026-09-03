'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, ChevronDown, Clock, MapPin, Users } from 'lucide-react';
import ScoreBoard from '../ScoreBoard';
import ScorecardTable from '../ScorecardTable';
import BallTracker from '../BallTracker';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import Tabs from '../Tabs';
import TeamLogo from '../TeamLogo';
import EmptyState from '../EmptyState';
import ShareButton from '../ShareButton';
import OverTimeline from '../OverTimeline';
import { formatDate, formatTime, mapBatting, mapBowling } from '../../utils/helpers.js';

const detailTabs = [
  { key: 'live', label: 'Live Score', icon: Users },
  { key: 'scorecard', label: 'Scorecard', icon: BarChart3 },
  { key: 'info', label: 'Match Info', icon: MapPin },
];

export default function MatchDetailBody({ match }) {
  const [tab, setTab] = useState('live');
  const [openOver, setOpenOver] = useState(null);

  if (!match) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Match not found" message="We couldn't find that match. It may have been moved or removed." />
      </div>
    );
  }

  const { home, away } = match.teams;
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/matches" className="hover:text-accent">Matches</Link>
        <span>/</span>
        <span className="text-mtext">{match.tournamentName}</span>
      </nav>

      <header className="rounded-3xl bg-card p-6 ring-1 ring-lborder">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="upcoming">{match.tournamentName || 'Match'}</Badge>
            <Badge tone="neutral">Match {match.matchNumber}</Badge>
            <span className="text-xs text-stext">{match.group}</span>
          </div>
          <div className="flex items-center gap-2">
            <ShareButton
              title={`${home.name} vs ${away.name}`}
              text={match.result || `${match.tournamentName} — Match ${match.matchNumber}`}
            />
            {isLive ? (
              <LiveIndicator />
            ) : isUpcoming ? (
              <Badge tone="upcoming">Upcoming</Badge>
            ) : (
              <Badge tone="completed">Completed</Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <TeamLogo teamId={home.teamId} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-mtext sm:text-lg">{home.name}</p>
              {!isUpcoming ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black tabular-nums text-mtext sm:text-3xl">
                    {home.score || '—'}
                  </span>
                  {home.overs && <span className="font-mono text-xs text-stext">{home.overs} ov</span>}
                </div>
              ) : (
                <p className="text-sm text-stext">{home.code}</p>
              )}
            </div>
          </div>

          <div className="hidden rounded-full bg-elevated px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-stext sm:block">
            vs
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-4 text-right">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-mtext sm:text-lg">{away.name}</p>
              {!isUpcoming ? (
                <div className="flex items-baseline justify-end gap-2">
                  <span className="font-mono text-2xl font-black tabular-nums text-mtext sm:text-3xl">
                    {away.score || '—'}
                  </span>
                  {away.overs && <span className="font-mono text-xs text-stext">{away.overs} ov</span>}
                </div>
              ) : (
                <p className="text-sm text-stext">{away.code}</p>
              )}
            </div>
            <TeamLogo teamId={away.teamId} size="lg" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-lborder pt-4 text-xs text-stext">
          <span className="flex items-center gap-1.5">
            <Calendar size={14} /> {formatDate(match.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} /> {formatTime(match.time)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} /> {match.venue}
          </span>
        </div>

        {!isUpcoming && (match.result || match.toss) && (
          <div className="mt-4 flex flex-col gap-1.5 rounded-xl bg-elevated/60 px-4 py-3">
            {match.result && (
              <p className="text-sm font-bold text-accent2">{match.result}</p>
            )}
            {match.toss && <p className="text-xs text-stext">{match.toss}</p>}
          </div>
        )}
      </header>

      <div className="mt-6">
        <Tabs tabs={detailTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'live' && (
        <div className="fade-in space-y-6 pt-5">
          {isLive ? (
            <>
              <ScoreBoard match={match} />
              {match.overSummary?.length > 0 && <OverTimeline overs={match.overSummary} />}
            </>
          ) : isUpcoming ? (
            <EmptyState
              title="This match hasn't started yet"
              message={`The match kicks off on ${formatDate(match.date)} at ${formatTime(match.time)} at ${match.venue}.`}
            />
          ) : (
            <EmptyState
              title="Match completed"
              message={match.result || 'This match has finished and the scorecard is available in the Scorecard tab.'}
            />
          )}
        </div>
      )}

      {tab === 'scorecard' && (
        <div className="fade-in space-y-8 pt-5">
          {match.firstInnings ? (
            <>
              <InningsSection
                title={`${match.firstInnings.teamName} Innings`}
                score={match.firstInnings.score}
                overs={match.firstInnings.overs}
                batting={mapBatting(match.firstInnings.battingScorecard)}
                bowling={mapBowling(match.firstInnings.bowlingScorecard)}
                fallOfWickets={match.firstInnings.fallOfWickets}
                partnerships={match.firstInnings.partnerships}
              />
              <InningsSection
                title={`${home.name} Innings`}
                score={home.score}
                overs={home.overs}
                batting={mapBatting(match.battingScorecard)}
                bowling={mapBowling(match.bowlingScorecard)}
                fallOfWickets={match.fallOfWickets}
                partnerships={match.partnerships}
              />
            </>
          ) : match.battingScorecard?.length ? (
            <InningsSection
              title={`${home.name} Innings`}
              score={home.score}
              overs={home.overs}
              batting={mapBatting(match.battingScorecard)}
              bowling={mapBowling(match.bowlingScorecard)}
              fallOfWickets={match.fallOfWickets}
              partnerships={match.partnerships}
            />
          ) : (
            <EmptyState
              title="Scorecard not available"
              message="Full batting and bowling details will appear once the match begins."
            />
          )}

          {match.overSummary?.length > 0 && (
            <section>
              <h3 className="mb-4 text-lg font-bold text-mtext">Over Summary</h3>
              <div className="space-y-2">
                {match.overSummary.map((o, idx) => {
                  const isOpen = openOver === idx;
                  return (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenOver(isOpen ? null : idx)}
                        className="flex w-full items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-elevated/60"
                      >
                        <span className="flex items-center gap-3">
                          <span className="font-mono font-bold text-accent">Over {o.over}</span>
                          <span className="rounded bg-elevated px-2 py-0.5 text-xs text-stext">{o.team}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-xs text-stext">
                            {o.runs} runs{Number(o.wickets) > 0 ? ` • ${o.wickets} wkts` : ''}
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-stext transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </span>
                      </button>
                      {isOpen && (
                        <div className="border-t border-lborder px-4 py-4">
                          <BallTracker balls={o.balls} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {match.overSummary?.length > 0 && <OverTimeline overs={match.overSummary} />}
        </div>
      )}

      {tab === 'info' && (
        <div className="fade-in pt-5">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Match Details</h3>
              <InfoRow label="Tournament" value={match.tournamentName} />
              <InfoRow label="Match" value={`Match ${match.matchNumber} • ${match.group}`} />
              <InfoRow label="Date" value={`${formatDate(match.date)} at ${formatTime(match.time)}`} />
              <InfoRow label="Venue" value={match.venue} />
              <InfoRow label="Status" value={match.status} cap />
            </div>
            <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">Teams</h3>
              <InfoRow label="Home" value={`${home.name} (${home.code})`} />
              <InfoRow label="Away" value={`${away.name} (${away.code})`} />
              {match.result && <InfoRow label="Result" value={match.result} gold />}
              {match.toss && <InfoRow label="Toss" value={match.toss} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InningsSection({ title, score, overs, batting, bowling, fallOfWickets, partnerships }) {
  const [openSub, setOpenSub] = useState('batting');
  return (
    <section className="rounded-3xl bg-secondary p-5 ring-1 ring-lborder">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-mtext">{title}</h3>
        {score && (
          <p className="font-mono text-lg font-bold tabular-nums text-mtext">
            {score} <span className="text-xs font-medium text-stext">{overs} ov</span>
          </p>
        )}
      </div>

      <Tabs
        size="sm"
        tabs={[
          { key: 'batting', label: 'Batting' },
          { key: 'bowling', label: 'Bowling' },
          { key: 'fow', label: 'Fall of Wickets' },
          { key: 'partnerships', label: 'Partnerships' },
        ]}
        active={openSub}
        onChange={setOpenSub}
      />

      <div className="mt-4">
        {openSub === 'batting' && <ScorecardTable kind="batting" data={batting} />}
        {openSub === 'bowling' && <ScorecardTable kind="bowling" data={bowling} />}
        {openSub === 'fow' && <FoWTable wickets={fallOfWickets} />}
        {openSub === 'partnerships' && <PartnershipTable rows={partnerships} />}
      </div>
    </section>
  );
}

function InfoRow({ label, value, gold = false, cap = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-lborder/60 px-1 py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wider text-stext">{label}</span>
      <span className={`text-right text-sm font-semibold ${gold ? 'text-gold' : cap ? 'capitalize text-mtext' : 'text-mtext'}`}>
        {value}
      </span>
    </div>
  );
}

function FoWTable({ wickets }) {
  if (!wickets?.length) {
    return <p className="rounded-xl bg-card px-4 py-6 text-center text-sm text-stext">No wickets have fallen yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
            <th className="px-4 py-3">Wicket</th>
            <th className="px-4 py-3">Batter</th>
            <th className="px-4 py-3 text-right">Score</th>
            <th className="px-4 py-3 text-right">Over</th>
          </tr>
        </thead>
        <tbody>
          {wickets.map((w) => (
            <tr key={w.wicket} className="border-b border-lborder/60 last:border-0">
              <td className="px-4 py-2.5 font-mono text-stext">W-{w.wicket}</td>
              <td className="px-4 py-2.5 font-semibold text-mtext">{w.batsman}</td>
              <td className="px-4 py-2.5 text-right font-mono text-stext">{w.score}</td>
              <td className="px-4 py-2.5 text-right font-mono text-stext">{w.over}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PartnershipTable({ rows }) {
  if (!rows?.length) {
    return <p className="rounded-xl bg-card px-4 py-6 text-center text-sm text-stext">No partnerships recorded yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead>
          <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
            <th className="px-4 py-3">Partnership</th>
            <th className="px-4 py-3 text-right">Runs</th>
            <th className="px-4 py-3 text-right">Balls</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-lborder/60 last:border-0">
              <td className="px-4 py-2.5 font-semibold text-mtext">{r.batsmen}</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold text-mtext">{r.runs}</td>
              <td className="px-4 py-2.5 text-right font-mono text-stext">{r.balls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}