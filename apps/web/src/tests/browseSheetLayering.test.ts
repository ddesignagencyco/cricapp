import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
const navbar = fs.readFileSync(path.join(root, 'components/Navbar.tsx'), 'utf8');

/** Pulls a `z-index` value out of a CSS rule block by selector. */
function zIndexFor(selector: string): number | null {
  const at = css.indexOf(selector);
  if (at === -1) return null;
  const block = css.slice(at, css.indexOf('}', at));
  const match = block.match(/z-index:\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

describe('mobile browse sheet layering', () => {
  it('keeps the sticky match tab bar below the browse panel and the header', () => {
    const tabs = zIndexFor('.mc-tabs-sticky {');
    expect(tabs).not.toBeNull();
    // Navbar renders the sheet at z-[25] (scrim) / z-[30] (panel); the sticky
    // header and bottom nav are z-40. The tab bar must sit under all of them or it
    // paints over the open menu.
    expect(tabs!).toBeLessThan(25);
  });

  it('scopes the active mobile link underline to the link itself', () => {
    // The underline is an `after:` pseudo-element. Without `relative` on the link it
    // resolves against the sheet and stretches a full-width rule across the menu.
    expect(navbar).toMatch(/relative flex items-center gap-3 rounded-md/);
  });
});