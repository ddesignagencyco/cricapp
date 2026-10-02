'use client';

import ShareButton from './ShareButton';
import FavoriteButton from './FavoriteButton';

interface AuthorActionsProps {
  name: string;
  slug: string;
  /** Author id. Favourites must be keyed by id, not slug, or the heart state mismatches. */
  id?: string;
}

export default function AuthorActions({ name, slug, id }: AuthorActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {id ? <FavoriteButton targetType="author" targetId={id} compact /> : null}
      <ShareButton
        fallbackTitle={name}
        href={`/authors/${encodeURIComponent(slug)}`}
        compact
      />
    </div>
  );
}
