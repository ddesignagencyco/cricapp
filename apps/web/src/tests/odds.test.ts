import {
  americanFromDecimal,
  decimalFromAmerican,
  decimalFromFractional,
  formatPct,
  fractionalFromDecimal,
  impliedFromDecimal,
  overround,
} from '../lib/oddsMath';
import {
  formatMarginPercent,
  formatMovementPercent,
  formatOddsPrice,
  groupSelectionsByKey,
  impliedPercent,
  isOddsCaptureStale,
  isOddsSeedSource,
  modelPercent,
} from '../lib/oddsDisplay';
import { marketDisplayName } from '../lib/oddsMarketRules';
import { buildGalleryEmbedUrl, isVerticalShortUrl, youtubeId } from '../utils/galleryEmbed';

describe('odds format conversions', () => {
  it('converts fractional to decimal', () => {
    expect(decimalFromFractional(5, 2)).toBe(3.5);
    expect(decimalFromFractional(1, 1)).toBe(2);
    expect(decimalFromFractional(1, 0)).toBeNull();
    expect(decimalFromFractional(-1, 2)).toBeNull();
  });

  it('converts American to decimal in both directions', () => {
    expect(decimalFromAmerican(150)).toBe(2.5);
    expect(decimalFromAmerican(-200)).toBe(1.5);
    expect(decimalFromAmerican(0)).toBeNull();
    expect(americanFromDecimal(2.5)).toBe(150);
    expect(americanFromDecimal(1.5)).toBe(-200);
    expect(americanFromDecimal(1)).toBeNull();
  });

  it('rejects decimal prices at or below 1.0, which are not valid prices', () => {
    expect(decimalFromAmerican(0)).toBeNull();
    expect(americanFromDecimal(1)).toBeNull();
    expect(americanFromDecimal(0.9)).toBeNull();
    expect(impliedFromDecimal(1)).toBeNull();
    expect(impliedFromDecimal(0.99)).toBeNull();
  });

  it('finds the simplest fractional form', () => {
    expect(fractionalFromDecimal(3.5)).toEqual({ num: 5, den: 2 });
    expect(fractionalFromDecimal(2)).toEqual({ num: 1, den: 1 });
    expect(fractionalFromDecimal(1)).toBeNull();
  });

  it('implies probability from a decimal price', () => {
    expect(impliedFromDecimal(2)).toBe(0.5);
    expect(impliedFromDecimal(4)).toBe(0.25);
  });
});

describe('overround and percentages', () => {
  it('computes the bookmaker margin across outcomes', () => {
    // Three even 1.91 prices imply 3/1.91 = 1.5707 total, so ~57% margin.
    expect(overround([1 / 1.91, 1 / 1.91, 1 / 1.91])).toBeCloseTo(0.5707, 4);
    // A fair book (exactly 1.00 total) has no margin.
    expect(overround([0.5, 0.25, 0.25])).toBeCloseTo(0, 6);
  });

  it('returns null when there are not enough outcomes', () => {
    expect(overround([0.5])).toBeNull();
    expect(overround([])).toBeNull();
  });

  it('formats percentages and dashes missing values', () => {
    expect(formatPct(0.5432)).toBe('54.3%');
    expect(formatPct(null)).toBe('—');
    expect(impliedPercent(0.472)).toBe('47.2%');
    expect(modelPercent(null)).toBe('—');
  });
});

describe('formatOddsPrice', () => {
  const formats = { decimal: 1.87, fractional: '87/100', american: 87, impliedProbability: 0.535 };

  it('renders each format', () => {
    expect(formatOddsPrice(formats, 'decimal')).toBe('1.87');
    expect(formatOddsPrice(formats, 'fractional')).toBe('87/100');
    expect(formatOddsPrice(formats, 'american')).toBe('+87');
  });

  it('signs negative American prices', () => {
    expect(formatOddsPrice({ ...formats, american: -110 }, 'american')).toBe('-110');
  });

  it('dashes an unusable American price instead of printing NaN', () => {
    expect(formatOddsPrice({ ...formats, american: NaN }, 'american')).toBe('—');
  });
});

