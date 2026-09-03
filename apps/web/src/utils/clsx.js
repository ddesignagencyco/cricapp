/**
 * Tiny className joiner (subset of clsx) that filters falsy values
 * and joins with spaces. Keeps the project dependency-light.
 */
export function clsx(...args) {
  const parts = [];
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
