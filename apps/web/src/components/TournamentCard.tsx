import Link from 'next/link';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { str } from '../utils/extract';
import { getInitials } from '../utils/helpers';
import type { TournamentApi } from '../types/index';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';
import EntityAvatar from './EntityAvatar';
import { directoryRowCard } from './ui/interaction';

export default function TournamentCard({ tournament }: { tournament: TournamentApi }) {
  const category = str(tournament.category) || 'International';
  const season = str(tournament.currentSeason);
  const rawFormat = str(tournament.type).toUpperCase();
  const format = rawFormat ? rawFormat.replace(/_/g, ' ') : 'CRICKET';
  const gender = tournament.gender || '';
  const href = `/tournaments/${tournament.id}`;
  const name = tournament.name || 'Tournament';
  const cs = tournament.currentSeason as Record<string, unknown> | undefined;
  const rawYear = cs?.year || cs?.name;
  const seasonYear =
    typeof rawYear === 'number'
      ? rawYear
      : typeof rawYear === 'string'
        ? (rawYear.match(/(19|20)\d{2}/) || [])[0] || null
        : null;

  return (
    <article className={directoryRowCard}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3">
        <EntityAvatar className="h-12 w-12 text-sm" title={name}>
          {getInitials(name)}
        </EntityAvatar>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent">
              {name}
            </h3>
            <span className="shrink-0 rounded border border-lborder bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stext">
              {format}
            </span>
          </div>
          <div className="mt-1 flex min-w-0 flex-nowrap items-center gap-x-3 text-xs text-stext">
            <span className="flex min-w-0 flex-1 items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">
                {category}
                {gender ? ` · ${gender}` : ''}
              </span>
            </span>
            {(seasonYear || season) ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Calendar size={11} />
                {seasonYear || season}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <FavoriteButton targetType="tournament" targetId={tournament.id} compact />
        <ShareButton
          type="tournament"
          id={tournament.id}
          fallbackTitle={name}
          href={`/tournaments/${encodeURIComponent(tournament.id)}`}
          compact
        />
        <Link href={href} className="grid h-8 w-8 place-items-center text-stext transition-colors group-hover:text-accent" aria-label="View tournament">
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
