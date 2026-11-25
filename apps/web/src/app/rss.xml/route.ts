import { NextResponse } from 'next/server';
import { fetchNews } from '../../services/news';
import { newsHref } from '../../utils/newsConstraints';

const SITE = 'https://criczapp.com';

function xmlEscape(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const language = searchParams.get('language') || undefined;

  const articles = await fetchNews({
    limit: 30,
    ...(category ? { category } : {}),
    ...(language ? { language } : {}),
  }).catch(() => []);

  const itemsXml = articles
    .map((a) => {
      const link = `${SITE}${newsHref(a)}`;
      const pubDate = a.publishedAt ? new Date(a.publishedAt).toUTCString() : new Date().toUTCString();
      const categoryName =
        typeof a.category === 'string'
          ? a.category
          : a.category && typeof a.category === 'object' && 'name' in a.category
            ? String((a.category as { name?: string }).name || '')
            : '';
      const imageTag = a.image
        ? `<enclosure url="${xmlEscape(a.image.startsWith('http') ? a.image : `${SITE}${a.image}`)}" type="image/jpeg" />`
        : '';
      return [
        '    <item>',
        `      <title>${xmlEscape(a.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <description>${xmlEscape(a.excerpt || a.title)}</description>`,
        `      <pubDate>${xmlEscape(pubDate)}</pubDate>`,
        categoryName ? `      <category>${xmlEscape(categoryName)}</category>` : '',
        imageTag ? `      ${imageTag}` : '',
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const feedTitle = category ? `CriczApp — ${category} Cricket News` : 'CriczApp — Live Cricket News & Analysis';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(feedTitle)}</title>
    <link>${SITE}/news</link>
    <description>Every Run. Every Ball. Live. Cricket news, PSL coverage, match reports and analysis from CriczApp.</description>
    <language>${language === 'ur' ? 'ur' : 'en'}</language>
    <atom:link href="${xmlEscape(`${SITE}/rss.xml${category ? `?category=${encodeURIComponent(category)}` : ''}`)}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
