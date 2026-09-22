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

export const COUNTRIES: Array<{ name: string; code: string; dial: string }> = [
  { name: 'Pakistan', code: 'PK', dial: '+92' },
  { name: 'Afghanistan', code: 'AF', dial: '+93' },
  { name: 'Australia', code: 'AU', dial: '+61' },
  { name: 'Bangladesh', code: 'BD', dial: '+880' },
  { name: 'Canada', code: 'CA', dial: '+1' },
  { name: 'China', code: 'CN', dial: '+86' },
  { name: 'Egypt', code: 'EG', dial: '+20' },
  { name: 'France', code: 'FR', dial: '+33' },
  { name: 'Germany', code: 'DE', dial: '+49' },
  { name: 'India', code: 'IN', dial: '+91' },
  { name: 'Indonesia', code: 'ID', dial: '+62' },
  { name: 'Iran', code: 'IR', dial: '+98' },
  { name: 'Iraq', code: 'IQ', dial: '+964' },
  { name: 'Ireland', code: 'IE', dial: '+353' },
  { name: 'Italy', code: 'IT', dial: '+39' },
  { name: 'Japan', code: 'JP', dial: '+81' },
  { name: 'Kenya', code: 'KE', dial: '+254' },
  { name: 'Kuwait', code: 'KW', dial: '+965' },
  { name: 'Malaysia', code: 'MY', dial: '+60' },
  { name: 'Maldives', code: 'MV', dial: '+960' },
  { name: 'Nepal', code: 'NP', dial: '+977' },
  { name: 'Netherlands', code: 'NL', dial: '+31' },
  { name: 'New Zealand', code: 'NZ', dial: '+64' },
  { name: 'Nigeria', code: 'NG', dial: '+234' },
  { name: 'Oman', code: 'OM', dial: '+968' },
  { name: 'Qatar', code: 'QA', dial: '+974' },
  { name: 'Saudi Arabia', code: 'SA', dial: '+966' },
  { name: 'Singapore', code: 'SG', dial: '+65' },
  { name: 'South Africa', code: 'ZA', dial: '+27' },
  { name: 'Spain', code: 'ES', dial: '+34' },
  { name: 'Sri Lanka', code: 'LK', dial: '+94' },
  { name: 'Turkey', code: 'TR', dial: '+90' },
  { name: 'United Arab Emirates', code: 'AE', dial: '+971' },
  { name: 'United Kingdom', code: 'GB', dial: '+44' },
  { name: 'United States', code: 'US', dial: '+1' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export function countryByName(name: string) {
  const needle = name.trim().toLowerCase();
  return COUNTRIES.find((item) => item.name.toLowerCase() === needle) || null;
}

export function isValidEmail(value: string): boolean {
  const raw = value.trim();
  return !raw || EMAIL_RE.test(raw);
}

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

export function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, '').length;
}

export function isValidPhone(value: string): boolean {
  const raw = value.trim();
  if (!raw) return true;
  const digits = phoneDigitCount(raw);
  return digits >= 10 && digits <= 15;
}

export function isValidMapsUrl(value: string): boolean {
  const raw = value.trim();
  return !raw || MAPS_RE.test(raw);
}

export function validateSocialValue(platform: string, value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  if (platform === 'whatsapp') {
    return isValidPhone(raw) ? '' : 'Enter a WhatsApp number with country code.';
  }
  if (platform === 'telegram' && /^@?[a-zA-Z0-9_]{5,}$/.test(raw)) return '';
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Use an https link.';
    }
  } catch {
    return 'Enter a valid URL.';
  }
  const hostCheck = SOCIAL_HOST[platform];
  if (hostCheck && !hostCheck.test(href)) {
    return `Use a ${platform} URL.`;
  }
  return '';
}

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

export function isValidWorkingHours(value: WorkingHoursValue): boolean {
  if (value.days.length === 0) return true;
  if (!value.open || !value.close) return false;
  return value.open < value.close;
}
