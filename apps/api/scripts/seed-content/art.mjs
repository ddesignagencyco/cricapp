import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Original artwork for the seed content: generated SVG, so there is no photo licensing to
 * worry about and nothing is borrowed from a real publication.
 */

const PALETTES = {
  breaking: ['#b91c1c', '#7f1d1d'],
  'pakistan-cricket': ['#166534', '#052e16'],
  psl: ['#7c3aed', '#312e81'],
  international: ['#0369a1', '#082f49'],
  'match-news': ['#0f766e', '#042f2e'],
  analysis: ['#b45309', '#451a03'],
  features: ['#be185d', '#500724'],
  records: ['#a16207', '#422006'],
  interviews: ['#4338ca', '#1e1b4b'],
  explainers: ['#0e7490', '#083344'],
};

const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c]);

function wrap(text, max = 26, lines = 3) {
  const words = String(text).split(/\s+/);
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    out.length = lines;
    out[lines - 1] = out[lines - 1].replace(/\s*\S*$/, '…');
  }
  return out;
}

/** 1200x630 hero: category gradient, a pitch and ball motif, the headline, and an optional scoreline. */
export function heroSvg({ title, category, label, scoreline }) {
  const [a, b] = PALETTES[category] ?? PALETTES.features;
  const lines = wrap(title);
  const text = lines
    .map((l, i) => `<text x="72" y="${300 + i * 74}" font-family="Georgia, 'Times New Roman', serif" font-size="62" font-weight="700" fill="#ffffff">${esc(l)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${esc(title)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
<pattern id="s" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="20" height="40" fill="#ffffff" opacity="0.04"/></pattern></defs>
<rect width="1200" height="630" fill="url(#g)"/><rect width="1200" height="630" fill="url(#s)"/>
<g opacity="0.16"><rect x="800" y="-40" width="170" height="760" rx="14" fill="#fff"/><rect x="858" y="40" width="54" height="8" fill="#fff"/><rect x="858" y="560" width="54" height="8" fill="#fff"/></g>
<circle cx="1010" cy="170" r="78" fill="#dc2626" opacity="0.92"/><path d="M944 138c34 22 34 72 0 94M1076 138c-34 22-34 72 0 94" stroke="#fff" stroke-width="5" fill="none" opacity="0.85"/>
<text x="72" y="120" font-family="system-ui, sans-serif" font-size="26" font-weight="700" letter-spacing="5" fill="#ffffff" opacity="0.85">${esc((label ?? category ?? '').toUpperCase())}</text>
${text}
${scoreline ? `<text x="72" y="${300 + lines.length * 74 + 24}" font-family="system-ui, sans-serif" font-size="34" fill="#ffffff" opacity="0.9">${esc(scoreline)}</text>` : ''}
<text x="72" y="580" font-family="system-ui, sans-serif" font-size="24" letter-spacing="4" fill="#ffffff" opacity="0.7">CRICAPP</text>
</svg>`;
}

export function avatarSvg(name, hue) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${esc(name)}"><rect width="200" height="200" fill="hsl(${hue} 55% 38%)"/><text x="100" y="124" text-anchor="middle" font-family="system-ui, sans-serif" font-size="84" font-weight="700" fill="#fff">${esc(initials)}</text></svg>`;
}

export function writeAsset(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
