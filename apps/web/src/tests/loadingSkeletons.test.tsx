import fs from 'node:fs';
import path from 'node:path';
import { render, cleanup } from '@testing-library/react';

const SRC = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'tests' || entry.name === 'test') continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry.name) && entry.name !== 'layout.tsx') {
      out.push(full);
    }
  }
  return out;
}

const allFiles = walk(SRC);
const rel = (f: string) => path.relative(SRC, f).replace(/\\/g, '/');

/**
 * Route-level loading skeletons.
 *
 * There are 51 of these and they all follow the same shape: pick a skeleton
 * variant and render it. Asserting each one individually would be 51 copies of
 * the same test, so this walks the tree and checks them all: every file must
 * export a default component, must import cleanly, and must render something
 * into the document. That last part is what catches a skeleton being given a
 * variant name that no longer exists.
 */
const loadingFiles = allFiles.filter((f) => /^loading\.tsx$/i.test(path.basename(f)));

describe('route loading skeletons', () => {
  it('finds the route loading files to check', () => {
    expect(loadingFiles.length).toBeGreaterThan(40);
  });

  it.each(loadingFiles.map((f) => [rel(f), f] as const))('%s renders', (_name, file) => {
    const mod = require(file);
    const Component = mod.default;
    expect(typeof Component).toBe('function');

    const { container } = render(<Component />);
    expect(container.firstChild).not.toBeNull();
    cleanup();
  });
});
