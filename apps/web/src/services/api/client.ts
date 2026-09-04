const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiGet(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<any> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, String(v));
  });
  const query = qs.toString();
  const url = `${API_BASE}/api${path}${query ? `?${query}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`API error ${res.status}: ${url}`);
  }
  return res.json();
}

export { API_BASE };
