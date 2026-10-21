'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import {
  AdminField,
  AdminInput,
  AdminPageHeader,
  RequiredStar,
} from '../../../../components/admin/AdminShared';
import SocialBrandIcon from '../../../../components/admin/SocialBrandIcon';
import AdminPhoneInput from '../../../../components/admin/AdminPhoneInput';
import AdminCitySelect from '../../../../components/admin/AdminCitySelect';
import { saveSiteSettings, type SiteSocialLink } from '../../../../services/siteSettings';
import { siteSettingsKeys } from '../../../../queries/keys';
import { useSiteSettingsQuery } from '../../../../queries/useDirectoryQueries';
import { SOCIAL_PLATFORMS } from '../../../../lib/socialPlatforms';
import {
  COUNTRY_OPTIONS,
  DEFAULT_COUNTRY,
  WEEK_DAYS,
  countryByName,
  emptyWorkingHours,
  formatWorkingHoursLabel,
  hasErrors,
  parseWorkingHours,
  isValidMapsUrl,
  serializeWorkingHours,
  toDisplayPhone,
  toE164,
  validateSiteContact,
  type WeekDayId,
  type WorkingHoursValue,
} from '../../../../lib/siteContact';

type FormState = {
  email: string;
  supportEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  country: string;
  mapsUrl: string;
  hours: WorkingHoursValue;
  socials: SiteSocialLink[];
};

type FieldErrors = Partial<Record<keyof FormState | 'socials', string>> & {
  socialsByIndex?: string[];
};

const EMPTY: FormState = {
  email: '',
  supportEmail: '',
  phone: '',
  whatsapp: '',
  address: '',
  city: '',
  country: DEFAULT_COUNTRY,
  mapsUrl: '',
  hours: emptyWorkingHours(),
  socials: [{ platform: 'facebook', value: '' }],
};

type PlatformOption = {
  value: string;
  label: string;
  placeholder: string;
};

const selectStyles = {
  control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
    ...base,
    minHeight: '38px',
    backgroundColor: 'var(--admin-input-bg)',
    borderColor: state.isFocused ? 'var(--color-focus-ring)' : 'var(--admin-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: state.isFocused
      ? '0 0 0 3px color-mix(in srgb, var(--color-focus-ring) 28%, transparent)'
      : 'none',
    fontSize: '0.8125rem',
    '&:hover': { borderColor: 'var(--admin-border-strong)' },
  }),
  option: (base: Record<string, unknown>, state: { isFocused: boolean; isSelected: boolean }) => ({
    ...base,
    backgroundColor: state.isSelected || state.isFocused ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
    color: state.isSelected || state.isFocused ? 'var(--color-brand-fg)' : 'var(--admin-text)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    padding: '8px 12px',
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: 'var(--admin-card)',
    border: '1px solid var(--admin-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--elevation-overlay)',
    overflow: 'hidden',
    zIndex: 30,
  }),
  singleValue: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text)', fontWeight: 600 }),
  input: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text)' }),
  placeholder: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
  dropdownIndicator: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
  indicatorSeparator: (base: Record<string, unknown>) => ({ ...base, backgroundColor: 'var(--admin-border)' }),
  noOptionsMessage: (base: Record<string, unknown>) => ({ ...base, color: 'var(--admin-text-muted)' }),
};

function PlatformLabel({ id, label }: { id: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <SocialBrandIcon id={id} size={20} />
      {label}
    </span>
  );
}

function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 break-words text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
      {message}
    </p>
  );
}

/** Red border + aria wiring for a control whose field has an error. */
function invalidProps(error: string | undefined, errorId: string) {
  return error
    ? {
        'aria-invalid': true as const,
        'aria-describedby': errorId,
        style: { borderColor: 'var(--admin-danger)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--admin-danger) 14%, transparent)' },
      }
    : {};
}

/**
 * One labelled field. The label points at the control with `htmlFor` instead of
 * wrapping it: a wrapping <label> forwards clicks on any blank space inside it to
 * the first control — which is how clicking beside the working-hours days kept
 * toggling Monday.
 */
