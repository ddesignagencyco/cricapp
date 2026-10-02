import {
  countryByName,
  emptyWorkingHours,
  formatPhoneNumber,
  formatWorkingHoursLabel,
  isValidEmail,
  isValidMapsUrl,
  parseWorkingHours,
  phoneDigitCount,
  serializeWorkingHours,
} from '../lib/siteContact';

describe('isValidEmail', () => {
  it('accepts a normal address and treats empty as optional', () => {
    expect(isValidEmail('hello@pakcriczone.com')).toBe(true);
    expect(isValidEmail('')).toBe(true);
  });

  it('rejects a missing domain or stray spaces', () => {
    expect(isValidEmail('hello@')).toBe(false);
    expect(isValidEmail('hello pakcriczone.com')).toBe(false);
    expect(isValidEmail('@pakcriczone.com')).toBe(false);
  });
});

describe('formatPhoneNumber', () => {
  it('applies the selected country dial code', () => {
    expect(formatPhoneNumber('3001234567', 'Pakistan')).toBe('+92 300 123 4567');
  });

  it('does not double up a dial code the user already typed', () => {
    expect(formatPhoneNumber('+923001234567', 'Pakistan')).toBe('+92 300 123 4567');
  });

  it('normalises a 00 international prefix', () => {
    expect(formatPhoneNumber('00923001234567', 'Pakistan')).toBe('+92 300 123 4567');
  });

  it('drops a leading national trunk zero', () => {
    expect(formatPhoneNumber('03001234567', 'Pakistan')).toBe('+92 300 123 4567');
  });

  it('keeps the dial code visible while typing', () => {
    expect(formatPhoneNumber('', 'Pakistan')).toBe('+92');
    expect(formatPhoneNumber('3', 'Pakistan')).toBe('+92 3');
  });

  it('degrades gracefully when the country is unknown', () => {
    expect(formatPhoneNumber('3001234567', 'Atlantis')).toBe('300 123 4567');
  });
});

describe('phoneDigitCount', () => {
  it('counts digits only, ignoring formatting', () => {
    expect(phoneDigitCount('+92 300 123 4567')).toBe(12);
    expect(phoneDigitCount('')).toBe(0);
  });
});

describe('countryByName', () => {
  it('looks up a country case-insensitively', () => {
    expect(countryByName('pakistan')?.dial).toBe('+92');
    expect(countryByName('  United Kingdom ')?.dial).toBe('+44');
  });

  it('returns null for an unknown country', () => {
    expect(countryByName('Atlantis')).toBeNull();
  });
});

describe('isValidMapsUrl', () => {
  it('accepts the Google Maps url forms we support', () => {
    expect(isValidMapsUrl('https://maps.google.com/?q=Lahore')).toBe(true);
    expect(isValidMapsUrl('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isValidMapsUrl('https://goo.gl/maps/abc')).toBe(true);
  });

  it('rejects a lookalike host and treats empty as optional', () => {
    expect(isValidMapsUrl('https://maps.evil.com/?q=Lahore')).toBe(false);
    expect(isValidMapsUrl('')).toBe(true);
  });
});

describe('working hours', () => {
  it('serialises days in a stable weekday order regardless of click order', () => {
    const json = serializeWorkingHours({ days: ['fri', 'mon', 'wed'], open: '10:00', close: '18:00' });
    expect(JSON.parse(json).days).toEqual(['mon', 'wed', 'fri']);
  });

  it('round trips through parse', () => {
    const value = { days: ['mon', 'tue'] as ('mon' | 'tue')[], open: '09:30', close: '17:00' };
    expect(parseWorkingHours(serializeWorkingHours(value))).toEqual(value);
  });

  it('serialises to an empty string when nothing is selected', () => {
    expect(serializeWorkingHours({ days: [], open: '10:00', close: '18:00' })).toBe('');
  });

  it('drops unknown day ids rather than trusting stored json', () => {
    const parsed = parseWorkingHours('{"days":["mon","funday"],"open":"10:00","close":"18:00"}');
    expect(parsed?.days).toEqual(['mon']);
  });

  it('returns null for missing or malformed json', () => {
    expect(parseWorkingHours('')).toBeNull();
    expect(parseWorkingHours(null)).toBeNull();
    expect(parseWorkingHours('{oops')).toBeNull();
    expect(parseWorkingHours('{"days":[]}')).toBeNull();
  });

  it('provides a sensible default', () => {
    expect(emptyWorkingHours()).toEqual({ days: ['mon', 'tue', 'wed', 'thu', 'fri'], open: '10:00', close: '18:00' });
  });
});

describe('formatWorkingHoursLabel', () => {
  it('collapses a weekday set into a short label', () => {
    expect(
      formatWorkingHoursLabel(serializeWorkingHours({ days: ['mon', 'tue', 'wed', 'thu', 'fri'], open: '10:00', close: '18:00' }))
    ).toBe('Mon–Fri 10:00–18:00');
  });

  it('says Daily for all seven days', () => {
    expect(
      formatWorkingHoursLabel(
        serializeWorkingHours({ days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], open: '09:00', close: '17:00' })
      )
    ).toBe('Daily 09:00–17:00');
  });

  it('lists the days when the set is unusual', () => {
    expect(
      formatWorkingHoursLabel(serializeWorkingHours({ days: ['sat', 'sun'], open: '09:00', close: '17:00' }))
    ).toBe('Sat, Sun 09:00–17:00');
  });

  it('falls back to the raw string when there is nothing to format', () => {
    expect(formatWorkingHoursLabel('closed')).toBe('closed');
  });
});
