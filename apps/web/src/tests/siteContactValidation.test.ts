import {
  COUNTRIES,
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  countryByName,
  emptyWorkingHours,
  hasErrors,
  isKnownCountry,
  isValidAddress,
  isValidCity,
  isValidEmail,
  isValidMapsUrl,
  isValidPhone,
  isValidWhatsapp,
  isValidWorkingHours,
  validateSiteContact,
  type SiteContactForm,
} from '../lib/siteContact';

/**
 * Built with `fromCharCode` rather than a literal or a `\u` escape: an invisible
 * character in source is trivially lost on write, which silently turns the assertion
 * into a test of a perfectly valid string.
 */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const NULL_CHAR = String.fromCharCode(0);

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Country list Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

describe('the country list', () => {
  it('covers every country, not a hand-picked few', () => {
    // This replaced a hand-kept list of 35, which silently hid most of the world
    // from the picker.
    expect(COUNTRIES.length).toBeGreaterThan(190);
  });

  it('gives every entry a name, an ISO code and a dialling prefix', () => {
    COUNTRIES.forEach((country) => {
      expect(country.name.trim().length).toBeGreaterThan(0);
      expect(country.code).toMatch(/^[A-Z]{2}$/);
      expect(country.dial).toMatch(/^\+\d{1,4}$/);
    });
  });

  it('has no duplicate names or codes', () => {
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(COUNTRIES.length);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
  });

  it('is sorted alphabetically so the dropdown reads predictably', () => {
    const names = COUNTRIES.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('carries the right dialling codes for a spread of regions', () => {
    expect(countryByName('Pakistan')?.dial).toBe('+92');
    expect(countryByName('United Kingdom')?.dial).toBe('+44');
    expect(countryByName('United States')?.dial).toBe('+1');
    expect(countryByName('India')?.dial).toBe('+91');
    expect(countryByName('United Arab Emirates')?.dial).toBe('+971');
  });

  it('defaults to Pakistan', () => {
    expect(DEFAULT_COUNTRY).toBe('Pakistan');
  });

  it('resolves names case-insensitively and rejects unknown ones', () => {
    expect(countryByName('  united kingdom ')?.code).toBe('GB');
    expect(countryByName('Atlantis')).toBeNull();
    expect(isKnownCountry('Atlantis')).toBe(false);
  });

  it('pre-builds the select options once, labelled with the dial code', () => {
    expect(COUNTRY_OPTIONS).toHaveLength(COUNTRIES.length);
    const option = COUNTRY_OPTIONS.find((item) => item.value === 'Pakistan');
    expect(option).toMatchObject({ value: 'Pakistan', dial: '+92', code: 'PK' });
    expect(option?.label).toBe('Pakistan (+92)');
  });

  it('is frozen so no caller can mutate the shared list', () => {
    expect(Object.isFrozen(COUNTRIES)).toBe(true);
    expect(Object.isFrozen(COUNTRY_OPTIONS)).toBe(true);
  });
});

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Phone validation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

describe('isValidPhone', () => {
  it('accepts a valid number for the selected country', () => {
    expect(isValidPhone('+923001234567', 'Pakistan')).toBe(true);
    expect(isValidPhone('+44 7911 123456', 'United Kingdom')).toBe(true);
    expect(isValidPhone('+14155552671', 'United States')).toBe(true);
  });

  it('accepts a national-format number for the selected country', () => {
    // What the form actually produces before the dial code is added.
    expect(isValidPhone('0300-1234567', 'Pakistan')).toBe(true);
  });

  it('rejects a string of digits that merely looks long enough', () => {
    // Regression: the old rule was "10-15 digits", so this passed.
    expect(isValidPhone('1234567890', 'Pakistan')).toBe(false);
  });

  it('rejects a number that is too short for the country', () => {
    expect(isValidPhone('+92300123456', 'Pakistan')).toBe(false);
  });

  it('still allows an international number typed while another country is selected', () => {
    expect(isValidPhone('+14155552671', 'Pakistan')).toBe(true);
  });

  it('requires a country context to judge a bare local number', () => {
    expect(isValidPhone('03001234567')).toBe(false);
    expect(isValidPhone('+923001234567')).toBe(true);
  });

  it('treats blank as optional', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('   ')).toBe(true);
  });

  it('rejects an over-long value rather than truncating it', () => {
    expect(isValidPhone('+92 300 1234567 890123456')).toBe(false);
  });

  it('does not throw on junk', () => {
    expect(isValidPhone('not a phone', 'Pakistan')).toBe(false);
    expect(isValidPhone('+', 'Pakistan')).toBe(false);
    expect(isValidPhone('Ã™Â¡Ã™Â¢Ã™Â£', 'Pakistan')).toBe(false);
  });

  it('validates WhatsApp with the same real rules', () => {
    expect(isValidWhatsapp('+923001234567', 'Pakistan')).toBe(true);
    expect(isValidWhatsapp('1234567890', 'Pakistan')).toBe(false);
  });
});

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ City and address Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