function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
        {label}
        {required ? <RequiredStar /> : null}
      </label>
      {children}
      {error ? (
        <FieldError id={`${id}-error`} message={error} />
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] font-medium leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const HOURS_PRESETS: ReadonlyArray<{ label: string; days: WeekDayId[] }> = [
  { label: 'Mon–Fri', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
  { label: 'Mon–Sat', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
  { label: 'Every day', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
  { label: 'Clear', days: [] },
];

/** Order in which a failed save jumps to the first bad field. */
const FIELD_ORDER = ['email', 'supportEmail', 'phone', 'whatsapp', 'hours', 'address', 'city', 'country', 'mapsUrl', 'socials'] as const;

/**
 * Every rule lives in `validateSiteContact` so it can be tested without rendering.
 * This is only the shape adapter between the form and that function.
 */
function validateForm(form: FormState): FieldErrors {
  return validateSiteContact(form) as FieldErrors;
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const settingsQuery = useSiteSettingsQuery();
  const queryClient = useQueryClient();

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings) return;
    const country = settings.country || DEFAULT_COUNTRY;
    setForm({
      email: settings.email || '',
      supportEmail: settings.supportEmail || '',
      // The phone inputs work in E.164; stored text is converted back on save.
      phone: toE164(settings.phone, country) || settings.phone || '',
      whatsapp: toE164(settings.whatsapp, country) || settings.whatsapp || '',
      address: settings.address || '',
      city: settings.city || '',
      country: settings.country || DEFAULT_COUNTRY,
      mapsUrl: settings.mapsUrl || '',
      hours: parseWorkingHours(settings.workingHours) || emptyWorkingHours(),
      socials: settings.socials?.length
        ? settings.socials.map((item) =>
            item.platform === 'whatsapp' ? { ...item, value: toE164(item.value, country) || item.value } : item,
          )
        : [{ platform: 'facebook', value: '' }],
    });
  }, [settingsQuery.data]);

  const usedPlatforms = useMemo(() => new Set(form.socials.map((item) => item.platform)), [form.socials]);
  const unusedPlatforms = SOCIAL_PLATFORMS.filter((item) => !usedPlatforms.has(item.id));
  // Pre-built once at module load in `siteContact` — rebuilding 245 options per
  // render would allocate on every keystroke.
  const countryOptions = COUNTRY_OPTIONS;
  const selectedCountry =
    countryOptions.find((item) => item.value === form.country) ||
    (form.country ? { value: form.country, label: form.country, dial: '', code: '' } : null);
  const countryCode = countryByName(form.country)?.code;

  const uid = useId();
  const fid = (name: string) => `settings-${name}-${uid}`;

  const setField = (key: keyof Omit<FormState, 'socials' | 'hours'>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  /** Checks one field when the admin leaves it, instead of waiting for Save. */
  /** Validates with the value just typed, not the possibly one-render-old `form`. */
  const validateField = (key: keyof Omit<FormState, 'socials' | 'hours'>, value: string) => {
    const next = validateForm({ ...form, [key]: value });
    setErrors((prev) => ({ ...prev, [key]: next[key] }));
  };

  const setHours = (patch: Partial<WorkingHoursValue>) => {
    setForm((prev) => ({ ...prev, hours: { ...prev.hours, ...patch } }));
    setErrors((prev) => ({ ...prev, hours: undefined }));
  };

  const hoursPreview = formatWorkingHoursLabel(serializeWorkingHours(form.hours));

  const setCountry = (name: string) => {
    setErrors((prev) => ({ ...prev, country: undefined, city: undefined }));
    setForm((prev) => ({ ...prev, country: name, city: prev.country === name ? prev.city : '' }));
  };

  const toggleDay = (day: WeekDayId) => {
    setForm((prev) => {
      const days = prev.hours.days.includes(day)
        ? prev.hours.days.filter((item) => item !== day)
        : [...prev.hours.days, day];
      return { ...prev, hours: { ...prev.hours, days } };
    });
    setErrors((prev) => ({ ...prev, hours: undefined }));
  };

  const addSocial = () => {
    const next = unusedPlatforms[0];
    if (!next) return;
    setForm((prev) => ({
      ...prev,
      socials: [...prev.socials, { platform: next.id, value: '' }],
    }));
  };

  const updateSocial = (index: number, patch: Partial<SiteSocialLink>) => {
    setForm((prev) => ({
      ...prev,
      socials: prev.socials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
    setErrors((prev) => ({
      ...prev,
      socials: undefined,
      socialsByIndex: prev.socialsByIndex?.map((item, i) => (i === index ? '' : item)),
    }));
  };

  const removeSocial = (index: number) => {
    setForm((prev) => ({
      ...prev,
      socials: prev.socials.filter((_, i) => i !== index),
    }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) {
      const count = Object.entries(nextErrors).filter(([key, value]) => key !== 'socialsByIndex' && value).length;
      toast.error(count === 1 ? 'Please fix the highlighted field.' : `Please fix the ${count} highlighted fields.`);
      const first = FIELD_ORDER.find((key) => nextErrors[key]);
      const target = first === 'socials'
        ? document.querySelector<HTMLElement>('[data-social-row] [aria-invalid="true"]')
        : first ? document.getElementById(fid(first)) : null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveSiteSettings({
        email: form.email.trim(),
        supportEmail: form.supportEmail.trim(),
        phone: toDisplayPhone(form.phone),
        whatsapp: toDisplayPhone(form.whatsapp),
        address: form.address.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        mapsUrl: form.mapsUrl.trim(),
        workingHours: serializeWorkingHours(form.hours),
        socials: form.socials
          .filter((item) => item.platform && item.value.trim())
          .map((item) => (item.platform === 'whatsapp' ? { ...item, value: toDisplayPhone(item.value) } : item)),
      });
      queryClient.setQueryData(siteSettingsKeys.current(), saved);
      setForm((prev) => ({
        ...prev,
        socials: saved.socials.length
          ? saved.socials.map((item) =>
              item.platform === 'whatsapp' ? { ...item, value: toE164(item.value, prev.country) || item.value } : item,
            )
          : [{ platform: 'facebook', value: '' }],
        hours: parseWorkingHours(saved.workingHours) || prev.hours,
      }));
      toast.success('Site settings saved.');
    } catch {
      toast.error('Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Contact details, office location and social links shown on the public site."
      />

      <form className="space-y-5" noValidate onSubmit={(e) => void onSave(e)}>
        <section className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Contact
          </h2>
          <p className="mb-3 mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>Shown in the footer and on the Contact page.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id={fid('email')} label="Email" required error={errors.email}>
              <AdminInput
                id={fid('email')}
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                onBlur={(e) => validateField('email', e.currentTarget.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={320}
                placeholder="hello@pakcriczone.com"
                {...invalidProps(errors.email, `${fid('email')}-error`)}
              />
            </Field>
            <Field id={fid('supportEmail')} label="Support email" hint="Optional. Used for feedback and corrections." error={errors.supportEmail}>
              <AdminInput
                id={fid('supportEmail')}
                type="email"
                value={form.supportEmail}
                onChange={(e) => setField('supportEmail', e.target.value)}
                onBlur={(e) => validateField('supportEmail', e.currentTarget.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={320}
                placeholder="feedback@pakcriczone.com"
                {...invalidProps(errors.supportEmail, `${fid('supportEmail')}-error`)}
              />
            </Field>
            <Field id={fid('phone')} label="Phone" required hint="Pick the country, then type the number. It formats as you type and stops at that country’s length." error={errors.phone}>
              <AdminPhoneInput
                id={fid('phone')}
                value={form.phone}
                defaultCountry={countryCode}
                onChange={(next) => setField('phone', next)}
                onBlur={(current) => validateField('phone', current)}
                invalid={Boolean(errors.phone)}
                describedBy={errors.phone ? `${fid('phone')}-error` : undefined}
                placeholder="Enter phone number"
              />
            </Field>
            <Field id={fid('whatsapp')} label="WhatsApp" hint="Optional. The number customers can message." error={errors.whatsapp}>
              <AdminPhoneInput
                id={fid('whatsapp')}
                value={form.whatsapp}
                defaultCountry={countryCode}
                onChange={(next) => setField('whatsapp', next)}
                onBlur={(current) => validateField('whatsapp', current)}
                invalid={Boolean(errors.whatsapp)}
                describedBy={errors.whatsapp ? `${fid('whatsapp')}-error` : undefined}
                placeholder="Enter phone number"
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Working hours
          </h2>
          <p className="mb-3 mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>Pick the open days, then the opening and closing time (Pakistan time).</p>
          {/* A group, not a <label>: a label wrapping the buttons sent stray clicks to Monday. */}
          <div role="group" aria-labelledby={fid('hours-days')} aria-describedby={errors.hours ? `${fid('hours')}-error` : undefined}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id={fid('hours-days')} className="text-xs font-semibold" style={{ color: 'var(--admin-text-secondary)' }}>
                Open days
              </span>
              <div className="flex flex-wrap gap-1.5">
                {HOURS_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setHours({ days: [...preset.days] })}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold"
                    style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5 sm:flex sm:flex-wrap">
              {WEEK_DAYS.map((day) => {
                const active = form.hours.days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleDay(day.id)}
                    className={`min-h-9 rounded-md px-1 text-xs font-bold sm:min-w-12 sm:px-3 ${active ? 'btn-brand' : ''}`}
                    style={
                      active
                        ? undefined
                        : { border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }
                    }
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
            <Field id={fid('hours')} label="Opens">
              <AdminInput
                id={fid('hours')}
                type="time"
                step={300}
                value={form.hours.open}
                disabled={form.hours.days.length === 0}
                onChange={(e) => setHours({ open: e.target.value })}
                {...invalidProps(errors.hours, `${fid('hours')}-error`)}
              />
            </Field>
            <Field id={fid('hours-close')} label="Closes">
              <AdminInput
                id={fid('hours-close')}
                type="time"
                step={300}
                value={form.hours.close}
                disabled={form.hours.days.length === 0}
                onChange={(e) => setHours({ close: e.target.value })}
                {...invalidProps(errors.hours, `${fid('hours')}-error`)}
              />
            </Field>
          </div>
          <FieldError id={`${fid('hours')}-error`} message={errors.hours} />
          <p className="mt-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {form.hours.days.length === 0 ? (
              'No open days selected — working hours are hidden on the site.'
            ) : (
              <>
                Shown on the site as{' '}
                <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{hoursPreview || '—'}</span>
              </>
            )}
          </p>
        </section>

        <section className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
            Location
          </h2>
          <p className="mb-3 mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>Your office address, shown on the Contact page with a map link.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field id={fid('country')} label="Country" required hint="Sets the city list and the default country for phone numbers." error={errors.country}>
              <Select
                instanceId={fid('country')}
                inputId={fid('country')}
                value={selectedCountry}
                onChange={(option) => setCountry(option?.value || '')}
                options={countryOptions}
                isSearchable
                placeholder="Select country"
                classNamePrefix="react-select"
                aria-invalid={Boolean(errors.country)}
                aria-describedby={errors.country ? `${fid('country')}-error` : undefined}
                styles={
                  (errors.country
                    ? {
                        ...selectStyles,
                        control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
                          ...selectStyles.control(base, state),
                          borderColor: 'var(--admin-danger)',
                        }),
                      }
                    : selectStyles) as never
                }
              />
            </Field>
            <Field id={fid('city')} label="City" required hint="Pick from the list or type a city that is missing." error={errors.city}>
              <AdminCitySelect
                inputId={fid('city')}
                countryCode={countryCode}
                value={form.city}
                onChange={(city) => {
                  setField('city', city);
                  setErrors((prev) => ({ ...prev, city: validateForm({ ...form, city }).city }));
                }}
                invalid={Boolean(errors.city)}
                describedBy={errors.city ? `${fid('city')}-error` : undefined}
                styles={
                  errors.city
                    ? {
                        ...selectStyles,
                        control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
                          ...selectStyles.control(base, state),
                          borderColor: 'var(--admin-danger)',
                        }),
                      }
                    : selectStyles
                }
              />
            </Field>
            <Field id={fid('address')} label="Address" required hint="Street address only — not a link." error={errors.address}>
              <AdminInput
                id={fid('address')}
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                onBlur={(e) => validateField('address', e.currentTarget.value)}
                autoComplete="street-address"
                maxLength={512}
                placeholder="Office 12, Gulberg III"
                {...invalidProps(errors.address, `${fid('address')}-error`)}
              />
            </Field>
            <Field id={fid('mapsUrl')} label="Google Maps link" hint="Share link from Google Maps, e.g. https://maps.app.goo.gl/…" error={errors.mapsUrl}>
              <AdminInput
                id={fid('mapsUrl')}
                type="url"
                value={form.mapsUrl}
                onChange={(e) => setField('mapsUrl', e.target.value)}
                onBlur={(e) => validateField('mapsUrl', e.currentTarget.value)}
                inputMode="url"
                maxLength={512}
                placeholder="https://maps.app.goo.gl/..."
                {...invalidProps(errors.mapsUrl, `${fid('mapsUrl')}-error`)}
              />
              {form.mapsUrl.trim() && !errors.mapsUrl && isValidMapsUrl(form.mapsUrl) ? (
                <a
                  href={/^https:\/\//i.test(form.mapsUrl.trim()) ? form.mapsUrl.trim() : `https://${form.mapsUrl.trim()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Test link <ExternalLink size={11} aria-hidden />
                </a>
              ) : null}
            </Field>
          </div>
        </section>

        <section className="rounded-lg p-3 sm:p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>
              Social links
            </h2>
            <button
              type="button"
              onClick={addSocial}
              disabled={unusedPlatforms.length === 0}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold disabled:opacity-40"
              style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
            >
              <Plus size={12} className="shrink-0" />
              Add
            </button>
          </div>
          <p className="mb-3 break-words text-sm" style={{ color: 'var(--admin-text-muted)' }}>
            Pick a network, then paste its official URL. WhatsApp accepts a number with country code.
          </p>
          <div className="space-y-3">
            {form.socials.map((item, index) => {
              const meta = SOCIAL_PLATFORMS.find((platform) => platform.id === item.platform);
              const options: PlatformOption[] = SOCIAL_PLATFORMS.filter(
                (platform) => platform.id === item.platform || !usedPlatforms.has(platform.id)
              ).map((platform) => ({
                value: platform.id,
                label: platform.label,
                placeholder: platform.placeholder,
              }));
              const selected = options.find((option) => option.value === item.platform) || null;
              return (
                <div key={`${item.platform}-${index}`} data-social-row>
                  <div className="grid grid-cols-[auto_1fr_auto] items-end gap-2 sm:grid-cols-[14rem_1fr_auto]">
                    <AdminField label="Platform" htmlFor={`social-platform-${index}`}>
                      <Select
                        instanceId={`social-platform-${index}`}
                        inputId={`social-platform-${index}`}
                        value={selected}
                        onChange={(option) => updateSocial(index, { platform: option?.value || '' })}
                        options={options}
                        formatOptionLabel={(option) => <PlatformLabel id={option.value} label={option.label} />}
                        isSearchable={false}
                        menuPlacement="top"
                        classNamePrefix="react-select"
                        styles={selectStyles as never}
                      />
                    </AdminField>
                    <AdminField label={item.platform === 'whatsapp' ? 'WhatsApp number' : 'URL'} htmlFor={`social-value-${index}`}>
                      {item.platform === 'whatsapp' ? (
                        <AdminPhoneInput
                          id={`social-value-${index}`}
                          value={item.value}
                          defaultCountry={countryCode}
                          onChange={(next) => updateSocial(index, { value: next })}
                          invalid={Boolean(errors.socialsByIndex?.[index])}
                          describedBy={errors.socialsByIndex?.[index] ? `social-error-${index}` : undefined}
                          placeholder="Enter WhatsApp number"
                        />
                      ) : (
                        <AdminInput
                          id={`social-value-${index}`}
                          value={item.value}
                          onChange={(e) => updateSocial(index, { value: e.target.value })}
                          inputMode="url"
                          maxLength={512}
                          placeholder={meta?.placeholder || 'https://...'}
                          {...invalidProps(errors.socialsByIndex?.[index], `social-error-${index}`)}
                        />
                      )}
                    </AdminField>
                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      disabled={form.socials.length === 1}
                      className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md disabled:opacity-40"
                      style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-danger)' }}
                      aria-label="Remove social link"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <FieldError id={`social-error-${index}`} message={errors.socialsByIndex?.[index]} />
                </div>
              );
            })}
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-brand rounded-md px-4 py-2 text-sm font-bold disabled:opacity-60">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}
