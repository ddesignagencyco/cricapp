'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Clock, Newspaper, Tag, User } from 'lucide-react';
import Badge from '../Badge';
import DummyAd from '../advertisements/DummyAd';
import RemoteImage from '../RemoteImage';
import ShareButton from '../ShareButton';
import FavoriteButton from '../FavoriteButton';
import CommentsSection from '../CommentsSection';
import { sanitizeArticleHtml } from '../../utils/sanitizeHtml';
import NewsCopy from '../NewsCopy';
import { newsLocale } from '../../utils/locale';
import { newsHref } from '../../utils/newsConstraints';

/**
 * Splits already-sanitized article HTML after four paragraphs
 * so an in-article advertisement can sit inside longer stories.
 * Short articles are left whole.
 */
function splitAtParagraph(html: string): [string, string] {
  const parts = html.split('</p>');
  if (parts.length < 5) return [html, ''];
  const cut = 4;
  return [`${parts.slice(0, cut).join('</p>')}</p>`, parts.slice(cut).join('</p>')];
}

const proseClass = `prose prose-sm max-w-none text-base leading-8 text-mtext tiptap-content
  prose-p:my-4 prose-p:leading-8
  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
  prose-strong:text-mtext prose-strong:font-semibold
  prose-em:italic
  prose-blockquote:border-s-accent prose-blockquote:ps-4 prose-blockquote:italic prose-blockquote:text-stext
  prose-img:my-6 prose-img:rounded-xl prose-img:h-auto prose-img:w-full prose-img:object-contain
  prose-headings:text-mtext prose-headings:font-bold
  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
  prose-ul:my-4 prose-ol:my-4
  prose-li:my-1
  prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
  prose-pre:bg-secondary prose-pre:p-4 prose-pre:rounded-xl
  prose-hr:border-lborder prose-hr:my-8`;

const categoryTone: Record<string, string> = {
  'Match Report': 'live',
  'PSL News': 'upcoming',
  'Team News': 'neutral',
  International: 'neutral',
  Statistics: 'gold',
};

interface RelatedLink {
  href: string;
  label: string;
}

interface Props {
  item: any;
  related?: any[];
  authorHref?: string;
  relatedLinks?: RelatedLink[];
}

