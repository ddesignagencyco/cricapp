/** Safely extract a string from a value that might be a string, object with .name, or undefined. */
export function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return (o.name as string) || (o.title as string) || '';
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
