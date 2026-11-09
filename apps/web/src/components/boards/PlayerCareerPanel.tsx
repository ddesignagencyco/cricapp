'use client';

import { useState } from 'react';
import Link from 'next/link';

interface StatTable {
  formats: string[];
  rows: Array<{ label: string; values: string[] }>;
}

interface RecentForm {
  headers: string[];
  rows: Array<{ matchId: string | null; values: string[] }>;
}

export interface CricbuzzPlayerExtras {
  bio?: string | null;
  birthPlace?: string | null;
  intlTeam?: string | null;
  clubs?: Array<{ id: string; name: string }>;
  rankings?: Record<string, Record<string, string>> | null;
  career?: Record<string, { debut?: string | null; lastPlayed?: string | null; debutMatchId?: string | null; lastMatchId?: string | null }>;
  batting?: StatTable | null;
  bowling?: StatTable | null;
  recentBatting?: RecentForm | null;
  recentBowling?: RecentForm | null;
  fetchedAt?: string | null;
}

/** The provider payload is stored as-is; read it defensively. */
export function readExtras(providerProfile: unknown): CricbuzzPlayerExtras | null {
  const x = (providerProfile as { cricbuzz?: unknown } | null)?.cricbuzz;
  return x && typeof x === 'object' ? (x as CricbuzzPlayerExtras) : null;
}

const FORMAT_LABEL: Record<string, string> = { t20: 'T20I', odi: 'ODI', test: 'Test', ipl: 'IPL', cl: 'Champions League' };

/** Ranking keys come as `t20BestRank` / `t20Rank` / `t20DiffRank`; only the current rank is shown. */
export function currentRankings(rankings: CricbuzzPlayerExtras['rankings']): Array<{ kind: string; format: string; rank: string }> {
  const out: Array<{ kind: string; format: string; rank: string }> = [];
  const kinds: Record<string, string> = { bat: 'Batting', bowl: 'Bowling', all: 'All-rounder' };
  for (const [kind, group] of Object.entries(rankings ?? {})) {
    for (const [key, rank] of Object.entries(group ?? {})) {
      const m = key.match(/^(t20|odi|test)Rank$/);
      if (m && rank) out.push({ kind: kinds[kind] ?? kind, format: FORMAT_LABEL[m[1]] ?? m[1], rank: String(rank) });
    }
  }
  return out;
}

/** Cut at a word boundary so a long biography does not push the page's real content off screen. */
export function truncateText(text: string, max = 320): { short: string; truncated: boolean } {
  const clean = text.trim();
  if (clean.length <= max) return { short: clean, truncated: false };
  const cut = clean.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return { short: `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.-]+$/, '')}…`, truncated: true };
}

function ReadMore({ text, max = 320 }: { text: string; max?: number }) {
  const [open, setOpen] = useState(false);
  const { short, truncated } = truncateText(text, max);
  return (
    <>
      <p className="text-sm leading-relaxed text-stext">{open || !truncated ? text : short}</p>
      {truncated && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-1.5 text-xs font-semibold text-accent hover:underline"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </>
  );
}

function ClubList({ clubs, initial = 8 }: { clubs: Array<{ id: string; name: string }>; initial?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? clubs : clubs.slice(0, initial);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {shown.map((c) => (
          <Link key={c.id} href={`/teams/${c.id}`} className="detail-chip hover:text-accent">{c.name}</Link>
        ))}
      </div>
      {clubs.length > initial && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          aria-expanded={all}
          className="mt-2 text-xs font-semibold text-accent hover:underline"
        >
          {all ? 'Show fewer' : `Show all ${clubs.length}`}
        </button>
      )}
    </>
  );
}