describe('formatMovementPercent and formatMarginPercent', () => {
  it('signs a rise and leaves a fall alone', () => {
    expect(formatMovementPercent(2.7)).toBe('+2.7%');
    expect(formatMovementPercent(-2)).toBe('-2.0%');
    expect(formatMovementPercent(0)).toBe('0.0%');
  });

  it('returns an empty string for missing values', () => {
    expect(formatMovementPercent(null)).toBe('');
    expect(formatMarginPercent(null)).toBe('');
  });

  it('prefixes margin with an approximation marker', () => {
    expect(formatMarginPercent(0.006)).toBe('~0.6%');
  });
});

describe('isOddsSeedSource', () => {
  it('detects demo sources by slug or by the (dev) marker', () => {
    expect(isOddsSeedSource({ sourceSlug: 'demo-book-a', sourceName: 'Demo Book A' })).toBe(true);
    expect(isOddsSeedSource({ sourceSlug: 'x', sourceName: 'Demo Book B (dev)' })).toBe(true);
  });

  it('does not flag a real bookmaker', () => {
    expect(isOddsSeedSource({ sourceSlug: 'bet365', sourceName: 'Bet365' })).toBe(false);
  });
});

describe('isOddsCaptureStale', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');

  it('flags a price older than fifteen minutes', () => {
    expect(isOddsCaptureStale('2026-09-28T11:40:00Z', now)).toBe(true);
  });

  it('accepts a recent price', () => {
    expect(isOddsCaptureStale('2026-09-28T11:55:00Z', now)).toBe(false);
  });

  it('does not throw on an unparseable timestamp', () => {
    expect(isOddsCaptureStale('not-a-date', now)).toBe(false);
  });
});

describe('groupSelectionsByKey', () => {
  it('groups by selection and sorts each group by best price first', () => {
    const groups = groupSelectionsByKey([
      { selectionKey: 'home', current: { decimal: 1.8 } },
      { selectionKey: 'away', current: { decimal: 2.1 } },
      { selectionKey: 'home', current: { decimal: 1.95 } },
    ] as never);
    expect([...groups.keys()]).toEqual(['home', 'away']);
    expect(groups.get('home')?.map((row) => row.current.decimal)).toEqual([1.95, 1.8]);
  });
});

describe('marketDisplayName', () => {
  it('falls back to a readable name when the API omits it', () => {
    expect(marketDisplayName('')).toBe('Match winner (incl. super over)');
    expect(marketDisplayName(null)).toBe('Match winner (incl. super over)');
  });

  it('passes a real market name through', () => {
    expect(marketDisplayName('Match Winner')).toBe('Match Winner');
  });
});

describe('gallery embeds', () => {
  it('extracts a YouTube id from every url shape', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeId('https://youtu.be/abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeId('https://www.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-');
    expect(youtubeId('https://vimeo.com/12345')).toBeNull();
  });

  it('builds an embed url with autoplay and inline playback', () => {
    expect(buildGalleryEmbedUrl('https://youtu.be/abc123XYZ_-')).toBe(
      'https://www.youtube.com/embed/abc123XYZ_-?autoplay=1&playsinline=1'
    );
  });

  it('passes a direct mp4 through untouched', () => {
    expect(buildGalleryEmbedUrl('https://cdn.example.com/a.mp4')).toBe('https://cdn.example.com/a.mp4');
  });

  it('refuses placeholders and empty values', () => {
    expect(buildGalleryEmbedUrl('#')).toBeNull();
    expect(buildGalleryEmbedUrl('')).toBeNull();
    expect(buildGalleryEmbedUrl(null)).toBeNull();
  });

  it('detects vertical shorts', () => {
    expect(isVerticalShortUrl('https://youtube.com/shorts/abc123')).toBe(true);
    expect(isVerticalShortUrl('https://youtube.com/watch?v=abc123')).toBe(false);
  });
});
