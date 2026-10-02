import {
  countWords,
  slugifyNews,
  isValidNewsSlug,
  isUrduLanguage,
  otherNewsLanguage,
  newsListPath,
  newsHref,
  isEmptyRichText,
  NEWS_TITLE_MAX_WORDS,
} from '../utils/newsConstraints';

describe('countWords', () => {
  it('counts space separated words', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('collapses repeated whitespace', () => {
    expect(countWords('  one   two \n three ')).toBe(3);
  });

  it('returns 0 for an empty or whitespace-only string', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('slugifyNews', () => {
  it('lowercases and hyphenates a plain title', () => {
    expect(slugifyNews('Pakistan Wins The Match')).toBe('pakistan-wins-the-match');
  });

  it('strips punctuation', () => {
    expect(slugifyNews("Ali Raza's Big Day!!!")).toBe('ali-raza-s-big-day');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugifyNews('  ...Hello World...  ')).toBe('hello-world');
  });

  it('keeps Urdu letters, which the api slug pattern also allows', () => {
    // Mirrors the NestJS Matches() pattern, so the client cannot build a slug
    // the server will reject.
    expect(slugifyNews('پاکستان ٹیم')).toBe('پاکستان-ٹیم');
    expect(isValidNewsSlug(slugifyNews('پاکستان ٹیم'))).toBe(true);
  });

  it('keeps digits', () => {
    expect(slugifyNews('PSL 2026 Season')).toBe('psl-2026-season');
  });

  it('returns an empty string when there is nothing usable', () => {
    expect(slugifyNews('!!!')).toBe('');
  });
});

describe('isValidNewsSlug', () => {
  it('accepts a normal slug', () => {
    expect(isValidNewsSlug('pakistan-wins')).toBe(true);
  });

  it('rejects a leading or trailing hyphen', () => {
    expect(isValidNewsSlug('-pakistan')).toBe(false);
    expect(isValidNewsSlug('pakistan-')).toBe(false);
  });

  it('rejects consecutive hyphens', () => {
    expect(isValidNewsSlug('pakistan--wins')).toBe(false);
  });

  it('rejects spaces and symbols', () => {
    expect(isValidNewsSlug('pakistan wins')).toBe(false);
    expect(isValidNewsSlug('pakistan_wins')).toBe(false);
  });

  it('rejects an empty slug', () => {
    expect(isValidNewsSlug('')).toBe(false);
  });
});

describe('isUrduLanguage', () => {
  it('accepts ur and urdu in any case', () => {
    expect(isUrduLanguage('ur')).toBe(true);
    expect(isUrduLanguage('UR')).toBe(true);
    expect(isUrduLanguage(' urdu ')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isUrduLanguage('en')).toBe(false);
    expect(isUrduLanguage('')).toBe(false);
    expect(isUrduLanguage(null)).toBe(false);
    expect(isUrduLanguage(undefined)).toBe(false);
  });
});

describe('otherNewsLanguage', () => {
  it('toggles ur to en', () => {
    expect(otherNewsLanguage('ur')).toBe('en');
  });

  it('toggles en to ur', () => {
    expect(otherNewsLanguage('en')).toBe('ur');
  });

  it('defaults to ur for an unknown language', () => {
    expect(otherNewsLanguage(null)).toBe('ur');
  });
});

describe('newsListPath', () => {
  it('returns the plain path with no query', () => {
    expect(newsListPath('en')).toBe('/news');
  });

  it('uses the ur prefix for Urdu', () => {
    expect(newsListPath('ur')).toBe('/ur/news');
  });

  it('appends a category', () => {
    expect(newsListPath('en', { category: 'cricket' })).toBe('/news?category=cricket');
  });

  it('omits the "all" category since it is the default view', () => {
    expect(newsListPath('en', { category: 'all' })).toBe('/news');
  });

  it('omits a blank category or tag', () => {
    expect(newsListPath('en', { category: '  ', tag: '' })).toBe('/news');
  });

  it('omits page 1 but keeps later pages', () => {
    expect(newsListPath('en', { page: 1 })).toBe('/news');
    expect(newsListPath('en', { page: 3 })).toBe('/news?page=3');
  });

  it('combines category, tag and page', () => {
    expect(newsListPath('en', { category: 'cricket', tag: 'psl', page: 2 })).toBe(
      '/news?category=cricket&tag=psl&page=2',
    );
  });

  it('keeps the ur prefix when filters are applied', () => {
    expect(newsListPath('ur', { category: 'cricket' })).toBe('/ur/news?category=cricket');
  });
});

describe('newsHref', () => {
  it('uses the public cricket-news slug path for English', () => {
    expect(newsHref({ id: 'a1', slug: 'pakistan-wins', language: 'en' })).toBe(
      '/cricket-news/pakistan-wins',
    );
  });

  it('uses the ur prefix and news path for Urdu', () => {
    expect(newsHref({ id: 'a1', slug: 'pakistan-wins', language: 'ur' })).toBe(
      '/ur/news/pakistan-wins',
    );
  });

  it('falls back to the id under /news when there is no slug', () => {
    expect(newsHref({ id: 'a1', slug: null, language: 'en' })).toBe('/news/a1');
  });

  it('treats a blank slug as missing', () => {
    expect(newsHref({ id: 'a1', slug: '   ', language: 'en' })).toBe('/news/a1');
  });

  it('defaults to the English path when the language is missing', () => {
    expect(newsHref({ id: 'a1', slug: 's' })).toBe('/cricket-news/s');
  });
});

describe('isEmptyRichText', () => {
  it('is true for an empty string', () => {
    expect(isEmptyRichText('')).toBe(true);
  });

  it('is true when the html holds only tags and nbsp', () => {
    expect(isEmptyRichText('<p><br></p>')).toBe(true);
    expect(isEmptyRichText('<p>&nbsp;</p>')).toBe(true);
    expect(isEmptyRichText('<div></div>&nbsp;')).toBe(true);
  });

  it('is false when there is real text', () => {
    expect(isEmptyRichText('<p>Hello</p>')).toBe(false);
  });

  it('is false for text that only looks like markup', () => {
    expect(isEmptyRichText('&lt;p&gt;')).toBe(false);
  });
});

describe('NEWS_TITLE_MAX_WORDS', () => {
  it('matches the api limit of 50 words', () => {
    expect(NEWS_TITLE_MAX_WORDS).toBe(50);
  });

  it('agrees with countWords on a title at the limit', () => {
    const atLimit = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
    expect(countWords(atLimit)).toBe(NEWS_TITLE_MAX_WORDS);
  });
});