function StatsTable({ title, table }: { title: string; table: StatTable }) {
  return (
    <section className="detail-panel p-3 sm:p-4" aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-mtext">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm tabular-nums">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-stext">
              <th className="py-1 pr-3 font-semibold" />
              {table.formats.map((f) => (
                <th key={f} className="px-2 py-1 text-right font-semibold">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.label} className="border-t border-lborder">
                <th scope="row" className="py-1 pr-3 text-left font-medium text-stext">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i} className="px-2 py-1 text-right text-mtext">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RecentFormTable({ title, form }: { title: string; form: RecentForm }) {
  return (
    <section className="detail-panel p-3 sm:p-4" aria-label={title}>
      <h3 className="mb-2 text-sm font-semibold text-mtext">{title}</h3>
      <ul className="divide-y divide-lborder text-sm">
        {form.rows.map((r, i) => {
          const [result, opponent, format, date] = r.values;
          const body = (
            <>
              <span className="w-20 shrink-0 font-semibold tabular-nums text-mtext">{result}</span>
              <span className="min-w-0 flex-1 truncate text-stext">vs {opponent} · {format}</span>
              <span className="shrink-0 text-xs text-stext">{date}</span>
            </>
          );
          return (
            <li key={`${r.matchId}-${i}`}>
              {r.matchId ? (
                <Link href={`/matches/${r.matchId}`} className="flex items-center gap-2 py-1.5 hover:text-accent">{body}</Link>
              ) : (
                <div className="flex items-center gap-2 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function PlayerCareerPanel({ extras }: { extras: CricbuzzPlayerExtras }) {
  const ranks = currentRankings(extras.rankings);
  const formats = Object.entries(extras.career ?? {});
  const clubs = extras.clubs ?? [];
  const hasAnything =
    extras.bio || extras.birthPlace || ranks.length || formats.length || clubs.length || extras.batting || extras.bowling ||
    extras.recentBatting || extras.recentBowling;
  if (!hasAnything) return null;

  return (
    <div className="space-y-3">
      {extras.bio && (
        <section className="detail-panel p-3 sm:p-4" aria-label="Biography">
          <h3 className="mb-2 text-sm font-semibold text-mtext">Biography</h3>
          <ReadMore text={extras.bio} />
          {extras.birthPlace && <p className="mt-2 text-xs text-stext">Born in {extras.birthPlace}</p>}
        </section>
      )}

      {ranks.length > 0 && (
        <section className="flex flex-wrap gap-2" aria-label="ICC rankings">
          {ranks.map((r) => (
            <span key={`${r.kind}-${r.format}`} className="detail-chip">
              {r.kind} {r.format}: <span className="font-semibold text-accent">#{r.rank}</span>
            </span>
          ))}
        </section>
      )}

      {(extras.batting || extras.bowling) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {extras.batting && <StatsTable title="Career batting" table={extras.batting} />}
          {extras.bowling && <StatsTable title="Career bowling" table={extras.bowling} />}
        </div>
      )}

      {(extras.recentBatting?.rows.length || extras.recentBowling?.rows.length) ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {extras.recentBatting?.rows.length ? <RecentFormTable title="Recent batting" form={extras.recentBatting} /> : null}
          {extras.recentBowling?.rows.length ? <RecentFormTable title="Recent bowling" form={extras.recentBowling} /> : null}
        </div>
      ) : null}

      {formats.length > 0 && (
        <section className="detail-panel p-3 sm:p-4" aria-label="Debut and last match">
          <h3 className="mb-2 text-sm font-semibold text-mtext">Debut and last match</h3>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {formats.map(([key, f]) => (
              <div key={key}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-stext">{FORMAT_LABEL[key] ?? key}</dt>
                <dd className="text-mtext">
                  Debut:{' '}
                  {f.debutMatchId ? <Link href={`/matches/${f.debutMatchId}`} className="hover:text-accent">{f.debut}</Link> : f.debut}
                </dd>
                <dd className="text-stext">
                  Last:{' '}
                  {f.lastMatchId ? <Link href={`/matches/${f.lastMatchId}`} className="hover:text-accent">{f.lastPlayed}</Link> : f.lastPlayed}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {clubs.length > 0 && (
        <section className="detail-panel p-3 sm:p-4" aria-label="Teams played for">
          <h3 className="mb-2 text-sm font-semibold text-mtext">Teams played for</h3>
          <ClubList clubs={clubs} />
        </section>
      )}
    </div>
  );
}
