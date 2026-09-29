import { authorSlug, describeDuplicates, findSimilarAuthors } from '../utils/authorIdentity';

const existing = [
  { id: '1', name: 'Shad', slug: 'shad' },
  { id: '2', name: 'Babar Azam', slug: 'babar-azam' },
];

describe('authorSlug', () => {
  it('lowercases and hyphenates like the api does', () => {
    expect(authorSlug('Umair Shad')).toBe('umair-shad');
    expect(authorSlug('  Ayesha  Malik  ')).toBe('ayesha-malik');
  });
});

describe('findSimilarAuthors', () => {
  it('returns nothing for a blank name', () => {
    expect(findSimilarAuthors('   ', existing)).toEqual([]);
  });

  it('flags an exact slug collision', () => {
    expect(findSimilarAuthors('Shad', existing)).toEqual([
      { author: existing[0], reason: 'slug' },
    ]);
  });

  it('flags the same name with different punctuation or spacing', () => {
    // Slug is absent here so the normalised-name branch is the one that fires;
    // with a stored slug the (stricter) slug branch matches first.
    const rows = [{ id: '1', name: 'Babar  Azam' }];
    expect(findSimilarAuthors('babar azam', rows)).toEqual([{ author: rows[0], reason: 'name' }]);
  });

  it('prefers the slug reason when the stored row already has that slug', () => {
    const rows = [{ id: '1', name: 'Babar  Azam', slug: 'babar-azam' }];
    expect(findSimilarAuthors('babar azam', rows)).toEqual([{ author: rows[0], reason: 'slug' }]);
  });

  it('flags a name whose tokens are contained in another name', () => {
    // The real production case: "Umair shad" was created alongside "Shad".
    expect(findSimilarAuthors('Umair shad', existing)).toEqual([
      { author: existing[0], reason: 'overlap' },
    ]);
  });

  it('flags a shorter form typed against a longer existing name', () => {
    expect(findSimilarAuthors('Shad', [{ id: '9', name: 'Umair shad', slug: 'umair-shad' }])).toEqual([
      { author: { id: '9', name: 'Umair shad', slug: 'umair-shad' }, reason: 'overlap' },
    ]);
  });

  it('ignores the author being edited', () => {
    expect(findSimilarAuthors('Shad', existing, '1')).toEqual([]);
  });

  it('does not flag a genuinely different person', () => {
    expect(findSimilarAuthors('Moin Khan', existing)).toEqual([]);
  });

  it('does not treat a partial shared token as the same person', () => {
    expect(findSimilarAuthors('Shadab', existing)).toEqual([]);
  });
});

describe('describeDuplicates', () => {
  it('is empty when there is nothing to report', () => {
    expect(describeDuplicates([])).toBe('');
  });

  it('names a single match', () => {
    expect(describeDuplicates(findSimilarAuthors('Shad', existing))).toContain('Shad');
  });

  it('joins several matches', () => {
    const rows = [
      { id: '1', name: 'Shad', slug: 'shad' },
      { id: '2', name: 'Shad', slug: 'shad' },
    ];
    expect(describeDuplicates(findSimilarAuthors('Shad', rows))).toContain('Shad and Shad');
  });
});
