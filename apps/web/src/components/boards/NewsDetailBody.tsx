'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, Clock, Newspaper, Tag, User } from 'lucide-react';
import Badge from '../Badge';
import AdSlot from '../AdSlot';
import RemoteImage from '../RemoteImage';
import ShareButton from '../ShareButton';
import CommentsSection from '../CommentsSection';
import { sanitizeArticleHtml } from '../../utils/sanitizeHtml';

/**
 * Splits already-sanitized article HTML at a paragraph boundary near the middle
 * so a sponsored slot can sit inside the article. Short articles are left whole
 * so the slot never lands immediately under the heading.
 */
function splitAtParagraph(html: string): [string, string] {
  const parts = html.split('</p>');
  if (parts.length < 4) return [html, ''];
  const mid = Math.ceil(parts.length / 2);
  return [`${parts.slice(0, mid).join('</p>')}</p>`, parts.slice(mid).join('</p>')];
}

const proseClass = `prose prose-sm max-w-none text-base leading-8 text-mtext/90 tiptap-content
  prose-p:my-4 prose-p:leading-8
  prose-a:text-accent prose-a:no-underline hover:prose-a:underline
  prose-strong:text-mtext prose-strong:font-semibold
  prose-em:italic
  prose-blockquote:border-l-accent prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-stext
  prose-img:my-6 prose-img:rounded-xl
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

interface Props {
  item: any;
  related?: any[];
}

export default function NewsDetailBody({ item, related = [] }: Props) {
  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <Newspaper size={40} className="mx-auto text-stext" />
        <h1 className="mt-4 text-2xl font-bold text-mtext">Article not found</h1>
        <p className="mt-2 text-sm text-stext">We couldn&apos;t find that article. It may have been moved or removed.</p>
        <Link href="/news" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent2">
          <ArrowLeft size={14} /> Back to all news
        </Link>
      </div>
    );
  }
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
        <span className="font-medium text-mtext">{item.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <article className="min-w-0 lg:col-span-2">
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {categoryName && (
                <Badge tone={categoryTone[categoryName] || 'neutral'}>{categoryName}</Badge>
              )}
              {item.type === 'featured' && <Badge tone="live">Featured</Badge>}
              {Array.isArray(item.tags) && item.tags.slice(0, 3).map((t: string) => (
                <Badge key={t} tone="neutral">{t}</Badge>
              ))}
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-mtext sm:text-5xl">
              {item.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-stext sm:text-lg">
              {item.excerpt}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-lborder pb-6 text-xs text-stext">
              <span className="flex items-center gap-1.5">
                <User size={14} className="text-accent" /> {item.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> {item.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> {item.readTime}
              </span>
              <ShareButton type="news" id={String(item.slug || item.id)} fallbackTitle={item.title} compact className="ml-auto" />
            </div>
          </header>

          <div className={`relative h-56 overflow-hidden rounded-3xl sm:h-80 ${item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
            {item.image ? (
              <RemoteImage
                src={item.image}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Newspaper size={72} className="text-white/25" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          <div className="mt-10">
            <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentBeforeAd }} />

            {contentAfterAd && (
              <>
                <AdSlot slot="news-detail-mid" format="inline" className="my-8" />
                <div className={proseClass} dangerouslySetInnerHTML={{ __html: contentAfterAd }} />
              </>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-lborder pt-6">
              <Link href="/news" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent2">
                <ArrowLeft size={15} /> Back to all news
              </Link>
              <span className="flex items-center gap-1.5 text-xs text-stext">
                <Newspaper size={14} /> PAK CRICZONE Newsroom
              </span>
            </div>

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

            <div className="mt-12">
              <CommentsSection targetType="news" targetId={item.id} />
            </div>
          </div>
        </article>

        <aside className="min-w-0 lg:col-span-1">
          <div className="space-y-8 lg:sticky lg:top-20">
            <AdSlot slot="news-detail-sidebar" format="rectangle" />

            {related.length > 0 && (
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mtext">
                    More News
                  </h2>
                  <Link href="/news" className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent2">
                    All <ArrowRight size={13} />
                  </Link>
                </div>
                <div className="space-y-4">
                  {related.map((a) => (
                    <Link
                      key={a.id}
                      href={`/news/${a.id}`}
                      className="group flex gap-3"
                    >
                      <div
                        className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-sm ring-1 ring-lborder ${
                          a.image ? '' : `bg-gradient-to-br ${a.imageGradient || 'from-slate-600 to-slate-800'}`
                        }`}
                      >
                        {a.image && (
                          <RemoteImage
                            src={a.image}
                            alt={a.title}
                            fill
                            sizes="80px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent">
                          {a.title}
                        </h3>
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
    </div>
  );
}
