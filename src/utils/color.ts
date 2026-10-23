/** `#RRGGBB` → `rgba()` at the given opacity. */
export function alpha(hex: string, a: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');

/** Mix towards black (amount 0..1). */
export function shade(hex: string, amount: number) {
  const [r, g, b] = rgb(hex);
  return `#${toHex(r * (1 - amount))}${toHex(g * (1 - amount))}${toHex(b * (1 - amount))}`;
}

function luminance(hex: string) {
  const ch = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** White or near-black, whichever reads better on `hex` (WCAG contrast). */
export function readableOn(hex: string) {
  const l = luminance(hex);
  const white = 1.05 / (l + 0.05);
  const black = (l + 0.05) / 0.05;
  return white >= 3 || white >= black ? '#FFFFFF' : '#14161B';
}

/** A badge fill: the colour deepened just enough for white text, unless it's a light hue. */
export function badgeFill(hex: string) {
  for (const amt of [0, 0.12, 0.22, 0.3]) {
    const c = shade(hex, amt);
    if (1.05 / (luminance(c) + 0.05) >= 3.2) return c;
  }
  // Yellows and golds stay bright and take dark text instead.
  return hex;
}

const PEOPLE = ['#3B68FC', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#22C55E', '#0EA5E9', '#EAB308', '#EF4444', '#6366F1'];

/** Stable colour for a person without a team (commenters, authors). */
export function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PEOPLE[h % PEOPLE.length];
}
