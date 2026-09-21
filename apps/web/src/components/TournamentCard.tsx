import Link from 'next/link';
import { Calendar, ChevronRight, MapPin, Trophy } from 'lucide-react';
import { str } from '../utils/extract';
import type { TournamentApi } from '../types/index';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';

function hueFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

export default function TournamentCard({ tournament }: { tournament: TournamentApi }) {
  const category = str(tournament.category) || 'International';
  const season = str(tournament.currentSeason);
  const rawFormat = str(tournament.type).toUpperCase();
  const format = rawFormat ? rawFormat.replace(/_/g, ' ') : 'CRICKET';
  const gender = tournament.gender || '';
  const href = `/tournaments/${tournament.id}`;
  const hue = hueFromName(tournament.name || category);
  const cs = tournament.currentSeason as Record<string, unknown> | undefined;
  const rawYear = cs?.year || cs?.name;
  const seasonYear =
    typeof rawYear === 'number'
      ? rawYear
      : typeof rawYear === 'string'
        ? (rawYear.match(/(19|20)\d{2}/) || [])[0] || null
        : null;

  return (
    <article className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-4 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
      <Link href={href} className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md text-white"
            style={{
              backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
            }}
            aria-hidden="true"
          >
            <Trophy size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent">
              {tournament.name}
            </h3>
            <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-stext">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">
                {category}
                {gender ? ` · ${gender}` : ''}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-lborder bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stext">
            {format}
          </span>
          {(seasonYear || season) ? (
            <span className="inline-flex items-center gap-1 text-xs text-stext">
              <Calendar size={11} />
              {seasonYear || season}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-lborder pt-3">
        <div className="flex items-center gap-1">
          <FavoriteButton targetType="tournament" targetId={tournament.id} compact />
          <ShareButton
            type="tournament"
            id={tournament.id}
            fallbackTitle={tournament.name}
            href={`/tournaments/${encodeURIComponent(tournament.id)}`}
            compact
          />
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
          View
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
