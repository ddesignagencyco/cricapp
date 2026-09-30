import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/* ─── Week days and working hours ─── */

export const WEEK_DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
] as const;

export type WeekDayId = (typeof WEEK_DAYS)[number]['id'];

export type WorkingHoursValue = {
  days: WeekDayId[];
  open: string;
  close: string;
};

/* ─── Countries ─── */

export type Country = {
  /** Display name, e.g. "Pakistan". This is what gets stored and shown. */
  name: string;
  /** ISO 3166-1 alpha-2, e.g. "PK". Never stored; used for phone validation. */
  code: CountryCode;
  /** Dialling prefix, e.g. "+92". */
  dial: string;
};

/**
 * Region display names come from `Intl.DisplayNames` rather than a shipped table,
 * so they stay correct and cost no bundle size. Falls back to the ISO code where the
 * runtime has no data for a region.
 */
const REGION_NAMES: Intl.DisplayNames | null =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null;

function regionName(code: string): string {
  try {
    return REGION_NAMES?.of(code) || code;
  } catch {
    return code;
  }
}

/**
 * Every territory `libphonenumber-js` recognises — 245 of them — rather than the
 * hand-kept 35 this replaced. Built once at module load and frozen, so it costs
 * nothing per render.
 */
export const COUNTRIES: readonly Country[] = Object.freeze(
  getCountries()
    .map((code) => ({ name: regionName(code), code, dial: `+${getCountryCallingCode(code)}` }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

const COUNTRIES_BY_NAME = new Map(COUNTRIES.map((item) => [item.name.toLowerCase(), item]));

export function countryByName(name: string): Country | null {
  return COUNTRIES_BY_NAME.get(name.trim().toLowerCase()) ?? null;
}

export function isKnownCountry(name: string): boolean {
  return countryByName(name) !== null;
}

/**
 * Pre-built select options. The admin country picker rebuilds its option list on
 * every render otherwise, which with 245 entries is 245 allocations per keystroke.
 */
export const COUNTRY_OPTIONS: ReadonlyArray<{ value: string; label: string; dial: string; code: string }> =
  Object.freeze(
    COUNTRIES.map((item) => ({
      value: item.name,
      label: `${item.name} (${item.dial})`,
      dial: item.dial,
      code: item.code,
    })),
  );

/** The default country, derived from the list rather than hard-coded twice. */
export const DEFAULT_COUNTRY = COUNTRY_OPTIONS.find((option) => option.code === 'PK')?.value ?? 'Pakistan';

/* ─── Field validators ───
 *
 * Every predicate treats blank as valid, because whether a field is required is a
 * form-level decision made by `validateSiteContact`, not a property of the format.
 * Keeping the two apart is what lets the same predicate serve an optional field and
 * a required one.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Matches the API's `@MaxLength(320)`. */
const EMAIL_MAX = 320;
/** Matches the API's `@MaxLength(512)` on address and mapsUrl. */
const ADDRESS_MAX = 512;
/** Matches the API's `@MaxLength(128)` on city and country. */
const CITY_MAX = 128;
/** Matches the API's `@MaxLength(64)` on phone and whatsapp. */
const PHONE_MAX = 64;

const SOCIAL_HOST: Record<string, RegExp> = {
  facebook: /(facebook\.com|fb\.com)\//i,
  instagram: /instagram\.com\//i,
  x: /(x\.com|twitter\.com)\//i,
  youtube: /(youtube\.com|youtu\.be)\//i,
  tiktok: /tiktok\.com\//i,
  linkedin: /linkedin\.com\//i,
  threads: /threads\.(net|com)\//i,
  telegram: /(t\.me|telegram\.me)\//i,
  discord: /(discord\.gg|discord\.com)\//i,
  snapchat: /snapchat\.com\//i,
  reddit: /reddit\.com\//i,
};

const MAPS_RE = /^(https:\/\/)?(www\.)?(maps\.google\.|google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i;

/** Control characters and zero-width joiners, which break rendering and search. */
const UNSAFE_TEXT_RE = /[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/;
const URL_LIKE_RE = /^(https?:)?\/\/|www\./i;

export function isValidEmail(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > EMAIL_MAX) return false;
  if (UNSAFE_TEXT_RE.test(raw)) return false;
  return EMAIL_RE.test(raw);
}

/**
 * Real per-country validation, replacing a digit-count guess that accepted any
 * 10–15 digit string — including `1234567890`.
 *
 * When a country is known the number is validated against that country's plan,
 * which also accepts a national format like `0300-1234567`. With no country
 * context the number must be valid international on its own.
 */
export function isValidPhone(value: string, countryName?: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > PHONE_MAX) return false;
  const country = countryName ? countryByName(countryName) : null;
  try {
    if (country) return isValidPhoneNumber(raw, country.code);
    return parsePhoneNumberFromString(raw)?.isValid() ?? false;
  } catch {
    return false;
  }
}

export function isValidWhatsapp(value: string, countryName?: string): boolean {
  // A WhatsApp handle is a phone number, so it gets the same real validation.
  return isValidPhone(value, countryName);
}

export function isValidMapsUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > ADDRESS_MAX) return false;
  if (UNSAFE_TEXT_RE.test(raw)) return false;
  return MAPS_RE.test(raw);
}

/**
 * Allowlists rather than a denylist, so an unexpected character is rejected instead
 * of silently stored and rendered on the public contact page.
 *
 * `\p{L}` covers accented and non-Latin scripts, `\p{M}` combining marks, `\p{N}`
 * digits. The punctuation is spelled literally: mixing `\p{Zs}` into a class that also
 * holds literals does not match a plain space.
 */
const CITY_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,'’()-]*$/u;
const ADDRESS_RE = /^[\p{L}\p{N}][\p{L}\p{N}\p{M} .,'’#/&(),-]*$/u;

export function isValidCity(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > CITY_MAX) return false;
  if (UNSAFE_TEXT_RE.test(raw)) return false;
  // A city is a place name, not a link. This catches the common paste-a-URL mistake.
  if (URL_LIKE_RE.test(raw)) return false;
  return CITY_RE.test(raw);
}

export function isValidAddress(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  if (raw.length > ADDRESS_MAX) return false;
  if (UNSAFE_TEXT_RE.test(raw)) return false;
  if (URL_LIKE_RE.test(raw)) return false;
  return ADDRESS_RE.test(raw);
}

export function isValidCountryName(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  return isKnownCountry(raw);
}

export function validateSocialValue(platform: string, value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (UNSAFE_TEXT_RE.test(raw)) return 'Remove any hidden or control characters.';
  if (raw.length > 512) return 'This link is too long.';
  if (platform === 'whatsapp') {
    return isValidPhone(raw) ? '' : 'Enter a WhatsApp number with country code.';
  }
  if (platform === 'telegram' && /^@?[a-zA-Z0-9_]{5,}$/.test(raw)) return '';
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return 'Enter a valid URL.';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return 'Use an https link.';
  }
  const hostCheck = SOCIAL_HOST[platform];
  if (hostCheck && !hostCheck.test(href)) {
    return `Use a ${platform} URL.`;
  }
  return '';
}