describe('isValidCity', () => {
  it('accepts real city names, including punctuated ones', () => {
    const accented = [
      String.fromCharCode(0x4b, 0xf8, 0x62, 0x65, 0x6e, 0x68, 0x61, 0x76, 0x6e), // Kobenhavn
      String.fromCharCode(0x53, 0xe3, 0x6f, 0x20, 0x50, 0x61, 0x75, 0x6c, 0x6f), // Sao Paulo
      String.fromCharCode(0x30, 0x30, 0x34, 0x30), // digits
    ];
    ['Lahore', 'Karachi', 'New York', "St. John's", "Xi'an", 'Al Ain', ...accented].forEach((city) =>
      expect(isValidCity(city)).toBe(true),
    );
  });

  it('rejects a pasted URL, which is the common mistake', () => {
    expect(isValidCity('https://maps.google.com/?q=Lahore')).toBe(false);
    expect(isValidCity('www.google.com')).toBe(false);
    expect(isValidCity('//lahore')).toBe(false);
  });

it('rejects control characters and zero-width joiners', () => {
    expect(isValidCity(`Lah${ZERO_WIDTH_SPACE}ore`)).toBe(false);
    expect(isValidCity(`Lah${NULL_CHAR}ore`)).toBe(false);
    expect(isValidAddress(`Gulberg${ZERO_WIDTH_SPACE} III`)).toBe(false);
  });

  it('rejects anything over the API limit of 128 characters', () => {
    expect(isValidCity('L'.repeat(128))).toBe(true);
    expect(isValidCity('L'.repeat(129))).toBe(false);
  });

  it('treats blank as optional, since required-ness is a form concern', () => {
    expect(isValidCity('')).toBe(true);
  });
});

