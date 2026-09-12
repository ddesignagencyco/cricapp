import Link from 'next/link';
import { notFound } from 'next/navigation';
import EmptyState from '../../../components/EmptyState';
import RemoteImage from '../../../components/RemoteImage';
import { articlesForAuthor, authorsFromNews, fetchPublishedNewsPool } from '../../../services/authors';
import { sharePageMetadata } from '../../../services/sharing';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return sharePageMetadata({
    title: 'Author',
    description: 'Editorial profile from the PAK CRICZONE newsroom.',
    path: `/authors/${slug}`,
  });
}

export default async function AuthorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await fetchPublishedNewsPool();
  const author = authorsFromNews(news).find((item) => item.slug === slug);
  if (!author) notFound();
  const articles = articlesForAuthor(news, slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link href="/authors" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent2">
        ← All authors
      </Link>

      <header className="mt-6 flex gap-4 rounded-md border border-lborder bg-card p-5">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
          {author.avatarUrl ? (
            <RemoteImage src={author.avatarUrl} alt={author.name} fill sizes="64px" className="object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center text-lg font-bold text-accent">
              {author.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-stext">Author</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext">{author.name}</h1>
          {author.bio && <p className="mt-2 max-w-2xl text-sm text-stext">{author.bio}</p>}
          <p className="mt-2 text-xs text-stext">
            {author.articleCount} published stor{author.articleCount === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-mtext">Stories</h2>
        {articles.length === 0 ? (
          <EmptyState title="No stories" message="This byline has no published articles yet." />
        ) : (
          <ul className="divide-y divide-lborder rounded-md border border-lborder bg-card">
            {articles.map((article) => (
              <li key={article.id}>
                <Link href={`/news/${article.slug || article.id}`} className="flex gap-3 px-4 py-3 hover:bg-elevated">
                  {article.image && (
                    <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm">
                      <RemoteImage src={article.image} alt={article.title} fill sizes="80px" className="object-cover" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block font-semibold text-mtext">{article.title}</span>
                    <span className="mt-1 block text-xs text-stext">{article.date}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
