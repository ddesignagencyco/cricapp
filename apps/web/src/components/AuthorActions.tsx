'use client';

import ShareButton from './ShareButton';

export default function AuthorActions({ name, slug }: { name: string; slug: string }) {
  return (
    <ShareButton
      fallbackTitle={name}
      href={`/authors/${encodeURIComponent(slug)}`}
      compact
    />
  );
}
