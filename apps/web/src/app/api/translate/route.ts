import { NextResponse } from 'next/server';

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

async function tryGoogle(text: string, from: string, to: string): Promise<string | null> {
  const url = new URL(GOOGLE_TRANSLATE_URL);
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', from);
  url.searchParams.set('tl', to);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const translated = (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('')
    .trim();
  return translated || null;
}

async function tryMyMemory(text: string, from: string, to: string): Promise<string | null> {
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${from}|${to}`);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  const translated = data?.responseData?.translatedText?.trim() || '';
  if (Number(data?.responseStatus) !== 200 || !translated || /MYMEMORY WARNING/i.test(translated)) {
    return null;
  }
  return translated;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; from?: string; to?: string };
    const text = String(body?.text || '').trim();
    const from = body?.from === 'ur' ? 'ur' : 'en';
    const to = body?.to === 'en' ? 'en' : 'ur';
    if (!text) return NextResponse.json({ translatedText: '' });

    const translated =
      (await tryGoogle(text, from, to).catch(() => null)) ||
      (await tryMyMemory(text, from, to).catch(() => null));

    if (!translated) {
      return NextResponse.json({ error: 'Translation providers unavailable' }, { status: 502 });
    }
    return NextResponse.json({ translatedText: translated });
  } catch {
    return NextResponse.json({ error: 'Invalid translation request' }, { status: 400 });
  }
}
