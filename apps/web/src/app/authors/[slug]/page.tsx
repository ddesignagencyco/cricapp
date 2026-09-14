import Link from 'next/link';
import { notFound } from 'next/navigation';
import EmptyState from '../../../components/EmptyState';
import RemoteImage from '../../../components/RemoteImage';
import NewsCopy from '../../../components/NewsCopy';
import { articlesForAuthor, authorsFromNews, fetchPublishedNewsPool } from '../../../services/authors';
import { sharePageMetadata } from '../../../services/sharing';
import { newsHref } from '../../../utils/newsConstraints';
import { getInitials } from '../../../utils/helpers';

function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 360);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await fetchPublishedNewsPool();
  const author = authorsFromNews(news).find((item) => item.slug === slug);
  return sharePageMetadata({
    title: author?.name || 'Author',
    description: author?.bio || `News by ${author?.name || 'this writer'} on PAK CRICZONE.`,
    path: `/authors/${slug}`,
  });
}

export default async function AuthorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await fetchPublishedNewsPool();
  const author = authorsFromNews(news).find((item) => item.slug === slug);
  if (!author) notFound();
  const articles = articlesForAuthor(news, slug);
  const initials = getInitials(author.name);
  const hue = avatarHue(author.name);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/authors" className="hover:text-accent">
          Authors
        </Link>
        <span>/</span>
        <span className="text-mtext">{author.name}</span>
      </nav>

      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {author.avatarUrl ? (
            <RemoteImage
              src={author.avatarUrl}
              alt={author.name}
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full border border-lborder bg-secondary object-cover"
            />
          ) : (
            <span
              className="grid h-20 w-20 shrink-0 place-items-center rounded-full text-xl font-semibold text-white"
              style={{
                backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
              }}
              aria-hidden="true"
            >
              {initials}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <span className="rounded border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-accent">
              Author
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-mtext">{author.name}</h1>
            {author.bio ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stext">{author.bio}</p> : null}
          </div>

          <div className="shrink-0 rounded-md border border-lborder bg-secondary px-5 py-3 text-center sm:min-w-28">
            <p className="text-2xl font-semibold tabular-nums text-mtext">{author.articleCount}</p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-stext">Published</p>
          </div>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-mtext">News</h2>
          <p className="text-xs text-stext">
            {articles.length} piece{articles.length === 1 ? '' : 's'}
          </p>
        </div>

        {articles.length === 0 ? (
          <EmptyState title="No news" message="This writer has no published news yet." />
        ) : (
          <ul className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id} className="min-h-0">
                <Link
                  href={newsHref(article)}
                  className="group flex h-full flex-col overflow-hidden rounded-md border border-lborder bg-card transition-colors hover:border-accent/50 hover:bg-elevated"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-secondary">
                    {article.image ? (
                      <RemoteImage
                        src={article.image}
                        alt={article.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="news-image object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 bg-secondary" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3.5">
                    <NewsCopy
                      as="p"
                      language={article.language}
                      text={article.title}
                      className="news-copy-card line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent"
                    >
                      {article.title}
                    </NewsCopy>
                    <span className="mt-auto pt-2 text-xs text-stext">{article.date}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
