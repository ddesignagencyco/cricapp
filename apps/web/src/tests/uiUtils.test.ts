import { isRtlLanguage, looksLikeUrdu, newsLocale } from '../utils/locale';
import { clsx } from '../utils/clsx';
import { normalizeOddsMatchId, oddsPageHref } from '../lib/oddsPaths';
import { socialLabel, socialHref, phoneHref, whatsappHref, SOCIAL_PLATFORMS } from '../lib/socialPlatforms';

describe('isRtlLanguage', () => {
  it('accepts ur and urdu in any casing or padding', () => {
    expect(isRtlLanguage('ur')).toBe(true);
    expect(isRtlLanguage('URDU')).toBe(true);
    expect(isRtlLanguage('  ur ')).toBe(true);
  });

  it('rejects other languages and nullish input', () => {
    expect(isRtlLanguage('en')).toBe(false);
    expect(isRtlLanguage('ar')).toBe(false);
    expect(isRtlLanguage(null)).toBe(false);
    expect(isRtlLanguage(undefined)).toBe(false);
  });
});

describe('looksLikeUrdu', () => {
  it('detects the Arabic script block', () => {
    expect(looksLikeUrdu('پاکستان')).toBe(true);
  });

  it('is false for latin text', () => {
    expect(looksLikeUrdu('Pakistan')).toBe(false);
  });

  it('is false for nullish input', () => {
    expect(looksLikeUrdu('')).toBe(false);
    expect(looksLikeUrdu(null)).toBe(false);
  });
});

describe('newsLocale', () => {
  it('trusts the sample text over the stored language', () => {
    // A ur-tagged article holding english body text must still render ltr,
    // otherwise the whole page is laid out backwards.
    expect(newsLocale('ur', 'Pakistan won the match')).toEqual({ dir: 'ltr', lang: 'en' });
  });

  it('switches to rtl when the sample is Urdu', () => {
    expect(newsLocale('en', 'پاکستان جیتا')).toEqual({ dir: 'rtl', lang: 'ur' });
  });

  it('strips tags before sniffing the sample', () => {
    expect(newsLocale('en', '<p>پاکستان جیتا</p>').dir).toBe('rtl');
  });

  it('falls back to the language when there is no sample text', () => {
    expect(newsLocale('ur')).toEqual({ dir: 'rtl', lang: 'ur' });
    expect(newsLocale('en')).toEqual({ dir: 'ltr', lang: 'en' });
  });

  it('falls back to the language when the sample is markup only', () => {
    expect(newsLocale('ur', '<p><br></p>')).toEqual({ dir: 'rtl', lang: 'ur' });
  });
});

describe('clsx', () => {
  it('joins plain strings', () => {
    expect(clsx('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(clsx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('keeps only the truthy keys of an object', () => {
    expect(clsx({ a: true, b: false, c: true, d: null })).toBe('a c');
  });

  it('flattens nested arrays', () => {
    expect(clsx(['a', ['b', { c: true }]])).toBe('a b c');
  });

  it('mixes strings, objects and arrays', () => {
    expect(clsx('base', { active: true }, ['extra'])).toBe('base active extra');
  });

  it('returns an empty string with no args', () => {
    expect(clsx()).toBe('');
  });
});

describe('normalizeOddsMatchId', () => {
  it('decodes a percent encoded colon', () => {
    expect(normalizeOddsMatchId('sr%3Amatch%3A1')).toBe('sr:match:1');
  });

  it('leaves a plain id untouched', () => {
    expect(normalizeOddsMatchId('sr:match:1')).toBe('sr:match:1');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeOddsMatchId('  sr:match:1  ')).toBe('sr:match:1');
  });

  it('returns the raw value for a malformed escape instead of throwing', () => {
    // A bad % sequence in a url must not crash the page.
    expect(normalizeOddsMatchId('%E0%A4%A')).toBe('%E0%A4%A');
  });
});

describe('oddsPageHref', () => {
  it('keeps colons readable in the path', () => {
    expect(oddsPageHref('sr:match:1')).toBe('/odds/sr:match:1');
  });

  it('normalises a legacy encoded id', () => {
    expect(oddsPageHref('sr%3Amatch%3A1')).toBe('/odds/sr:match:1');
  });
});

describe('socialLabel', () => {
  it('returns the human label for a known platform', () => {
    expect(socialLabel('x')).toBe('X (Twitter)');
    expect(socialLabel('youtube')).toBe('YouTube');
  });

  it('echoes an unknown id rather than showing a blank chip', () => {
    expect(socialLabel('mastodon')).toBe('mastodon');
  });

  it('has a unique id and a non-empty placeholder for every platform', () => {
    const ids = SOCIAL_PLATFORMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    SOCIAL_PLATFORMS.forEach((p) => expect(p.placeholder.length).toBeGreaterThan(0));
  });
});

describe('socialHref', () => {
  it('passes a full https url straight through', () => {
    expect(socialHref('facebook', 'https://facebook.com/x')).toBe('https://facebook.com/x');
  });

  it('passes a mailto url straight through', () => {
    expect(socialHref('email', 'mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('adds a scheme to a bare handle', () => {
    expect(socialHref('x', 'pakcriczone')).toBe('https://pakcriczone');
  });

  it('builds a wa.me link from the digits of a whatsapp number', () => {
    expect(socialHref('whatsapp', '+92 300 1234567')).toBe('https://wa.me/923001234567');
  });

  it('strips a leading @ from a telegram handle', () => {
    expect(socialHref('telegram', '@pakcriczone')).toBe('https://t.me/pakcriczone');
  });

  it('returns an empty string for a blank value', () => {
    expect(socialHref('x', '   ')).toBe('');
  });
});

describe('phoneHref', () => {
  it('builds a tel link keeping only digits and a leading plus', () => {
    expect(phoneHref('+92 300 1234567')).toBe('tel:+923001234567');
  });

  it('returns an empty string when there are no digits', () => {
    expect(phoneHref('not a number')).toBe('');
  });
});

describe('whatsappHref', () => {
  it('delegates to socialHref for the whatsapp platform', () => {
    expect(whatsappHref('+923001234567')).toBe('https://wa.me/923001234567');
  });
});
