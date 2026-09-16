import { SERVER_BASE } from '../../services/api/client';

export async function GET() {
  const res = await fetch(`${SERVER_BASE}/api/news/google-news-sitemap.xml`, {
    next: { revalidate: 300 },
  });
  const xml = await res.text();
  return new Response(xml, {
    status: res.status,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
