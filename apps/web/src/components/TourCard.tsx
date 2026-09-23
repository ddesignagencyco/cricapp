import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import { str } from '../utils/extract';
import { getInitials } from '../utils/helpers';
import type { Tour } from '../types/index';
import FavoriteButton from './FavoriteButton';
import ShareButton from './ShareButton';
import EntityAvatar from './EntityAvatar';

export default function TourCard({ tour }: { tour: Tour }) {
  const country = str(tour.category) || 'International';
  const sport = str(tour.sport) || 'Cricket';
  const code =
    typeof tour.category === 'object' && tour.category?.country_code ? String(tour.category.country_code) : '';
  const href = `/tournaments?country=${encodeURIComponent(country)}`;
  const name = tour.name || 'Tour';

  return (
    <article className="card-interactive group flex items-center gap-3 rounded-md p-3.5">
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
              {sport}
            </span>
          </div>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-stext">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{country}</span>
            {code ? <span className="shrink-0 font-mono uppercase">{code}</span> : null}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-1">
        <FavoriteButton targetType="tour" targetId={tour.id} compact />
        <ShareButton type="tour" id={tour.id} fallbackTitle={name} href={href} compact />
        <Link href={href} className="grid h-8 w-8 place-items-center text-stext transition-colors group-hover:text-accent" aria-label="View series">
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