export default function NewsDetailBody({ item, related = [], authorHref, relatedLinks = [] }: Props) {
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Newspaper size={40} className="mx-auto text-stext" />
        <h1 className="mt-4 text-2xl font-bold text-mtext">Article not found</h1>
        <p className="mt-2 text-sm text-stext">We couldn&apos;t find that article. It may have been moved or removed.</p>
        <Link href="/news" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
          <ArrowLeft size={14} /> Back to all news
        </Link>
      </div>
    );
  }
  const locale = newsLocale(item.language, item.title);
  const safeContent = sanitizeArticleHtml(item.content || '');
  const [contentBeforeAd, contentAfterAd] = splitAtParagraph(safeContent);

  const categoryName = typeof item.category === 'string'
    ? item.category
    : (item.category && typeof item.category === 'object' && 'name' in item.category ? String((item.category as any).name) : '');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stext" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-accent">Home</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-accent">News</Link>
        <span>/</span>
        <NewsCopy as="span" language={item.language} text={item.title} className="font-medium text-mtext">
          {item.title}
        </NewsCopy>
      </nav>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <article className="min-w-0">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {categoryName && (
                <Badge tone={categoryTone[categoryName] || 'neutral'}>{categoryName}</Badge>
              )}
              {Array.isArray(item.tags) && item.tags.slice(0, 3).map((t: string) => (
                <Badge key={t} tone="neutral">{t}</Badge>
              ))}
            </div>
            <NewsCopy
              as="h1"
              language={item.language}
              text={item.title}
              className={locale.lang === 'ur'
                ? 'mt-4 text-[1.375rem] font-semibold leading-[1.8] text-mtext sm:text-[1.625rem]'
                : 'mt-4 text-3xl font-black leading-tight tracking-tight text-mtext sm:text-5xl'}
            >
              {item.title}
            </NewsCopy>
            {item.excerpt && (
              <NewsCopy
                language={item.language}
                text={item.excerpt}
                className={locale.lang === 'ur'
                  ? 'mt-4 max-w-3xl text-[0.9375rem] leading-[2.4] text-stext'
                  : 'mt-4 max-w-3xl text-base leading-relaxed text-stext sm:text-lg'}
              >
                {item.excerpt}
              </NewsCopy>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-lborder pb-6 text-xs text-stext">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-accent" />
                {authorHref ? (
                  <Link href={authorHref} className="font-semibold text-accent">
                    {item.author}
                  </Link>
                ) : (
                  item.author
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {item.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {item.readTime}
              </span>
              <span className="ms-auto inline-flex items-center gap-2">
                <FavoriteButton targetType="news" targetId={String(item.id)} compact />
                <ShareButton type="news" id={String(item.slug || item.id)} fallbackTitle={item.title} compact />
              </span>
            </div>
          </header>

          <div className={`overflow-hidden rounded-3xl ${item.image ? 'bg-secondary' : 'media-fallback relative h-56 sm:h-80'}`}>
            {item.image ? (
              <RemoteImage
                src={item.image}
                alt={item.title}
                width={1600}
                height={900}
                sizes="(min-width: 1024px) 70vw, 100vw"
                fit="contain"
                className="news-image h-auto w-full"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Newspaper size={72} className="text-stext/40" />
              </div>
            )}
          </div>

          <div className="mt-10">
            <div
              className={`${proseClass} news-copy`}
              dir={locale.dir}
              lang={locale.lang}
              dangerouslySetInnerHTML={{ __html: contentBeforeAd }}
            />

            {contentAfterAd && (
              <>
                <div className="my-8 flex justify-center">
                  <DummyAd size="large-rectangle" placement="news-detail-inarticle" />
                </div>
                <div
                  className={`${proseClass} news-copy`}
                  dir={locale.dir}
                  lang={locale.lang}
                  dangerouslySetInnerHTML={{ __html: contentAfterAd }}
                />
              </>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-lborder pt-6">
              <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <ArrowLeft size={15} /> Back to all news
              </Link>
              <span className="flex items-center gap-1.5 text-xs text-stext">
                <Newspaper size={14} /> PAK CRICZONE Newsroom
              </span>
            </div>

            {relatedLinks.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-stext">Related</p>
                <div className="flex flex-wrap gap-2">
                  {relatedLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-mtext ring-1 ring-lborder transition-colors hover:bg-accent/10 hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Tag size={14} className="text-stext" />
                {item.tags.map((t: string) => (
                  <Link
                    key={t}
                    href={`/news?tag=${encodeURIComponent(t)}`}
                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-mtext ring-1 ring-lborder transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}

          </div>
        </article>

        <aside className="min-w-0 lg:sticky lg:top-16 lg:z-10 lg:self-start">
          <div className="space-y-8 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
            <div className="flex justify-center lg:justify-start">
              <DummyAd size="medium-rectangle" placement="news-detail-sidebar" />
            </div>

            {related.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mtext">
                    More News
                  </h2>
                  <Link href="/news" className="flex items-center gap-1 text-xs font-semibold text-accent">
                    All <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="space-y-4">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      href={newsHref(a)}
                      className="group flex gap-3"
                    >
                      <div
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-sm bg-secondary ring-1 ring-lborder ${
                          a.image ? '' : 'media-fallback'
                        }`}
                      >
                        {a.image && (
                          <RemoteImage
                            src={a.image}
                            alt={a.title}
                            fill
                            sizes="80px"
                            fit="contain"
                            className="news-image"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <NewsCopy
                          as="p"
                          language={a.language}
                          text={a.title}
                          className="news-copy-card line-clamp-2 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent"
                        >
                          {a.title}
                        </NewsCopy>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-stext">
                          <Calendar size={11} /> {a.date}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <div className="mt-10">
          <DummyAd size="leaderboard" placement="news-detail-after-related" />
        </div>
      ) : null}

      <div className="mt-12">
        <CommentsSection targetType="news" targetId={item.id} />
      </div>
    </div>
  );
}
