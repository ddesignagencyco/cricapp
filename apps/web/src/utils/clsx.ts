type ClassValue = string | false | null | undefined | ClassValue[] | Record<string, boolean | undefined | null>;

export function clsx(...args: ClassValue[]): string {
  const parts: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      parts.push(arg);
    } else if (Array.isArray(arg)) {
      parts.push(clsx(...arg));
    } else if (typeof arg === 'object') {
      for (const [key, val] of Object.entries(arg)) {
        if (val) parts.push(key);
      }
    }
  }
  return parts.join(' ');
}

export default clsx;
