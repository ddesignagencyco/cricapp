export function isSportRadarId(value: string): boolean {
  return /^sr:[a-z0-9]+:/i.test(value.trim());
}

/** Safely extract a display string. SportRadar ids like `sr:tournament:123` are skipped. */
export function str(v: unknown): string {
  if (typeof v === 'string') {
    const text = v.trim();
    return !text || isSportRadarId(text) ? '' : text;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return str(o.name) || str(o.title) || str(o.city_name) || str(o.country_name);
  }
  return '';
}

/** Safely extract a number from a value that might be a number, numeric string, or undefined. */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