describe('isValidAddress', () => {
  it('accepts a normal postal address', () => {
    expect(isValidAddress('Office 12, Gulberg III, Lahore')).toBe(true);
    expect(isValidAddress('221B Baker Street, London NW1 6XE')).toBe(true);
  });

  it('rejects a URL', () => {
    expect(isValidAddress('https://example.com')).toBe(false);
  });

  it('enforces the API limit of 512 characters', () => {
    expect(isValidAddress('A'.repeat(512))).toBe(true);
    expect(isValidAddress('A'.repeat(513))).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('enforces the API limit of 320 characters', () => {
    expect(isValidEmail(`${'a'.repeat(60)}@example.com`)).toBe(true);
    expect(isValidEmail(`${'a'.repeat(320)}@example.com`)).toBe(false);
  });

  it('rejects embedded control characters used for header injection', () => {
    expect(isValidEmail('hello@example.com\nBcc: someone@else.com')).toBe(false);
  });
});

describe('isValidMapsUrl', () => {
  it('accepts the supported Google Maps forms', () => {
    expect(isValidMapsUrl('https://maps.google.com/?q=Lahore')).toBe(true);
    expect(isValidMapsUrl('https://maps.app.goo.gl/abc')).toBe(true);
  });

  it('rejects a lookalike host', () => {
    expect(isValidMapsUrl('https://maps.evil.com/?q=Lahore')).toBe(false);
  });
});

describe('isValidWorkingHours', () => {
  it('requires a real 24-hour time, not just an ordering', () => {
    expect(isValidWorkingHours({ days: ['mon'], open: '9:00', close: '18:00' })).toBe(false);
    expect(isValidWorkingHours({ days: ['mon'], open: '25:00', close: '26:00' })).toBe(false);
    expect(isValidWorkingHours({ days: ['mon'], open: '09:00', close: '18:00' })).toBe(true);
  });

  it('rejects an overnight window written the wrong way round', () => {
    expect(isValidWorkingHours({ days: ['mon'], open: '18:00', close: '09:00' })).toBe(false);
  });

  it('treats an empty day set as optional', () => {
    expect(isValidWorkingHours({ days: [], open: '', close: '' })).toBe(true);
  });
});

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Whole-form validation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

function form(overrides: Partial<SiteContactForm> = {}): SiteContactForm {
  return {
    email: 'hello@pakcriczone.com',
    supportEmail: '',
    phone: '+923001234567',
    whatsapp: '',
    address: 'Office 12, Gulberg III, Lahore',
    city: 'Lahore',
    country: 'Pakistan',
    mapsUrl: '',
    hours: emptyWorkingHours(),
    socials: [{ platform: 'facebook', value: '' }],
    ...overrides,
  };
}

describe('validateSiteContact', () => {
  it('passes a complete, valid form', () => {
    const errors = validateSiteContact(form());
    expect(hasErrors(errors)).toBe(false);
    expect(errors).toEqual({});
  });

  it('requires the five contact fields', () => {
    const errors = validateSiteContact(
      form({ email: '', phone: '', address: '', city: '', country: '' }),
    );
    expect(errors.email).toMatch(/required/i);
    expect(errors.phone).toMatch(/required/i);
    expect(errors.address).toMatch(/required/i);
    expect(errors.city).toMatch(/required/i);
    expect(errors.country).toBeDefined();
  });

  it('treats a whitespace-only value as missing', () => {
    expect(validateSiteContact(form({ city: '   ' })).city).toMatch(/required/i);
  });

  it('leaves the genuinely optional fields optional', () => {
    const errors = validateSiteContact(form({ supportEmail: '', whatsapp: '', mapsUrl: '' }));
    expect(errors.supportEmail).toBeUndefined();
    expect(errors.whatsapp).toBeUndefined();
    expect(errors.mapsUrl).toBeUndefined();
  });

  it('checks the phone against the selected country', () => {
    // A valid US number is not a valid Pakistani one.
    const errors = validateSiteContact(form({ phone: '1234567890' }));
    expect(errors.phone).toMatch(/selected country/i);
  });

  it('reports an unknown country, and only judges the number on its own merits', () => {
    // With no country to check against, a number in full international form is judged
    // as-is: `+92…` is a valid number whether or not the country is recognised.
    const okNumber = validateSiteContact(form({ country: 'Atlantis' }));
    expect(okNumber.country).toBeDefined();
    expect(okNumber.phone).toBeUndefined();

    // A number that is invalid regardless of country still errors.
    const badNumber = validateSiteContact(form({ country: 'Atlantis', phone: '1234567890' }));
    expect(badNumber.phone).toBeDefined();
  });

  it('points at the country when a local number cannot be judged without one', () => {
    // A bare national number is only meaningful against a known country.
    const errors = validateSiteContact(form({ country: 'Atlantis', phone: '03001234567' }));
    expect(errors.phone).toMatch(/select a country/i);
  });

  it('catches a URL pasted into the city field', () => {
    expect(validateSiteContact(form({ city: 'https://maps.google.com/?q=Lahore' })).city).toBeDefined();
  });

  it('catches a URL pasted into the address field', () => {
    expect(validateSiteContact(form({ address: 'https://example.com' })).address).toBeDefined();
  });

  it('flags a social link on the wrong network', () => {
    const errors = validateSiteContact(
      form({ socials: [{ platform: 'facebook', value: 'https://instagram.com/pakcriczone' }] }),
    );
    expect(errors.socials).toBeDefined();
    expect(errors.socialsByIndex?.[0]).toMatch(/facebook/i);
  });

  it('flags the same network listed twice', () => {
    const errors = validateSiteContact(
      form({
        socials: [
          { platform: 'facebook', value: 'https://facebook.com/pakcriczone' },
          { platform: 'facebook', value: 'https://facebook.com/other' },
        ],
      }),
    );
    expect(errors.socialsByIndex?.[1]).toMatch(/already listed/i);
  });

  it('rejects broken working hours', () => {
    const errors = validateSiteContact(
      form({ hours: { days: ['mon'], open: '18:00', close: '09:00' } }),
    );
    expect(errors.hours).toBeDefined();
  });
});

describe('hasErrors', () => {
  it('sees an error nested in the per-row social array', () => {
    // The old inline check only looked for strings, so a socialsByIndex failure
    // could slip past the save guard.
    expect(hasErrors({ socialsByIndex: [''] })).toBe(false);
    expect(hasErrors({ socialsByIndex: ['bad'] })).toBe(true);
    expect(hasErrors({ socialsByIndex: ['', 'bad'] })).toBe(true);
  });

  it('reads an empty error object as clean', () => {
    expect(hasErrors({})).toBe(false);
  });
});
