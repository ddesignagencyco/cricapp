import Link from 'next/link';
import EmptyState from '../../components/EmptyState';
import RemoteImage from '../../components/RemoteImage';
import { authorsFromNews, fetchPublishedNewsPool } from '../../services/authors';

export const metadata = {
  title: 'Authors',
  description: 'Editorial bylines from the PAK CRICZONE newsroom.',
};

export default async function AuthorsPage() {
  const news = await fetchPublishedNewsPool();
  const authors = authorsFromNews(news);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-stext">Newsroom</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">Authors</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          Writers attached to published stories. There is no public authors API, so this list is built from news bylines.
        </p>
      </header>

      {authors.length === 0 ? (
        <EmptyState title="No authors yet" message="Published articles with a byline will appear here." />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <li key={author.slug}>
              <Link
                href={`/authors/${author.slug}`}
                className="flex gap-3 rounded-md border border-lborder bg-card p-4 transition-colors hover:border-accent/40"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {author.avatarUrl ? (
                    <RemoteImage src={author.avatarUrl} alt={author.name} fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-sm font-bold text-accent">
                      {author.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-mtext">{author.name}</span>
                  <span className="mt-0.5 block text-xs text-stext">
                    {author.articleCount} stor{author.articleCount === 1 ? 'y' : 'ies'}
                  </span>
                  {author.bio && <span className="mt-1 block line-clamp-2 text-xs text-stext">{author.bio}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