/* ─── Phone formatting ─── */

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

/**
 * Applies the selected country's dial code and groups the rest.
 *
 * This is deliberately the project's own formatter rather than libphonenumber's:
 * it keeps the dial code visible while typing, which is what the settings form
 * needs, and its output is covered by existing tests.
 */
export function formatPhoneNumber(raw: string, countryName?: string): string {
  const country = countryName ? countryByName(countryName) : null;
  const dial = (country?.dial || '+').replace(/\D/g, '') || '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (dial && digits.startsWith(dial)) digits = digits.slice(dial.length);
  if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 12);
  const local =
    digits.length <= 3
      ? digits
      : digits.length <= 6
        ? `${digits.slice(0, 3)} ${digits.slice(3)}`
        : `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (!dial) return local.trim();
  return local ? `+${dial} ${local}` : `+${dial}`;
}

/* ─── Working hours ─── */

export function emptyWorkingHours(): WorkingHoursValue {
  return { days: ['mon', 'tue', 'wed', 'thu', 'fri'], open: '10:00', close: '18:00' };
}

export function serializeWorkingHours(value: WorkingHoursValue): string {
  if (value.days.length === 0 || !value.open || !value.close) return '';
  const order = WEEK_DAYS.map((day) => day.id);
  const days = [...value.days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return JSON.stringify({
    days,
    open: value.open,
    close: value.close,
  });
}

export function parseWorkingHours(raw?: string | null): WorkingHoursValue | null {
  const text = raw?.trim() || '';
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as Partial<WorkingHoursValue>;
    if (!Array.isArray(parsed.days) || !parsed.open || !parsed.close) return null;
    const days = parsed.days.filter((day): day is WeekDayId =>
      WEEK_DAYS.some((item) => item.id === day),
    );
    return { days, open: parsed.open, close: parsed.close };
  } catch {
    return null;
  }
}

export function formatWorkingHoursLabel(raw?: string | null): string {
  const parsed = parseWorkingHours(raw);
  if (!parsed || parsed.days.length === 0) return raw?.trim() || '';
  const labels = WEEK_DAYS.filter((day) => parsed.days.includes(day.id)).map((day) => day.label);
  const ordered = WEEK_DAYS.map((day) => day.id).filter((id) => parsed.days.includes(id));
  const daysLabel =
    labels.length === 7
      ? 'Daily'
      : ordered.join(',') === 'mon,tue,wed,thu,fri'
        ? 'Mon–Fri'
        : labels.join(', ');
  return `${daysLabel} ${parsed.open}–${parsed.close}`;
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidWorkingHours(value: WorkingHoursValue): boolean {
  if (value.days.length === 0) return true;
  if (!HHMM_RE.test(value.open) || !HHMM_RE.test(value.close)) return false;
  return value.open < value.close;
}

/* ─── Whole-form validation ─── */

export type SiteContactForm = {
  email: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  mapsUrl: string;
  hours: WorkingHoursValue;
  socials: { platform: string; value: string }[];
};

export type SiteContactErrors = Partial<Record<keyof Omit<SiteContactForm, 'socials'>, string>> & {
  socials?: string;
  socialsByIndex?: string[];
};

/**
 * Fields the contact page cannot render usefully without. The footer and contact
 * page show email, phone and the full address, so a half-empty set reads as broken.
 * Everything else stays optional — an unlisted WhatsApp handle should not block a save.
 */
const REQUIRED_FIELDS = ['email', 'phone', 'address', 'city', 'country'] as const;

const REQUIRED_MESSAGE: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  email: 'An email address is required.',
  phone: 'A phone number is required.',
  address: 'An address is required.',
  city: 'A city is required.',
  country: 'Select a country.',
};

/**
 * The single source of truth for what the settings form accepts.
 *
 * Returning messages rather than booleans keeps the rules testable without
 * rendering, and keeps the page a thin shell. `country` is resolved first because
 * phone validation is meaningless without it.
 */
export function validateSiteContact(form: SiteContactForm): SiteContactErrors {
  const errors: SiteContactErrors = {};
  const country = form.country?.trim() ?? '';
  const knownCountry = isKnownCountry(country);

  if (!knownCountry) {
    errors.country = REQUIRED_MESSAGE.country;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!form[field]?.trim()) errors[field] = REQUIRED_MESSAGE[field];
  }

  if (form.email.trim() && !isValidEmail(form.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (form.supportEmail.trim() && !isValidEmail(form.supportEmail)) {
    errors.supportEmail = 'Enter a valid support email.';
  }
  if (form.phone.trim() && !isValidPhone(form.phone, knownCountry ? country : undefined)) {
    errors.phone = knownCountry
      ? 'Enter a valid number for the selected country.'
      : 'Select a country so the number can be checked.';
  }
  if (form.whatsapp.trim() && !isValidWhatsapp(form.whatsapp, knownCountry ? country : undefined)) {
    errors.whatsapp = 'Enter a valid WhatsApp number.';
  }
  if (form.address.trim() && !isValidAddress(form.address)) {
    errors.address = 'Enter a street address, not a link.';
  }
  if (form.city.trim() && !isValidCity(form.city)) {
    errors.city = 'Enter a city name, not a link.';
  }
  if (form.mapsUrl.trim() && !isValidMapsUrl(form.mapsUrl)) {
    errors.mapsUrl = 'Use a Google Maps link, e.g. https://maps.app.goo.gl/…';
  }
  if (!isValidWorkingHours(form.hours)) {
    errors.hours = 'Set an opening and closing time, with closing after opening.';
  }

  const socialsByIndex = form.socials.map((item) =>
    item.value.trim() ? validateSocialValue(item.platform, item.value) : '',
  );
  // Flag a network that is listed more than once. The first occurrence registers and
  // later ones are marked — but only when the row is otherwise valid, so a single
  // bad link never collects two different complaints.
  const seen = new Set<string>();
  form.socials.forEach((item, index) => {
    if (!item.value.trim()) return;
    if (seen.has(item.platform)) {
      if (!socialsByIndex[index]) socialsByIndex[index] = 'This network is already listed above.';
      return;
    }
    seen.add(item.platform);
  });
  if (socialsByIndex.some(Boolean)) {
    errors.socials = 'Fix the highlighted social links.';
    errors.socialsByIndex = socialsByIndex;
  }

  return errors;
}

export function hasErrors(errors: SiteContactErrors): boolean {
  return Object.values(errors).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
}